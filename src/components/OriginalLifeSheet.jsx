import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { TrendingUp, TrendingDown, Calculator, Target, DollarSign, PiggyBank, User, LogOut, Save, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useChart } from '../contexts/ChartContext'
import { useLifeSheetStore } from '../store/enhanced-store'
import AuthModal from './AuthModal'
import ApiService from '../services/api'
import '../styles/professional-theme.css'

export default function OriginalLifeSheet() {
  const { user, logout, isAuthenticated } = useAuth()
  const { chartData, calculateFinancials } = useChart()
  const { updateLifeSheet, addGoal: addStoreGoal, updateGoal: updateStoreGoal, deleteGoal: deleteStoreGoal, addExpense: addStoreExpense, updateExpense: updateStoreExpense, deleteExpense: deleteStoreExpense, addLoan: addStoreLoan, updateLoan: updateStoreLoan, deleteLoan: deleteStoreLoan, setLoans: setStoreLoans, setExpenses: setStoreExpenses, setGoals: setStoreGoals } = useLifeSheetStore()
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
  
  // Get calculated values from ChartContext (exactly as specified)
  const calculations = calculateFinancials()

  const [financialProfile, setFinancialProfile] = useState(null)

  // 1. Add a new state for loans with default entries
  const [loans, setLoans] = useState([
    { description: 'l1', amount: 500, emi: 500, _tempId: 'default-1', isNew: true },
    { description: 'l2', amount: 10000, emi: 70, _tempId: 'default-2', isNew: true },
    { description: 'l3', amount: 10, emi: 15, _tempId: 'default-3', isNew: true }
  ])

  // Load user's financial data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadFinancialData()
      
      // Load loans
      ApiService.getFinancialLoans(user.id).then(res => {
        console.log('🏦 Loans fetch response:', res)
        const mappedLoans = (res.loans || []).map(loan => ({
          ...loan,
          description: loan.name // Map backend 'name' to frontend 'description'
        }));
        setLoans(mappedLoans);
        
        // Map loans for store with correct field names
        const mappedLoansForStore = mappedLoans.map(loan => ({
          ...loan,
          principal_outstanding: loan.amount, // Map amount to principal_outstanding for store
          lender: loan.description // Map description to lender for store
        }))
        setStoreLoans(mappedLoansForStore); // Also update store
      }).catch(error => {
        console.error('❌ Loans fetch error:', error)
      })
      
      // Load goals
      ApiService.getFinancialGoals(user.id).then(res => {
        console.log('🎯 Goals fetch response:', res)
        const mappedGoals = (res.goals || []).map(goal => ({
          ...goal,
          amount: parseFloat(goal.target_amount) || parseFloat(goal.amount) || 0 // Map target_amount to amount for display
        }));
        setGoals(mappedGoals);
        setStoreGoals(mappedGoals); // Also update store
      }).catch(error => {
        console.error('❌ Goals fetch error:', error)
      })
      
      // Load expenses
      ApiService.getFinancialExpenses(user.id).then(res => {
        console.log('💰 Expenses fetch response:', res)
        const expensesData = res.expenses || [];
        setExpenses(expensesData);
        setStoreExpenses(expensesData); // Also update store
      }).catch(error => {
        console.error('❌ Expenses fetch error:', error)
      })
    }
  }, [isAuthenticated, user])

  // Update store when local data changes
  useEffect(() => {
    if (isAuthenticated && user) {
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
  }, [formData, isAuthenticated, user, updateLifeSheet])

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
    setGoals([...goals, newGoal])
  }

  const updateGoal = (index, field, value) => {
    const updatedGoals = [...goals]
    updatedGoals[index] = { ...updatedGoals[index], [field]: value }
    setGoals(updatedGoals)
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
  }

  // Dynamic Expenses Management
  const addExpense = () => {
    const newExpense = {
      description: `Expense ${expenses.length + 1}`,
      amount: 0,
      orderIndex: expenses.length + 1,
      isNew: true
    }
    setExpenses([...expenses, newExpense])
  }

  const updateExpense = (index, field, value) => {
    const updatedExpenses = [...expenses]
    updatedExpenses[index] = { ...updatedExpenses[index], [field]: value }
    setExpenses(updatedExpenses)
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

  const removeExpense = async (index) => {
    const expenseToRemove = expenses[index];
    if (expenseToRemove.id) {
      try {
        await ApiService.deleteFinancialExpense(expenseToRemove.id);
      } catch (error) {
        console.error('Failed to delete expense from backend:', error);
      }
    }
    const updatedExpenses = expenses.filter((_, i) => i !== index);
    setExpenses(updatedExpenses);
  }

  // 2. Add loan CRUD handlers using backend
  const addLoan = () => {
    const newLoan = { 
      description: '', 
      amount: '', 
      emi: '', 
      isNew: true,
      _tempId: Date.now() + Math.random() // Unique temporary ID
    };
    setLoans([
      ...loans,
      newLoan
    ]);
  }

  const updateLoan = (loanKey, field, value) => {
    setLoans(loans => loans.map((loan, idx) => {
      // Match by ID if it exists, otherwise by tempId, otherwise by index
      const isMatch = loan.id ? loan.id === loanKey : 
                     loan._tempId ? loan._tempId === loanKey : 
                     idx === loanKey;
      return isMatch ? { ...loan, [field]: value } : loan;
    }));
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

  const removeLoan = async (loanKey) => {
    console.log('🗑️ removeLoan called with loanKey:', loanKey);
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
    
    if (loanToRemove.id) {
      try {
        console.log('🗑️ Deleting loan with ID:', loanToRemove.id);
        const response = await ApiService.deleteFinancialLoan(loanToRemove.id);
        console.log('✅ Delete response:', response);
        
        // Only remove from UI if backend deletion was successful
        setLoans(loans => loans.filter((_, idx) => idx !== loanIndex));
        
        setSaveStatus('Loan deleted');
        setTimeout(() => setSaveStatus(''), 1000);
      } catch (error) {
        console.error('❌ Failed to delete loan from backend:', error);
        setSaveError('Error deleting loan');
        setTimeout(() => setSaveError(''), 3000);
      }
    } else {
      console.log('🗑️ No ID found, removing from UI only');
      // For loans without ID (not saved yet), just remove from UI
      setLoans(loans => loans.filter((_, idx) => idx !== loanIndex));
    }
  }

  const formatCurrency = (amount) => {
    // Convert to number if it's not already
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0
    
    if (numAmount >= 10000000) {
      return `₹${(numAmount / 10000000).toFixed(1)}Cr`
    } else if (numAmount >= 100000) {
      return `₹${(numAmount / 100000).toFixed(1)}L`
    } else if (numAmount >= 1000) {
      return `₹${(numAmount / 1000).toFixed(1)}K`
    }
    return `₹${numAmount.toFixed(0)}`
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
                      onChange={(e) => setFormData({...formData, age: e.target.value})}
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
                        onChange={(e) => setFormData({...formData, currentAnnualGrossIncome: e.target.value})}
                        onBlur={(e) => saveOnBlur('currentAnnualGrossIncome', e.target.value)}
                        className="professional-input"
                      />
                      <Input
                        type="number"
                        placeholder="XX years"
                        value={formData.workTenureYears}
                        onChange={(e) => setFormData({...formData, workTenureYears: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, totalAssetGrossMarketValue: e.target.value})}
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
                          onChange={e => updateLoan(loan.id || loan._tempId || index, 'description', e.target.value)}
                          onBlur={e => saveLoanOnBlur(loan.id || loan._tempId || index, 'description', e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={loan.amount === "" ? "" : loan.amount}
                          onChange={e => {
                            const val = e.target.value;
                            updateLoan(loan.id || loan._tempId || index, 'amount', val === "" ? "" : parseFloat(val));
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
                              updateLoan(loan.id || loan._tempId || index, 'emi', val === "" ? "" : parseFloat(val));
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
                          onChange={e => updateGoal(index, 'description', e.target.value)}
                          onBlur={e => saveGoalOnBlur(index, 'description', e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={goal.amount === "" ? "" : goal.amount}
                          onChange={e => {
                            const val = e.target.value;
                            updateGoal(index, 'amount', val === "" ? "" : parseFloat(val));
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
                          onChange={e => updateExpense(index, 'description', e.target.value)}
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
                              updateExpense(index, 'amount', val === "" ? "" : parseFloat(val));
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
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="year" 
                      label={{ value: 'Life Tenure', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Total Assets', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip 
                      formatter={(value, name) => [formatCurrency(value), name]}
                      labelFormatter={(label) => `Year: ${label}`}
                    />
                    <Bar dataKey="asset" fill="#10B981" />
                  </BarChart>
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

