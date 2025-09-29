import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Calculator, Target, DollarSign, PiggyBank, User, LogOut, Save, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useChart } from '../contexts/ChartContext'
import { useLifeSheetStore } from '../store/enhanced-store'
import AuthModal from './AuthModal'
import ApiService from '../services/api'
import '../styles/professional-theme.css'

export default function OriginalLifeSheet() {
  const { user, logout, isAuthenticated } = useAuth()
  const { chartData } = useChart()
  const { updateLifeSheet, addGoal: addStoreGoal, updateGoal: updateStoreGoal, deleteGoal: deleteStoreGoal, addExpense: addStoreExpense, updateExpense: updateStoreExpense, deleteExpense: deleteStoreExpense, addLoan: addStoreLoan, updateLoan: updateStoreLoan, deleteLoan: deleteStoreLoan, setLoans: setStoreLoans, setExpenses: setStoreExpenses, setGoals: setStoreGoals, lifeSheet, setMainInputs, hydrateMainInputs, setSourcePreference, sourcePreferences, loadSourcePreferences } = useLifeSheetStore()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  
  
  // Core financial data based on Excel analysis
  const [formData, setFormData] = useState({
    age: '',
    currentAnnualGrossIncome: '',
    workTenureYears: '',
    totalAssetGrossMarketValue: '',
    totalLoanOutstandingValue: '',
    loanTenureYears: '',
    
    // Calculation assumptions
    lifespanYears: 85,
    incomeGrowthRate: 0.06,  // 6% inflation
    assetGrowthRate: 0.06    // 6% inflation
  })
  
  // Dynamic goals and expenses
  const [goals, setGoals] = useState([])
  const [expenses, setExpenses] = useState([])
  
  // Get calculated values from store (ChatGPT's fix - single source of truth)
  const currentYear = new Date().getFullYear();
  const currentYearData = chartData?.find(d => d.year === currentYear) || {};

  // Handle user input changes (these should take precedence over detailed data)
  const handleUserInputChange = (field, value) => {
    setFormData({...formData, [field]: value})
    
    // Set source preference to main page (0) when user edits main inputs
    // Map fields to their corresponding source components
    if (field === 'currentAnnualGrossIncome' || field === 'workTenureYears' || field === 'incomeGrowthRate') {
      setSourcePreference('income', 0); // Work Assets
    }
    if (field === 'totalAssetGrossMarketValue' || field === 'assetGrowthRate') {
      setSourcePreference('assets', 0); // Assets
    }
    
    // Map form fields to store fields and update with user origin
    const storeFieldMap = {
      'currentAnnualGrossIncome': 'income0',
      'totalAssetGrossMarketValue': 'initialAssets', 
      'workTenureYears': 'workTenureYears',
      'age': 'age',
      'lifespanYears': 'lifespanYears',
      'incomeGrowthRate': 'g_income',
      'assetGrowthRate': 'r_assets'
    }
    
    const storeField = storeFieldMap[field]
    if (storeField) {
      setMainInputs({
        [storeField]: field === 'age' || field === 'workTenureYears' || field === 'lifespanYears' 
          ? parseInt(value) || 0
          : field === 'incomeGrowthRate' || field === 'assetGrowthRate'
          ? parseFloat(value) || 0
          : parseFloat(value) || 0
      }, { origin: 'user' })
    }
  }

  // Handle loan changes - set source preference to Quick Calculator
  const handleLoanChange = (index, field, value) => {
    updateLoan(index, field, value);
    setSourcePreference('loans', 0); // Set to Quick Calculator
  }

  // Handle expense changes - set source preference to Quick Calculator  
  const handleExpenseChange = (index, field, value) => {
    updateExpense(index, field, value);
    setSourcePreference('expenses', 0); // Set to Quick Calculator
  }

  // Handle goal changes - set source preference to Quick Calculator
  const handleGoalChange = (index, field, value) => {
    updateGoal(index, field, value);
    setSourcePreference('goals', 0); // Set to Quick Calculator
  }
  

  // Event dispatching for live chart updates (following Assets page pattern)
  const dispatchGoalsEvent = (updatedGoals) => {
    try {
      const payload = Array.isArray(updatedGoals) ? updatedGoals.map(g => ({ ...g })) : [];
      window.dispatchEvent(new CustomEvent('goalsUpdated', { detail: { goals: payload } }));
      console.log('🔄 LifeSheet: Dispatched goalsUpdated event with', payload.length, 'goals');
      console.log('🔄 LifeSheet: Goals data:', payload);
    } catch (e) {
      console.warn('Failed to dispatch goalsUpdated event:', e);
    }
  };

  const dispatchExpensesEvent = (updatedExpenses) => {
    try {
      const payload = Array.isArray(updatedExpenses) ? updatedExpenses.map(e => ({ ...e })) : [];
      window.dispatchEvent(new CustomEvent('expensesUpdated', { detail: { expenses: payload } }));
      console.log('🔄 LifeSheet: Dispatched expensesUpdated event with', payload.length, 'expenses');
      console.log('🔄 LifeSheet: Expenses data:', payload);
    } catch (e) {
      console.warn('Failed to dispatch expensesUpdated event:', e);
    }
  };

  const dispatchLoansEvent = (updatedLoans) => {
    try {
      const payload = Array.isArray(updatedLoans) ? updatedLoans.map(l => ({ ...l })) : [];
      window.dispatchEvent(new CustomEvent('loansUpdated', { detail: { loans: payload } }));
      console.log('🔄 LifeSheet: Dispatched loansUpdated event with', payload.length, 'loans');
      console.log('🔄 LifeSheet: Loans data:', payload);
    } catch (e) {
      console.warn('Failed to dispatch loansUpdated event:', e);
    }
  };

  const [financialProfile, setFinancialProfile] = useState(null)

  // 1. Add a new state for loans with default entries
  const [loans, setLoans] = useState([
    { description: 'l1', amount: 500, emi: 500, _tempId: 'default-1', isNew: true },
    { description: 'l2', amount: 10000, emi: 70, _tempId: 'default-2', isNew: true },
    { description: 'l3', amount: 10, emi: 15, _tempId: 'default-3', isNew: true }
  ])

  // Calculate values from left pane cells (not chart data)
  const totalLoans = loans.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
  const totalGoals = goals.reduce((sum, goal) => sum + (parseFloat(goal.amount) || 0), 0);
  
  const calculations = {
    totalExistingAssets: parseFloat(formData.totalAssetGrossMarketValue) || 0,
    totalExistingLiabilities: totalLoans,
    totalHumanCapital: (parseFloat(formData.currentAnnualGrossIncome) || 0) * (parseInt(formData.workTenureYears) || 0),
    totalFutureExpenses: totalExpenses,
    totalFinancialGoals: totalGoals,
    surplusDeficit: (parseFloat(formData.totalAssetGrossMarketValue) || 0) + 
                   ((parseFloat(formData.currentAnnualGrossIncome) || 0) * (parseInt(formData.workTenureYears) || 0)) - 
                   totalLoans - 
                   totalExpenses - 
                   totalGoals
  }

  // Debug: Log calculations and chartData
  React.useEffect(() => {
    console.log('🔄 OriginalLifeSheet: Page mounted/updated');
    console.log('🔄 OriginalLifeSheet: calculations:', calculations);
    console.log('🔄 OriginalLifeSheet: chartData length:', chartData?.length);
    console.log('🔄 OriginalLifeSheet: chartData sample:', chartData?.slice(0, 3));
    console.log('🔄 OriginalLifeSheet: Full chartData:', chartData);
  }, [calculations, chartData]);

  // Load user's financial data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadFinancialData()
      
      // Load source preferences from database
      loadSourcePreferences()
      
      // Load loans based on source preference
      const loadLoansBasedOnSource = async () => {
        try {
          // Get current source preferences
          const sourcePrefs = await ApiService.getSourcePreferences();
          console.log('🏦 Current source preferences:', sourcePrefs);
          
          if (sourcePrefs.loans === 0) {
            // Quick Calculator: Use store data, don't load from database
            console.log('🏦 Using Quick Calculator loan data from store');
            const { main } = useLifeSheetStore.getState();
            console.log('🏦 Store quickEmiByYear:', main.quickEmiByYear);
            // Don't set loans from database - use Quick Calculator data
          } else {
            // Detailed: Load from database
            console.log('🏦 Using Detailed loan data from database');
            const res = await ApiService.getFinancialLoans(user.id);
            console.log('🏦 Loans fetch response:', res)
            const mappedLoans = (res.loans || []).map(loan => ({
              ...loan,
              description: loan.provider || loan.lender || loan.name || '' // Map backend 'provider' to frontend 'description'
            }));
            console.log('🏦 Mapped loans with descriptions:', mappedLoans.map(l => ({ id: l.id, description: l.description, lender: l.lender })));
            setLoans(mappedLoans);
            dispatchLoansEvent(mappedLoans);
            
            // Map loans for store with correct field names
            const mappedLoansForStore = mappedLoans.map(loan => ({
              ...loan,
              principal_outstanding: loan.amount, // Map amount to principal_outstanding for store
              lender: loan.description // Map description to lender for store
            }))
            setStoreLoans(mappedLoansForStore); // Also update store
          }
        } catch (error) {
          console.error('❌ Loans loading error:', error)
        }
      };
      
      loadLoansBasedOnSource();
      
      // Load goals
      ApiService.getFinancialGoals(user.id).then(res => {
        console.log('🎯 Goals fetch response:', res)
        const mappedGoals = (res.goals || []).map(goal => ({
          ...goal,
          amount: parseFloat(goal.target_amount) || parseFloat(goal.amount) || 0 // Map target_amount to amount for display
        }));
        setGoals(mappedGoals);
        dispatchGoalsEvent(mappedGoals);
        setStoreGoals(mappedGoals); // Also update store
      }).catch(error => {
        console.error('❌ Goals fetch error:', error)
      })
      
      // Load expenses
      ApiService.getFinancialExpenses(user.id).then(res => {
        console.log('💰 Expenses fetch response:', res)
        const expensesData = res.expenses || [];
        setExpenses(expensesData);
        dispatchExpensesEvent(expensesData);
        setStoreExpenses(expensesData); // Also update store
      }).catch(error => {
        console.error('❌ Expenses fetch error:', error)
      })
    }
  }, [isAuthenticated, user])

  // Update store when local data changes (ChatGPT's fix - use hydrateMainInputs for system updates)
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔄 OriginalLifeSheet: Hydrating main inputs (system update)');
      
      // Calculate expenses0 from expenses array
      const totalExpenses = expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
      
      // Calculate quickEmiByYear from loans array
      const quickEmiByYear = {};
      const currentYear = new Date().getFullYear();
      const horizonYears = (parseInt(formData.lifespanYears) || 85) - (parseInt(formData.age) || 0);
      
      console.log('🔄 EMI Calculation Debug:', {
        loans: loans.map(l => ({ id: l.id, emi: l.emi, description: l.description })),
        currentYear,
        horizonYears
      });
      
      for (let i = 0; i < horizonYears; i++) {
        const year = currentYear + i;
        const annualEmi = loans.reduce((sum, loan) => sum + (parseFloat(loan.emi) || 0) * 12, 0);
        quickEmiByYear[year] = annualEmi;
        if (i < 3) { // Log first 3 years
          console.log(`🔄 Year ${year} EMI calculation:`, { annualEmi, loans: loans.map(l => ({ emi: l.emi, monthlyEmi: parseFloat(l.emi) || 0 })) });
        }
      }
      
      console.log('🔄 Final quickEmiByYear:', quickEmiByYear);
      
      // Hydrate main inputs for Net Worth system (doesn't bump lastEditedAt)
      hydrateMainInputs({
        initialAssets: parseFloat(formData.totalAssetGrossMarketValue) || 0,
        startYear: currentYear,
        horizonYears: horizonYears,
        r_assets: parseFloat(formData.assetGrowthRate) || 0.06,
        g_income: parseFloat(formData.incomeGrowthRate) || 0.06,
        i_expenses: 0.06, // Fixed expense inflation
        workTenureYears: parseInt(formData.workTenureYears) || 35,
        income0: parseFloat(formData.currentAnnualGrossIncome) || 0,
        expenses0: totalExpenses, // Calculate from expenses array
        quickEmiByYear: quickEmiByYear // Calculate from loans array
      })
      
      // Also update legacy lifeSheet for compatibility
      updateLifeSheet({
        age: formData.age,
        currentAnnualGrossIncome: formData.currentAnnualGrossIncome,
        workTenureYears: formData.workTenureYears,
        totalAssetGrossMarketValue: formData.totalAssetGrossMarketValue,
        totalLoanOutstandingValue: formData.totalLoanOutstandingValue,
        lifespanYears: formData.lifespanYears,
        incomeGrowthRate: formData.incomeGrowthRate,
        assetGrowthRate: formData.assetGrowthRate
      })
    }
  }, [formData, expenses, loans, isAuthenticated, user, hydrateMainInputs, updateLifeSheet])

  // Update store goals when local goals change
  useEffect(() => {
    if (isAuthenticated && user) {
      // Always sync goals to store, even if empty
      goals.forEach(goal => {
        if (goal.id && !goal.isNew) {
          updateStoreGoal(goal.id, {
            name: goal.description,
            targetAmount: goal.amount,
            targetDate: goal.target_date,
            recommendedAllocation: goal.recommended_allocation,
            fundingSource: goal.funding_source
          })
        }
      })
      // Also update the entire goals array in store
      setStoreGoals(goals)
    }
  }, [goals, isAuthenticated, user, updateStoreGoal, setStoreGoals])

  // Update store expenses when local expenses change
  useEffect(() => {
    if (isAuthenticated && user) {
      // Always sync expenses to store, even if empty
      expenses.forEach(expense => {
        if (expense.id && !expense.isNew) {
          updateStoreExpense(expense.id, {
            description: expense.description,
            amount: expense.amount,
            frequency: expense.frequency,
            category: expense.category
          })
        }
      })
      // Also update the entire expenses array in store
      setStoreExpenses(expenses)
    }
  }, [expenses, isAuthenticated, user, updateStoreExpense, setStoreExpenses])

  // Update store loans when local loans change
  useEffect(() => {
    if (isAuthenticated && user) {
      // Always sync loans to store, even if empty
      loans.forEach(loan => {
        if (loan.id && !loan.isNew) {
          updateStoreLoan(loan.id, {
            lender: loan.description,
            principalOutstanding: loan.amount,
            emi: loan.emi
          })
        }
      })
      // Also update the entire loans array in store with correct field mapping
      const mappedLoansForStore = loans.map(loan => ({
        ...loan,
        principal_outstanding: loan.amount, // Map amount to principal_outstanding for store
        lender: loan.description // Map description to lender for store
      }))
      setStoreLoans(mappedLoansForStore)
    }
  }, [loans, isAuthenticated, user, updateStoreLoan, setStoreLoans])

  // Calculations now come from ChartContext automatically

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      const response = await ApiService.getFinancialProfile(user.id)
      if (response && response.profile) {
        const profile = response.profile
        setFormData({
          age: profile.age || '',
          currentAnnualGrossIncome: profile.current_annual_gross_income || '',
          workTenureYears: profile.work_tenure_years || '',
          totalAssetGrossMarketValue: profile.total_asset_gross_market_value || '',
          totalLoanOutstandingValue: profile.total_loan_outstanding_value || '',
          loanTenureYears: profile.loan_tenure_years || '',
          lifespanYears: profile.lifespan_years || 85,
          incomeGrowthRate: profile.income_growth_rate || 0.06,
          assetGrowthRate: profile.asset_growth_rate || 0.06
        })
        // Goals and expenses are now fetched separately
        setFinancialProfile(profile)
      } else {
        // If no profile, reset to defaults
        setFormData({
          age: '',
          currentAnnualGrossIncome: '',
          workTenureYears: '',
          totalAssetGrossMarketValue: '',
          totalLoanOutstandingValue: '',
          loanTenureYears: '',
          lifespanYears: 85,
          incomeGrowthRate: 0.06,
          assetGrowthRate: 0.06
        })
        setGoals([])
        setExpenses([])
        setLoans([])
        setFinancialProfile(null)
      }
    } catch (error) {
      // Handle error gracefully, do not crash
      setFormData({
        age: '',
        currentAnnualGrossIncome: '',
        workTenureYears: '',
        totalAssetGrossMarketValue: '',
        totalLoanOutstandingValue: '',
        loanTenureYears: '',
        lifespanYears: 85,
        incomeGrowthRate: 0.06,
        assetGrowthRate: 0.06
      })
      setGoals([])
      setExpenses([])
      setLoans([])
      setFinancialProfile(null)
      // Only log unexpected errors
      if (!error.message || (!error.message.toLowerCase().includes('not authenticated') && !error.message.toLowerCase().includes('not found'))) {
        console.error('Error loading financial data:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  // Field-level auto-save function
  const saveField = async (fieldName, value) => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    try {
      setSaving(true)
      
      // Map field name to backend field name
      const fieldMapping = {
        age: 'age',
        currentAnnualGrossIncome: 'current_annual_gross_income',
        workTenureYears: 'work_tenure_years',
        totalAssetGrossMarketValue: 'total_asset_gross_market_value',
        totalLoanOutstandingValue: 'total_loan_outstanding_value',
        lifespanYears: 'lifespan_years',
        incomeGrowthRate: 'income_growth_rate',
        assetGrowthRate: 'asset_growth_rate'
      }
      
      const backendField = fieldMapping[fieldName]
      if (!backendField) return
      
      // Convert value to appropriate type
      let convertedValue = value
      if (fieldName === 'age' || fieldName === 'workTenureYears' || fieldName === 'lifespanYears') {
        convertedValue = value ? parseInt(value) : undefined
      } else if (fieldName === 'currentAnnualGrossIncome' || fieldName === 'totalAssetGrossMarketValue' || 
                 fieldName === 'totalLoanOutstandingValue' || fieldName === 'incomeGrowthRate' || 
                 fieldName === 'assetGrowthRate') {
        convertedValue = value ? parseFloat(value) : undefined
      }
      
      if (convertedValue === undefined) return
      
      const payload = { [backendField]: convertedValue }
      
      let profileResponse
      if (financialProfile) {
        profileResponse = await ApiService.updateFinancialProfile(financialProfile.id, payload)
      } else {
        profileResponse = await ApiService.createFinancialProfile(payload)
      }
      
      if (profileResponse.profile) {
        setFinancialProfile(profileResponse.profile)
        setSaveStatus(`${fieldName} saved`)
        setTimeout(() => setSaveStatus(''), 1000)
        setSaveError('')
      }
    } catch (error) {
      setSaveError(`Error saving ${fieldName}`)
      setTimeout(() => setSaveError(''), 3000)
      console.error(`Error saving ${fieldName}:`, error)
    } finally {
      setSaving(false)
    }
  }

  // Save function for onBlur events
  const saveOnBlur = (fieldName, value) => {
    if (fieldName === 'goal' || fieldName === 'expense' || fieldName === 'loan') {
      // Handle goals, expenses, and loans separately
      saveItem(fieldName, value)
    } else {
      // Handle profile fields
      saveField(fieldName, value)
    }
  }

  // Save individual items (goals, expenses, loans)
  const saveItem = async (itemType, data) => {
    if (!isAuthenticated) return

    try {
      setSaving(true)
      
      if (itemType === 'goal' && data.id) {
        await ApiService.updateFinancialGoal(data.id, data)
        setSaveStatus('Goal updated')
      } else if (itemType === 'expense' && data.id) {
        await ApiService.updateFinancialExpense(data.id, data)
        setSaveStatus('Expense updated')
      } else if (itemType === 'loan' && data.id) {
        const payload = { ...data, name: data.description, emi: data.emi === '' ? null : data.emi }
        await ApiService.updateFinancialLoan(data.id, payload)
        setSaveStatus('Loan updated')
      }
      
      setTimeout(() => setSaveStatus(''), 1000)
      setSaveError('')
    } catch (error) {
      setSaveError(`Error saving ${itemType}`)
      setTimeout(() => setSaveError(''), 3000)
      console.error(`Error saving ${itemType}:`, error)
    } finally {
      setSaving(false)
    }
  }

  const saveFinancialData = async () => {
    // This function is now just for manual saves - individual fields auto-save
    setSaveStatus('All changes saved')
    setTimeout(() => setSaveStatus(''), 2000)
  }

  const handleLogout = async () => {
    try {
      await logout()
      // Reset all data
      setFormData({
        age: '',
        currentAnnualGrossIncome: '',
        workTenureYears: '',
        totalAssetGrossMarketValue: '',
        totalLoanOutstandingValue: '',
        loanTenureYears: '',
        lifespanYears: 85,
        incomeGrowthRate: 0.06,
        assetGrowthRate: 0.06
      })
      setGoals([])
      setExpenses([])
      setLoans([])
      // Calculations now come from ChartContext
      setFinancialProfile(null)
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  // calculateFinancials now comes from ChartContext (exactly as specified)


  // Dynamic Goals Management
  const addGoal = () => {
    const newGoal = {
      description: `Goal ${goals.length + 1}`,
      amount: 0,
      orderIndex: goals.length + 1,
      isNew: true
    }
    const updatedGoals = [...goals, newGoal]
    setGoals(updatedGoals)
    dispatchGoalsEvent(updatedGoals)
  }

  const updateGoal = (index, field, value) => {
    const updatedGoals = [...goals]
    updatedGoals[index] = { ...updatedGoals[index], [field]: value }
    setGoals(updatedGoals)
    dispatchGoalsEvent(updatedGoals)
    // Set source preference to Quick Calculator when user edits goals
    setSourcePreference('goals', 0);
  }

  const saveGoalOnBlur = async (index, field, value) => {
    if (!isAuthenticated) return
    
    const goal = goals[index]
    if (goal.id) {
      // Update existing goal
      saveOnBlur('goal', { id: goal.id, [field]: value })
    } else if (goal.isNew) {
      // Create new goal
      try {
        setSaving(true)
        const payload = {
          user_id: user.id,
          profile_id: financialProfile?.id,
          name: goal.description || '',
          target_amount: goal.amount || 0,
          term: 'LT',
          on_track: false
        }
        
        // Only add optional fields if they have valid values
        if (goal.target_date) {
          payload.target_date = goal.target_date
        }
        if (goal.recommended_allocation) {
          payload.recommended_allocation = goal.recommended_allocation
        }
        if (goal.funding_source) {
          payload.funding_source = goal.funding_source
        }
        
        console.log('🎯 Goal creation payload:', payload)
        const response = await ApiService.createFinancialGoal(payload)
        if (response.goal) {
          // Update local state with the new ID
          const updatedGoals = [...goals]
          updatedGoals[index] = { ...goal, id: response.goal.id, isNew: false }
          setGoals(updatedGoals)
          setSaveStatus('Goal created')
          setTimeout(() => setSaveStatus(''), 1000)
        }
      } catch (error) {
        setSaveError('Error creating goal')
        setTimeout(() => setSaveError(''), 3000)
        console.error('Error creating goal:', error)
      } finally {
        setSaving(false)
      }
    }
  }

  const removeGoal = async (index) => {
    const goalToRemove = goals[index];
    if (goalToRemove.id) {
      try {
        await ApiService.deleteFinancialGoal(goalToRemove.id);
      } catch (error) {
        console.error('Failed to delete goal from backend:', error);
      }
    }
    const updatedGoals = goals.filter((_, i) => i !== index);
    setGoals(updatedGoals);
    dispatchGoalsEvent(updatedGoals);
  }

  // Dynamic Expenses Management
  const addExpense = () => {
    const newExpense = {
      description: `Expense ${expenses.length + 1}`,
      amount: 0,
      orderIndex: expenses.length + 1,
      isNew: true
    }
    const updatedExpenses = [...expenses, newExpense]
    setExpenses(updatedExpenses)
    dispatchExpensesEvent(updatedExpenses)
  }

  const updateExpense = (index, field, value) => {
    const updatedExpenses = [...expenses]
    updatedExpenses[index] = { ...updatedExpenses[index], [field]: value }
    setExpenses(updatedExpenses)
    dispatchExpensesEvent(updatedExpenses)
    // Set source preference to Quick Calculator when user edits expenses
    setSourcePreference('expenses', 0);
  }

  const saveExpenseOnBlur = async (index, field, value) => {
    if (!isAuthenticated) return
    
    const expense = expenses[index]
    if (expense.id) {
      // Update existing expense
      saveOnBlur('expense', { id: expense.id, [field]: value })
    } else if (expense.isNew) {
      // Create new expense
      try {
        setSaving(true)
        const payload = {
          user_id: user.id,
          profile_id: financialProfile?.id,
          description: expense.description || 'General',
          amount: expense.amount || 0,
          frequency: expense.frequency || 'Monthly',
          personal_inflation: 0.06,
          source: 'manual',
          notes: null
        }
        
        console.log('💰 Expense creation payload:', payload)
        const response = await ApiService.createFinancialExpense(payload)
        if (response.expense) {
          // Update local state with the new ID
          const updatedExpenses = [...expenses]
          updatedExpenses[index] = { ...expense, id: response.expense.id, isNew: false }
          setExpenses(updatedExpenses)
          setSaveStatus('Expense created')
          setTimeout(() => setSaveStatus(''), 1000)
        }
      } catch (error) {
        setSaveError('Error creating expense')
        setTimeout(() => setSaveError(''), 3000)
        console.error('Error creating expense:', error)
      } finally {
        setSaving(false)
      }
    }
  }

  const removeExpense = (index) => {
    console.log('🗑️ Main page removeExpense called with index:', index);
    console.log('🗑️ Current expenses:', expenses);
    
    const expenseToRemove = expenses[index];
    if (!expenseToRemove) {
      console.log('❌ Expense not found');
      return;
    }
    
    // Main page only removes from local state - does NOT delete from database
    // This ensures Expenses page is not affected
    console.log('🗑️ Main page: Removing expense from local state only (not from database)');
    
    // Set source preference to Quick Calculator when deleting from main page
    setSourcePreference('expenses', 0);
    
    const updatedExpenses = expenses.filter((_, i) => i !== index);
    setExpenses(updatedExpenses);
    dispatchExpensesEvent(updatedExpenses);
    
    // Update store with new expenses array
    setStoreExpenses(updatedExpenses);
    
    // Trigger immediate recalculation
    const totalExpenses = updatedExpenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
    const currentYear = new Date().getFullYear();
    const horizonYears = (parseInt(formData.lifespanYears) || 85) - (parseInt(formData.age) || 0);
    
    const quickEmiByYear = {};
    for (let i = 0; i < horizonYears; i++) {
      const year = currentYear + i;
      const annualEmi = loans.reduce((sum, loan) => sum + (parseFloat(loan.emi) || 0) * 12, 0);
      quickEmiByYear[year] = annualEmi;
    }
    
    // Update main inputs with new values
    setMainInputs({
      expenses0: totalExpenses,
      quickEmiByYear: quickEmiByYear
    }, { origin: 'user' });
    
    setSaveStatus('Expense removed from main page');
    setTimeout(() => setSaveStatus(''), 1000);
  }

  // Loan CRUD handlers using backend
  const addLoan = () => {
    const newLoan = { 
      description: '', 
      amount: '', 
      emi: '', 
      isNew: true,
      _tempId: Date.now() + Math.random() // Unique temporary ID
    };
    const updatedLoans = [...loans, newLoan]
    setLoans(updatedLoans);
    dispatchLoansEvent(updatedLoans);
  }

  const updateLoan = (loanKey, field, value) => {
    console.log('🔄 updateLoan called:', { loanKey, field, value });
    setLoans(loans => {
      const updatedLoans = loans.map((loan, idx) => {
        // Match by ID if it exists, otherwise by tempId, otherwise by index
        const isMatch = loan.id ? loan.id === loanKey : 
                       loan._tempId ? loan._tempId === loanKey : 
                       idx === loanKey;
        if (isMatch) {
          console.log('🔄 Updating loan:', { before: loan, field, value, after: { ...loan, [field]: value } });
        }
        return isMatch ? { ...loan, [field]: value } : loan;
      });
      console.log('🔄 Updated loans array:', updatedLoans.map(l => ({ id: l.id, description: l.description })));
      dispatchLoansEvent(updatedLoans);
      return updatedLoans;
    });
    // Set source preference to Quick Calculator when user edits loans
    setSourcePreference('loans', 0);
  }

  const saveLoanOnBlur = async (loanKey, field, value) => {
    if (!isAuthenticated) return
    
    const loan = loans.find((l, idx) => 
      l.id ? l.id === loanKey : 
      l._tempId ? l._tempId === loanKey : 
      idx === loanKey
    );
    
    if (loan && loan.id) {
      // Update existing loan
      saveOnBlur('loan', { id: loan.id, [field]: value })
    } else if (loan && loan.isNew) {
      // Create new loan
      try {
        setSaving(true)
        const payload = {
          user_id: user.id,
          profile_id: financialProfile?.id,
          lender: loan.description || 'Loan',
          principal_outstanding: loan.amount || 0,
          emi: loan.emi || null
        }
        
        console.log('🏦 Loan creation payload:', payload)
        const response = await ApiService.createFinancialLoan(payload)
        if (response.loan) {
          // Update local state with the new ID
          const updatedLoans = loans.map((l, idx) => {
            const isMatch = l.id ? l.id === loanKey : 
                           l._tempId ? l._tempId === loanKey : 
                           idx === loanKey;
            return isMatch ? { ...l, id: response.loan.id, isNew: false } : l;
          })
          setLoans(updatedLoans)
          setSaveStatus('Loan created')
          setTimeout(() => setSaveStatus(''), 1000)
        }
      } catch (error) {
        setSaveError('Error creating loan')
        setTimeout(() => setSaveError(''), 3000)
        console.error('Error creating loan:', error)
      } finally {
        setSaving(false)
      }
    }
  }

  const removeLoan = (loanKey) => {
    console.log('🗑️ Main page removeLoan called with loanKey:', loanKey);
    console.log('🗑️ Current loans:', loans);
    
    let loanToRemove;
    let loanIndex = -1;
    
    if (typeof loanKey === 'number') {
      // If it's a number, it should be an index
      if (loanKey < loans.length) {
        loanToRemove = loans[loanKey];
        loanIndex = loanKey;
        console.log('🗑️ Found loan by index:', loanToRemove);
      } else {
        console.log('❌ Invalid index:', loanKey, 'loans length:', loans.length);
        return;
      }
    } else {
      // If it's not a number, find by ID or tempId
      loanToRemove = loans.find((loan, idx) => {
        if (loan.id === loanKey || loan._tempId === loanKey) {
          loanIndex = idx;
          return true;
        }
        return false;
      });
      console.log('🗑️ Found loan by ID/tempId:', loanToRemove, 'at index:', loanIndex);
    }
    
    if (!loanToRemove) {
      console.log('❌ Loan not found');
      return;
    }
    
    // Main page only removes from local state - does NOT delete from database
    // This ensures Loans page is not affected
    console.log('🗑️ Main page: Removing loan from local state only (not from database)');
    
    // Set source preference to Quick Calculator when deleting from main page
    setSourcePreference('loans', 0);
    
    setLoans(loans => {
      const updatedLoans = loans.filter((_, idx) => idx !== loanIndex);
      dispatchLoansEvent(updatedLoans);
      
      // Update store with new loans array
      const mappedLoansForStore = updatedLoans.map(loan => ({
        ...loan,
        principal_outstanding: loan.amount,
        lender: loan.description
      }));
      setStoreLoans(mappedLoansForStore);
      
      // Trigger immediate recalculation
      const totalExpenses = expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
      const currentYear = new Date().getFullYear();
      const horizonYears = (parseInt(formData.lifespanYears) || 85) - (parseInt(formData.age) || 0);
      
      const quickEmiByYear = {};
      for (let i = 0; i < horizonYears; i++) {
        const year = currentYear + i;
        const annualEmi = updatedLoans.reduce((sum, loan) => sum + (parseFloat(loan.emi) || 0) * 12, 0);
        quickEmiByYear[year] = annualEmi;
      }
      
      // Update main inputs with new values
      setMainInputs({
        expenses0: totalExpenses,
        quickEmiByYear: quickEmiByYear
      }, { origin: 'user' });
      
      return updatedLoans;
    });
    
    setSaveStatus('Loan removed from main page');
    setTimeout(() => setSaveStatus(''), 1000);
  }

  const formatCurrency = (amount) => {
    // Convert to number if it's not already
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0
    
    // Handle negative values
    const isNegative = numAmount < 0
    const absAmount = Math.abs(numAmount)
    
    let formatted
    if (absAmount >= 10000000) {
      formatted = `${(absAmount / 10000000).toFixed(1)}Cr`
    } else if (absAmount >= 100000) {
      formatted = `${(absAmount / 100000).toFixed(1)}L`
    } else if (absAmount >= 1000) {
      formatted = `${(absAmount / 1000).toFixed(1)}K`
    } else {
      formatted = `${absAmount.toFixed(0)}`
    }
    
    return `${isNegative ? '-' : ''}₹${formatted}`
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 min-h-screen">
      {/* Saved status indicator */}
      {saveStatus && (
        <div style={{position: 'fixed', top: 16, right: 24, zIndex: 1000}} className="professional-badge professional-badge-success shadow-lg animate-pulse">
          {saveStatus}
        </div>
      )}
      {/* Error status indicator */}
      {saveError && (
        <div style={{position: 'fixed', top: 56, right: 24, zIndex: 1000}} className="bg-red-100 text-red-700 px-4 py-2 rounded shadow transition-opacity duration-500">
          {saveError}
        </div>
      )}

      {/* Authentication Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Life Sheet</h1>
          <p className="text-gray-600">Financial Planning Calculator</p>
        </div>
        
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.name || user?.email || 'User'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Login / Sign Up
            </Button>
          )}
        </div>
      </div>

      {/* Show warning if not authenticated */}
      {!isAuthenticated && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p>You are not logged in. You can use the calculator, but your data will not be saved unless you log in.</p>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Input Form */}
        <div className="lg:col-span-1">
          <Card className="professional-card fade-in">
            <CardHeader className="professional-header">
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="w-5 h-5" />
                <span>Financial Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Core Financial Inputs */}
              <div className="space-y-4">
                <div className="professional-section">
                  <div className="professional-section-content">
                    <Label htmlFor="age" className="text-sm font-medium text-gray-700 mb-2 block">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Enter your age"
                      value={formData.age}
                      onChange={(e) => handleUserInputChange('age', e.target.value)}
                      onBlur={(e) => saveOnBlur('age', e.target.value)}
                      className="professional-input"
                    />
                  </div>
                </div>

                <div className="professional-section">
                  <div className="professional-section-content">
                    <Label htmlFor="income" className="text-sm font-medium text-gray-700 mb-2 block">
                      Current Annual Gross Income & Work Tenure
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        id="income"
                        type="number"
                        placeholder="Rs. XX,XXX"
                        value={formData.currentAnnualGrossIncome}
                        onChange={(e) => handleUserInputChange('currentAnnualGrossIncome', e.target.value)}
                        onBlur={(e) => saveOnBlur('currentAnnualGrossIncome', e.target.value)}
                        className="professional-input"
                      />
                      <Input
                        type="number"
                        placeholder="XX years"
                        value={formData.workTenureYears}
                        onChange={(e) => handleUserInputChange('workTenureYears', e.target.value)}
                        onBlur={(e) => saveOnBlur('workTenureYears', e.target.value)}
                        className="professional-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-teal-300 rounded-lg p-3 bg-teal-50/30">
                  <Label htmlFor="assets" className="text-sm font-medium text-gray-700">
                    Total Asset Gross Market Value
                  </Label>
                  <Input
                    id="assets"
                    type="number"
                    placeholder="Enter your Gross Market Value"
                    value={formData.totalAssetGrossMarketValue}
                    onChange={(e) => handleUserInputChange('totalAssetGrossMarketValue', e.target.value)}
                    onBlur={(e) => saveOnBlur('totalAssetGrossMarketValue', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated from Assets module: {/* This would be calculated from assets */} assets
                  </p>
                </div>

                {/* Outstanding Loans Section */}
                <div className="border border-teal-300 rounded-lg p-3 bg-teal-50/30">
                  <Label className="text-sm font-medium text-gray-700">Outstanding Loans</Label>
                  <Input
                    type="number"
                    value={loans.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0)}
                    readOnly
                    className="mt-1 bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated from Loans module: {loans.length} loans
                  </p>
                  
                  {/* Loan entries */}
                  <div className="space-y-2 mt-3">
                    {loans.map((loan, index) => (
                      <div key={loan.id || loan._tempId || index} className="grid grid-cols-3 gap-2 items-center">
                        <Input
                          placeholder="Description"
                          value={loan.description || ''}
                          onChange={e => handleLoanChange(loan.id || loan._tempId || index, 'description', e.target.value)}
                          onBlur={e => saveLoanOnBlur(loan.id || loan._tempId || index, 'description', e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={loan.amount === "" ? "" : loan.amount}
                          onChange={e => {
                            const val = e.target.value;
                            handleLoanChange(loan.id || loan._tempId || index, 'amount', val === "" ? "" : parseFloat(val));
                          }}
                          onBlur={e => {
                            const val = e.target.value;
                            saveLoanOnBlur(loan.id || loan._tempId || index, 'amount', val === "" ? "" : parseFloat(val));
                          }}
                          className="text-sm"
                        />
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            placeholder="EMI"
                            value={loan.emi === "" ? "" : loan.emi}
                            onChange={e => {
                              const val = e.target.value;
                              handleLoanChange(loan.id || loan._tempId || index, 'emi', val === "" ? "" : parseFloat(val));
                            }}
                            onBlur={e => {
                              const val = e.target.value;
                              saveLoanOnBlur(loan.id || loan._tempId || index, 'emi', val === "" ? "" : parseFloat(val));
                            }}
                            className="text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLoan(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    onClick={addLoan}
                    className="professional-button professional-button-success w-full mt-3"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Loan
                  </Button>
                </div>

                {/* Financial Goals Section */}
                <div className="border border-teal-300 rounded-lg p-3 bg-teal-50/30">
                  <Label className="text-sm font-medium text-gray-700">Specific Financial Goals</Label>
                  <Input
                    type="number"
                    value={goals.reduce((sum, goal) => sum + (parseFloat(goal.amount) || 0), 0)}
                    readOnly
                    className="mt-1 bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Total from Goals module: {goals.length} goals
                  </p>
                  
                  {/* Goal entries */}
                  <div className="space-y-2 mt-3">
                    {goals.map((goal, index) => (
                      <div key={goal.id || index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Goal {index + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGoal(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Goal description"
                          value={goal.description || ''}
                          onChange={e => handleGoalChange(index, 'description', e.target.value)}
                          onBlur={e => saveGoalOnBlur(index, 'description', e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={goal.amount === "" ? "" : goal.amount}
                          onChange={e => {
                            const val = e.target.value;
                            handleGoalChange(index, 'amount', val === "" ? "" : parseFloat(val));
                          }}
                          onBlur={e => {
                            const val = e.target.value;
                            saveGoalOnBlur(index, 'amount', val === "" ? "" : parseFloat(val));
                          }}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    onClick={addGoal}
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 border-teal-300 text-teal-700 hover:bg-teal-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Goal
                  </Button>
                </div>

                {/* Expenses Section */}
                <div className="border border-teal-300 rounded-lg p-3 bg-teal-50/30">
                  <Label className="text-sm font-medium text-gray-700">All Inclusive Annual Expenses</Label>
                  <Input
                    type="number"
                    value={expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0)}
                    readOnly
                    className="mt-1 bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated from Expenses module: {expenses.length} expenses
                  </p>
                  
                  {/* Expense entries */}
                  <div className="space-y-2 mt-3">
                    {expenses.map((expense, index) => (
                      <div key={expense.id || index} className="grid grid-cols-2 gap-2 items-center">
                        <Input
                          placeholder="Expense description"
                          value={expense.description || ''}
                          onChange={e => handleExpenseChange(index, 'description', e.target.value)}
                          onBlur={e => saveExpenseOnBlur(index, 'description', e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={expense.amount === "" ? "" : expense.amount}
                            onChange={e => {
                              const val = e.target.value;
                              handleExpenseChange(index, 'amount', val === "" ? "" : parseFloat(val));
                            }}
                            onBlur={e => {
                              const val = e.target.value;
                              saveExpenseOnBlur(index, 'amount', val === "" ? "" : parseFloat(val));
                            }}
                            className="text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExpense(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    onClick={addExpense}
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 border-teal-300 text-teal-700 hover:bg-teal-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Life Sheet Display */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Life Sheet Summary - now full width */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur w-full">
            <CardHeader className="bg-gradient-to-r from-teal-500 to-green-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <span>Life Sheet</span>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  Surplus: {formatCurrency(Math.abs(calculations.surplusDeficit))}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                
                {/* Assets Column */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Total Existing Assets</span>
                    <span className="text-lg font-bold text-green-600">
                      + {formatCurrency(calculations.totalExistingAssets)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Total Human Capital</span>
                    <span className="text-lg font-bold text-green-600">
                      + {formatCurrency(calculations.totalHumanCapital)}
                    </span>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-800">Total</span>
                      <span className="text-xl font-bold text-green-600">
                        + {formatCurrency(calculations.totalExistingAssets + calculations.totalHumanCapital)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Liabilities Column */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Total Existing Liabilities</span>
                    <span className="text-lg font-bold text-red-600">
                      - {formatCurrency(calculations.totalExistingLiabilities)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Total Future Expense</span>
                    <span className="text-lg font-bold text-red-600">
                      - {formatCurrency(calculations.totalFutureExpenses)}
                    </span>
                  </div>
                  
                  {/* Replace individual Financial Goals with Cumulative Financial Goal */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Cumulative Financial Goal</span>
                    <span className="text-lg font-bold text-red-600">
                      - {formatCurrency(calculations.totalFinancialGoals)}
                    </span>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-800">Total</span>
                      <span className="text-xl font-bold text-red-600">
                        - {formatCurrency(calculations.totalExistingLiabilities + calculations.totalFutureExpenses + calculations.totalFinancialGoals)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Net Total Row */}
              <div className="border-t-2 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Net Total</span>
                  <span className={`text-2xl font-bold ${(calculations.totalExistingAssets + calculations.totalHumanCapital) - (calculations.totalExistingLiabilities + calculations.totalFutureExpenses + calculations.totalFinancialGoals) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency((calculations.totalExistingAssets + calculations.totalHumanCapital) - (calculations.totalExistingLiabilities + calculations.totalFutureExpenses + calculations.totalFinancialGoals))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Chart Section - now below Life Sheet */}
          <Card className="mt-0 shadow-lg border-0 bg-white/80 backdrop-blur w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                <span>Graph Heading</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {console.log('🔄 Chart: chartData length:', chartData.length, 'chartData:', chartData) || chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
             <LineChart data={chartData}>
               <CartesianGrid strokeDasharray="3 3" />
               <XAxis 
                 dataKey="year" 
                 label={{ value: 'Life Tenure', position: 'insideBottom', offset: -5 }}
               />
               <YAxis 
                 label={{ value: 'Net Worth', angle: -90, position: 'insideLeft' }}
                 tickFormatter={(value) => formatCurrency(value)}
                 domain={['dataMin', 'dataMax']}
               />
               <Tooltip 
                 formatter={(value, name) => [formatCurrency(value), name]}
                 labelFormatter={(label) => `Year: ${label}`}
               />
               <Line dataKey="netWorth" name="Net Worth" stroke="#10B981" strokeWidth={3} dot={false} />
             </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Enter your financial information to see projections</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Source Indicators */}
          <Card className="mt-4 shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span>Chart Data Sources</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${sourcePreferences?.assets === 1 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium">Assets</p>
                    <p className="text-xs text-gray-600">
                      {sourcePreferences?.assets === 1 ? 'Detailed (Assets Page)' : 'Quick Calculator'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${sourcePreferences?.income === 1 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium">Work Assets</p>
                    <p className="text-xs text-gray-600">
                      {sourcePreferences?.income === 1 ? 'Detailed (Work Assets Page)' : 'Quick Calculator'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${sourcePreferences?.loans === 1 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium">Liabilities</p>
                    <p className="text-xs text-gray-600">
                      {sourcePreferences?.loans === 1 ? 'Detailed (Loans Page)' : 'Quick Calculator'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${sourcePreferences?.expenses === 1 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium">Expenses</p>
                    <p className="text-xs text-gray-600">
                      {sourcePreferences?.expenses === 1 ? 'Detailed (Expenses Page)' : 'Quick Calculator'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600">
                  <strong>Legend:</strong> 
                  <span className="inline-flex items-center ml-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                    Detailed (from respective pages)
                  </span>
                  <span className="inline-flex items-center ml-4">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                    Quick Calculator (from main page)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Growth Rate Assumptions & Calculation Logic */}
          <Card className="mt-4 shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                <span>Growth Rate Assumptions & Net Worth Calculation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Growth Rate Assumptions */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Growth Rate Assumptions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Asset Growth Rate:</span>
                      <span className="font-medium">{(parseFloat(formData.assetGrowthRate) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Income Growth Rate:</span>
                      <span className="font-medium">{(parseFloat(formData.incomeGrowthRate) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expense Inflation Rate:</span>
                      <span className="font-medium">6.0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Work Tenure:</span>
                      <span className="font-medium">{formData.workTenureYears} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Projection Horizon:</span>
                      <span className="font-medium">{formData.lifespanYears - parseInt(formData.age)} years</span>
                    </div>
                  </div>
                </div>

                {/* Net Worth Calculation Logic */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Net Worth Calculation</h4>
                  <div className="text-sm space-y-2">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium text-gray-700 mb-2">Formula for each year:</p>
                      <p className="text-gray-600">
                        <strong>Net Worth<sub>t</sub> = Net Worth<sub>t-1</sub> × (1 + Asset Growth) + Income<sub>t</sub> - Expenses<sub>t</sub> - EMIs<sub>t</sub></strong>
                      </p>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>• <strong>Income<sub>t</sub></strong> = Current Income × (1 + Income Growth)<sup>t-1</sup> (only while working)</p>
                      <p>• <strong>Expenses<sub>t</sub></strong> = Base Expenses × (1 + Inflation)<sup>t-1</sup></p>
                      <p>• <strong>EMIs<sub>t</sub></strong> = Sum of active loan EMIs for year t</p>
                      <p>• <strong>Asset Growth</strong> = Applied to total net worth each year</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Inputs Summary */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-3">Current Inputs</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Initial Assets:</span>
                    <p className="font-medium">{formatCurrency(formData.totalAssetGrossMarketValue)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Annual Income:</span>
                    <p className="font-medium">{formatCurrency(formData.currentAnnualGrossIncome)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Annual Expenses:</span>
                    <p className="font-medium">{formatCurrency(calculations.totalFutureExpenses / (formData.lifespanYears - parseInt(formData.age)))}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Annual EMIs:</span>
                    <p className="font-medium">{formatCurrency(loans.reduce((sum, loan) => sum + (parseFloat(loan.emi) || 0), 0) * 12)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}

    </div>
  )
}

