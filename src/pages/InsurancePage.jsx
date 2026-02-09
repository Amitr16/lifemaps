
import React, { useEffect, useState } from 'react';
import EditableGrid from '@/components/EditableGrid.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminUser } from '@/contexts/AdminUserContext';
import ApiService from '@/services/api';
import { useLifeSheetStore } from '@/store/enhanced-store';
import { AlertTriangle, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function InsurancePage() {
  const { user } = useAuth();
  const adminUser = useAdminUser();
  
  // Check if we're in admin mode
  const isAdminMode = !!adminUser?.userId;
  const effectiveUserId = isAdminMode ? adminUser.userId : (user?.id || null);
  const effectiveIsAuthenticated = isAdminMode || !!user;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRows, setSavingRows] = useState(new Set());
  
  // Get financial data from store - same as OriginalLifeSheet
  const { main, setLoans: setStoreLoans, setExpenses: setStoreExpenses, setGoals: setStoreGoals, hydrateMainInputs, sourcePreferences } = useLifeSheetStore();
  
  // Local state for formData, loans, expenses, goals - same as OriginalLifeSheet
  const [formData, setFormData] = useState({
    age: '',
    currentAnnualGrossIncome: '',
    workTenureYears: '',
    totalAssetGrossMarketValue: '',
    totalLoanOutstandingValue: '',
    loanTenureYears: '',
    lifespanYears: 85,
    incomeGrowthRate: 0.06,
    inflationRate: 0.06,
    assetEquitySplit: 0.60,
    assetEquityGrowthRate: 0.15,
    assetDebtGrowthRate: 0.07
  });
  
  const [loans, setLoans] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [goals, setGoals] = useState([]);
  
  // Format currency helper - same as OriginalLifeSheet
  const formatCurrency = (amount) => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    const isNegative = numAmount < 0;
    const absAmount = Math.abs(numAmount);
    
    let formatted;
    if (absAmount >= 10000000) {
      formatted = `${(absAmount / 10000000).toFixed(1)}Cr`;
    } else if (absAmount >= 100000) {
      formatted = `${(absAmount / 100000).toFixed(1)}L`;
    } else if (absAmount >= 1000) {
      formatted = `${(absAmount / 1000).toFixed(1)}K`;
    } else {
      formatted = `${absAmount.toFixed(0)}`;
    }
    
    return `${isNegative ? '-' : ''}₹${formatted}`;
  };
  
  // Calculate values from left pane cells (same as OriginalLifeSheet)
  const totalLoans = loans.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
  const totalGoals = goals.reduce((sum, goal) => sum + (parseFloat(goal.amount) || 0), 0);
  
  // Calculate values (Quick Calculator or Detailed based on source preferences) - EXACT SAME as OriginalLifeSheet
  const calculateQuickCalculatorValues = () => {
    const { detail, sourcePreferences } = useLifeSheetStore.getState();
    const useDetailedAssets = sourcePreferences?.assets === 1 && detail?.assets?.portfolioSeries;
    const useDetailedIncome = sourcePreferences?.income === 1 && detail?.workIncome?.series;
    const useDetailedExpenses = sourcePreferences?.expenses === 1 && detail?.expenses?.series;
    
    // If using detailed calculations, use them with inflation discounting
    if (useDetailedAssets || useDetailedIncome || useDetailedExpenses) {
      return calculateDetailedValues();
    }
    
    // Otherwise use Quick Calculator logic
    const currentIncome = parseFloat(formData.currentAnnualGrossIncome) || 0;
    const workTenure = parseInt(formData.workTenureYears) || 0;
    const incomeGrowth = (formData.incomeGrowthRate !== undefined && formData.incomeGrowthRate !== null && formData.incomeGrowthRate !== '') 
      ? parseFloat(formData.incomeGrowthRate) : 0.06;
    const inflation = (formData.inflationRate !== undefined && formData.inflationRate !== null && formData.inflationRate !== '') 
      ? parseFloat(formData.inflationRate) : 0.06;
    
    // Total Assets: 60:40 split, project with growth rates, discount by inflation
    const totalAssets = parseFloat(formData.totalAssetGrossMarketValue) || 0;
    const equitySplit = (formData.assetEquitySplit !== undefined && formData.assetEquitySplit !== null && formData.assetEquitySplit !== '') 
      ? parseFloat(formData.assetEquitySplit) : 0.60;
    const equityPortion = totalAssets * equitySplit;
    const debtPortion = totalAssets * (1 - equitySplit);
    const equityGrowth = (formData.assetEquityGrowthRate !== undefined && formData.assetEquityGrowthRate !== null && formData.assetEquityGrowthRate !== '') 
      ? parseFloat(formData.assetEquityGrowthRate) : 0.15;
    const debtGrowth = (formData.assetDebtGrowthRate !== undefined && formData.assetDebtGrowthRate !== null && formData.assetDebtGrowthRate !== '') 
      ? parseFloat(formData.assetDebtGrowthRate) : 0.07;
    
    // Project assets year by year, discounting each year's value
    let projectedEquity = equityPortion;
    let projectedDebt = debtPortion;
    for (let year = 0; year < workTenure; year++) {
      projectedEquity *= (1 + equityGrowth);
      projectedDebt *= (1 + debtGrowth);
      projectedEquity /= (1 + inflation);
      projectedDebt /= (1 + inflation);
    }
    const totalProjectedAssets = projectedEquity + projectedDebt;
    
    // Financial Goals: Discount by inflation (no projection)
    const discountedGoals = totalGoals / (1 + inflation);
    
    // Expenses: Project by inflation, discount by inflation
    const remainingLife = Math.max(0, (parseInt(formData.lifespanYears) || 85) - (parseInt(formData.age) || 0));
    let totalProjectedExpenses = 0;
    for (let year = 0; year < remainingLife; year++) {
      const projectedExpense = totalExpenses * Math.pow(1 + inflation, year);
      const discountedExpense = projectedExpense / Math.pow(1 + inflation, year);
      totalProjectedExpenses += discountedExpense;
    }
    
    // EMIs: Discount by inflation (no projection) - include in expenses to avoid double counting
    const totalEmi = loans.reduce((sum, loan) => sum + (parseFloat(loan.emi) || 0) * 12, 0);
    const discountedEmi = totalEmi / (1 + inflation);
    
    // Total Future Expenses includes both regular expenses and EMIs (discounted)
    const totalFutureExpensesWithEmi = totalProjectedExpenses + discountedEmi;
    
    return {
      totalExistingAssets: totalProjectedAssets,
      totalExistingLiabilities: totalLoans,
      totalHumanCapital: 0, // Not used in insurance page
      totalFutureExpenses: totalFutureExpensesWithEmi,
      totalFinancialGoals: discountedGoals,
      discountedEmi,
      surplusDeficit: totalProjectedAssets - totalLoans - totalFutureExpensesWithEmi - discountedGoals
    };
  };
  
  // Calculate using detailed data with inflation discounting - EXACT SAME as OriginalLifeSheet
  const calculateDetailedValues = () => {
    const { detail, sourcePreferences, main } = useLifeSheetStore.getState();
    const inflation = (formData.inflationRate !== undefined && formData.inflationRate !== null && formData.inflationRate !== '') 
      ? parseFloat(formData.inflationRate) : 0.06;
    
    const currentYear = new Date().getFullYear();
    const age = parseInt(formData.age || 30);
    const targetAge = 80;
    const projectionYears = Math.max(0, targetAge - age);
    const workTenure = parseInt(formData.workTenureYears) || 0;
    
    // Assets: Use detailed if available, otherwise quick calculator
    let totalProjectedAssets = 0;
    if (sourcePreferences?.assets === 1 && detail?.assets?.portfolioSeries) {
      const startingAssetsNominal = detail.assets.portfolioSeries[currentYear] || parseFloat(formData.totalAssetGrossMarketValue) || 0;
      const finalYear = currentYear + workTenure;
      const assetsNominal = detail.assets.portfolioSeries[finalYear] || startingAssetsNominal;
      totalProjectedAssets = assetsNominal / Math.pow(1 + inflation, workTenure);
    } else {
      // Quick calculator assets
      const totalAssets = parseFloat(formData.totalAssetGrossMarketValue) || 0;
      const equitySplit = (formData.assetEquitySplit !== undefined && formData.assetEquitySplit !== null && formData.assetEquitySplit !== '') 
        ? parseFloat(formData.assetEquitySplit) : 0.60;
      const equityPortion = totalAssets * equitySplit;
      const debtPortion = totalAssets * (1 - equitySplit);
      const equityGrowth = (formData.assetEquityGrowthRate !== undefined && formData.assetEquityGrowthRate !== null && formData.assetEquityGrowthRate !== '') 
        ? parseFloat(formData.assetEquityGrowthRate) : 0.15;
      const debtGrowth = (formData.assetDebtGrowthRate !== undefined && formData.assetDebtGrowthRate !== null && formData.assetDebtGrowthRate !== '') 
        ? parseFloat(formData.assetDebtGrowthRate) : 0.07;
      
      let projectedEquity = equityPortion;
      let projectedDebt = debtPortion;
      for (let year = 0; year < workTenure; year++) {
        projectedEquity *= (1 + equityGrowth);
        projectedDebt *= (1 + debtGrowth);
        projectedEquity /= (1 + inflation);
        projectedDebt /= (1 + inflation);
      }
      totalProjectedAssets = projectedEquity + projectedDebt;
    }
    
    // Expenses: Use detailed if available (already includes EMIs)
    const remainingLife = Math.max(0, (parseInt(formData.lifespanYears) || 85) - age);
    let totalFutureExpenses = 0;
    if (sourcePreferences?.expenses === 1 && detail?.expenses?.series) {
      for (let yearOffset = 0; yearOffset < remainingLife; yearOffset++) {
        const year = currentYear + yearOffset;
        const expensesNominal = detail.expenses.series[year] || 0;
        const expensesPresentValue = expensesNominal / Math.pow(1 + inflation, yearOffset);
        totalFutureExpenses += expensesPresentValue;
      }
    } else {
      // Quick calculator expenses + EMIs
      let totalProjectedExpenses = 0;
      for (let year = 0; year < remainingLife; year++) {
        const projectedExpense = totalExpenses * Math.pow(1 + inflation, year);
        const discountedExpense = projectedExpense / Math.pow(1 + inflation, year);
        totalProjectedExpenses += discountedExpense;
      }
      const totalEmi = loans.reduce((sum, loan) => sum + (parseFloat(loan.emi) || 0) * 12, 0);
      const discountedEmi = totalEmi / (1 + inflation);
      totalFutureExpenses = totalProjectedExpenses + discountedEmi;
    }
    
    // Financial Goals: Discount by inflation (no projection)
    const discountedGoals = totalGoals / (1 + inflation);
    
    return {
      totalExistingAssets: totalProjectedAssets,
      totalExistingLiabilities: totalLoans,
      totalHumanCapital: 0, // Not used in insurance page
      totalFutureExpenses,
      totalFinancialGoals: discountedGoals,
      surplusDeficit: totalProjectedAssets - totalLoans - totalFutureExpenses - discountedGoals
    };
  };
  
  const calculations = calculateQuickCalculatorValues();
  
  // Calculate insurance needed from net total (without Human Capital)
  const netTotal = calculations.totalExistingAssets - calculations.totalExistingLiabilities - calculations.totalFutureExpenses - calculations.totalFinancialGoals;
  const insuranceNeeded = netTotal < 0 ? Math.abs(netTotal) : 0;

  // Load financial data - same as OriginalLifeSheet
  useEffect(() => {
    if (effectiveIsAuthenticated && effectiveUserId) {
      loadInsurance();
      
      // Load financial profile
      const profilePromise = isAdminMode
        ? ApiService.getFinancialProfileForUser(effectiveUserId)
        : ApiService.getFinancialProfile(effectiveUserId);
      profilePromise.then(res => {
        const profile = res.profile || res;
        if (profile) {
          setFormData(prev => ({
            ...prev,
            age: profile.age || '',
            currentAnnualGrossIncome: profile.current_annual_gross_income || '',
            workTenureYears: profile.work_tenure_years || '',
            totalAssetGrossMarketValue: profile.total_asset_gross_market_value || '',
            totalLoanOutstandingValue: profile.total_loan_outstanding_value || '',
            lifespanYears: profile.lifespan_years || 85
          }));
        }
      }).catch(error => {
        console.error('❌ Profile fetch error:', error);
      });
      
      // Load loans
      const loansPromise = isAdminMode
        ? ApiService.getFinancialLoansForUser(effectiveUserId)
        : ApiService.getFinancialLoans(effectiveUserId);
      loansPromise.then(res => {
        const mappedLoans = (res.loans || []).map(loan => ({
          ...loan,
          description: loan.provider || loan.lender || loan.name || '',
          amount: parseFloat(loan.principal_outstanding || loan.amount || 0)
        }));
        setLoans(mappedLoans);
      }).catch(error => {
        console.error('❌ Loans fetch error:', error);
      });
      
      // Load goals
      const goalsPromise = isAdminMode
        ? ApiService.getFinancialGoalsForUser(effectiveUserId)
        : ApiService.getFinancialGoals(effectiveUserId);
      goalsPromise.then(res => {
        const mappedGoals = (res.goals || []).map(goal => ({
          ...goal,
          amount: parseFloat(goal.target_amount || goal.amount || 0)
        }));
        setGoals(mappedGoals);
      }).catch(error => {
        console.error('❌ Goals fetch error:', error);
      });
      
      // Load expenses
      const expensesPromise = isAdminMode
        ? ApiService.getFinancialExpensesForUser(effectiveUserId)
        : ApiService.getFinancialExpenses(effectiveUserId);
      expensesPromise.then(res => {
        const expensesData = res.expenses || [];
        setExpenses(expensesData);
      }).catch(error => {
        console.error('❌ Expenses fetch error:', error);
      });
      
      // Load Quick Calculator assumptions from localStorage
      try {
        const quickCalcAssumptions = JSON.parse(localStorage.getItem('quickCalcAssumptions') || '{}');
        if (Object.keys(quickCalcAssumptions).length > 0) {
          setFormData(prev => ({
            ...prev,
            inflationRate: quickCalcAssumptions.inflationRate !== undefined ? quickCalcAssumptions.inflationRate : prev.inflationRate,
            assetEquitySplit: quickCalcAssumptions.assetEquitySplit !== undefined ? quickCalcAssumptions.assetEquitySplit : prev.assetEquitySplit,
            assetEquityGrowthRate: quickCalcAssumptions.assetEquityGrowthRate !== undefined ? quickCalcAssumptions.assetEquityGrowthRate : prev.assetEquityGrowthRate,
            assetDebtGrowthRate: quickCalcAssumptions.assetDebtGrowthRate !== undefined ? quickCalcAssumptions.assetDebtGrowthRate : prev.assetDebtGrowthRate
          }));
        }
      } catch (e) {
        console.warn('Failed to load Quick Calculator assumptions from localStorage:', e);
      }
    } else if (!effectiveIsAuthenticated) {
      // If not authenticated, set loading to false immediately
      setLoading(false);
    }
  }, [effectiveIsAuthenticated, effectiveUserId, isAdminMode]);

  const loadInsurance = async () => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = isAdminMode
        ? await ApiService.getFinancialInsuranceForUser(effectiveUserId)
        : await ApiService.getFinancialInsurance(effectiveUserId);
      const insurance = response.insurance || response || [];
      
      // Map database fields to frontend field names
      const mappedInsurance = insurance.map(policy => ({
        id: policy.id,
        policyType: policy.policy_type,
        cover: policy.cover,
        premium: policy.premium,
        frequency: policy.frequency || 'Yearly',
        provider: policy.provider,
        policyNumber: policy.policy_number,
        startDate: policy.start_date || '',
        endDate: policy.end_date || '',
        expiryYear: policy.end_date ? parseInt(policy.end_date.split('-')[0]) : '',
        notes: policy.notes,
        user_id: policy.user_id,
        created_at: policy.created_at,
        updated_at: policy.updated_at
      }));
      
      setRows(mappedInsurance);
    } catch (error) {
      console.error('Error loading insurance:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const newRow = {
      id: `temp_${Date.now()}`,
      policyType: '',
      cover: 0,
      premium: 0,
      frequency: 'Yearly',
      provider: '',
      policyNumber: '',
      startDate: '',
      endDate: '',
      expiryYear: new Date().getFullYear() + 10, // Default to 10 years from now
      notes: ''
    };
    setRows([...rows, newRow]);
  };

  const delRow = async (rowIndex) => {
    const row = rows[rowIndex];
    
    if (row.id && !row.id.toString().startsWith('temp_')) {
      try {
        await ApiService.deleteFinancialInsurance(row.id);
        setRows(rows.filter((_, i) => i !== rowIndex));
      } catch (error) {
        console.error('Error deleting insurance:', error);
      }
    } else {
      setRows(rows.filter((_, i) => i !== rowIndex));
    }
  };

  const handleCellChange = (rowIndex, field, value) => {
    try {
      const updatedRows = [...rows];
      updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
      setRows(updatedRows);

      const row = updatedRows[rowIndex];
      
      // Debounce auto-save
      const timeoutKey = `insurance_row_${rowIndex}`;
      clearTimeout(window[timeoutKey]);
      
      window[timeoutKey] = setTimeout(() => {
        if (savingRows.has(rowIndex)) {
          return;
        }
        
        if (row.id && !row.id.toString().startsWith('temp_')) {
          // Update existing row
          if (row.policyType && row.cover && row.premium) {
            setSavingRows(prev => new Set(prev).add(rowIndex));
            const endDate = row.endDate || (row.expiryYear ? `${parseInt(row.expiryYear)}-12-31` : null);
            ApiService.updateFinancialInsurance(row.id, {
              policy_type: row.policyType,
              cover: parseFloat(row.cover) || 0,
              premium: parseFloat(row.premium) || 0,
              frequency: row.frequency || 'Yearly',
              provider: row.provider,
              policy_number: row.policyNumber,
              start_date: row.startDate || null,
              end_date: endDate,
              notes: row.notes
            }).finally(() => {
              setSavingRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(rowIndex);
                return newSet;
              });
            }).catch(error => console.error('Error updating insurance:', error));
          }
        } else if (row.policyType && row.cover && row.premium && row.id.toString().startsWith('temp_')) {
          // Create new row
          setSavingRows(prev => new Set(prev).add(rowIndex));
          const endDate = row.endDate || (row.expiryYear ? `${parseInt(row.expiryYear)}-12-31` : null);
          ApiService.createFinancialInsurance({
            policy_type: row.policyType,
            cover: parseFloat(row.cover) || 0,
            premium: parseFloat(row.premium) || 0,
            frequency: row.frequency || 'Yearly',
            provider: row.provider,
            policy_number: row.policyNumber,
            start_date: row.startDate || null,
            end_date: endDate,
            notes: row.notes
          }).then(newInsurance => {
            const updatedRowsWithId = [...rows];
            updatedRowsWithId[rowIndex] = { ...row, id: newInsurance.insurance.id };
            setRows(updatedRowsWithId);
          }).finally(() => {
            setSavingRows(prev => {
              const newSet = new Set(prev);
              newSet.delete(rowIndex);
              return newSet;
            });
          }).catch(error => console.error('Error creating insurance:', error));
        }
      }, 1000); // 1 second debounce
    } catch (error) {
      console.error('Error in handleCellChange:', error);
    }
  };

  const handleReset = () => {
    loadInsurance();
  };

  const handleExportCsv = () => {
    const headers = ['Policy Type', 'Cover Amt.', 'Premium', 'Frequency', 'Provider', 'Policy No.', 'Start Date', 'End Date', 'Notes'];
    const csvRows = rows.map(row => ([
      row.policyType || '',
      row.cover ?? '',
      row.premium ?? '',
      row.frequency || '',
      row.provider || '',
      row.policyNumber || '',
      row.startDate || '',
      row.endDate || '',
      row.notes || ''
    ]));
    const content = [headers, ...csvRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `insurance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate summary statistics
  const totalCover = rows.reduce((sum, policy) => sum + (parseFloat(policy.cover) || 0), 0);
  const totalAnnualPremium = rows.reduce((sum, policy) => {
    const premium = parseFloat(policy.premium) || 0;
    const frequency = policy.frequency || 'Yearly';
    
    // Convert to annual premium
    let annualPremium = premium;
    if (frequency === 'Monthly') annualPremium = premium * 12;
    else if (frequency === 'Quarterly') annualPremium = premium * 4;
    
    return sum + annualPremium;
  }, 0);
  
  // Calculate uncovered insurance
  const uncoveredInsurance = Math.max(0, insuranceNeeded - totalCover);

  const columns = [
    { field: 'policyType', headerName: 'Policy Type' },
    { field: 'cover', headerName: 'Cover Amount', type: 'number' },
    { field: 'premium', headerName: 'Premium', type: 'number' },
    { field: 'frequency', headerName: 'Frequency' },
    { field: 'provider', headerName: 'Provider' },
    { field: 'policyNumber', headerName: 'Policy No.' },
    { field: 'startDate', headerName: 'Start Date', type: 'date' },
    { field: 'endDate', headerName: 'End Date', type: 'date' },
    { field: 'notes', headerName: 'Notes' }
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading insurance...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="lifemap-page-header">
        <div>
          <h1 className="lifemap-page-title">Insurance</h1>
          <p className="lifemap-page-subtitle flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            Add or edit your insurance policies and coverage
          </p>
        </div>
        {rows.length === 0 && (
          <div className="lifemap-alert">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Start adding your policies in the insurance register below. You may add as many
              policies as you want.
            </span>
          </div>
        )}
      </div>

      {/* Insurance Calculation Section */}
      <div className="lifemap-panel">
        <div className="lifemap-panel-header">
          <div className="lifemap-panel-title">Insurance Calculation</div>
          {insuranceNeeded > 0 && (
            <div className="text-xs bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full text-red-600 dark:text-red-400">
              Insurance Needed: {formatCurrency(insuranceNeeded)}
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Assets Column */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Existing Assets</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  + {formatCurrency(calculations.totalExistingAssets)}
                </span>
              </div>
              
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Total</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    + {formatCurrency(calculations.totalExistingAssets)}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Insurance Cover</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalCover)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Uncovered Amount</span>
                <span className={`text-lg font-bold ${uncoveredInsurance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatCurrency(uncoveredInsurance)}
                </span>
              </div>
            </div>

            {/* Liabilities Column */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Existing Liabilities</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  - {formatCurrency(calculations.totalExistingLiabilities)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Future Expense</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  - {formatCurrency(calculations.totalFutureExpenses)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Cumulative Financial Goal</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  - {formatCurrency(calculations.totalFinancialGoals)}
                </span>
              </div>
              
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Total</span>
                  <span className="text-xl font-bold text-red-600 dark:text-red-400">
                    - {formatCurrency(calculations.totalExistingLiabilities + calculations.totalFutureExpenses + calculations.totalFinancialGoals)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Insurance Policies Section */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Insurance Policies</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your insurance policies and coverage</p>
        </div>
        <div className="lifemap-stat-grid">
          <div className="lifemap-stat-card">
            <p className="lifemap-stat-title">Total Coverage</p>
            <div className="lifemap-stat-value text-blue-600 dark:text-blue-400">
              {formatCurrency(totalCover)}
            </div>
          </div>
          <div className="lifemap-stat-card">
            <p className="lifemap-stat-title">Annual Premiums</p>
            <div className="lifemap-stat-value text-blue-600 dark:text-blue-400">
              {formatCurrency(totalAnnualPremium)}
            </div>
          </div>
        </div>
      </div>

      <div className="lifemap-panel">
        <div className="lifemap-panel-header">
          <div className="lifemap-panel-title">Insurance Policies</div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={addRow}>Add Row</Button>
            <Button size="sm" variant="outline" onClick={handleExportCsv}>Export CSV</Button>
            <Button size="sm" variant="ghost" className="text-red-500 dark:text-red-400" onClick={handleReset}>Reset</Button>
          </div>
        </div>
        <div className="p-6">
          <EditableGrid 
            columns={columns} 
            rows={rows} 
            onChange={setRows} 
            onAdd={addRow} 
            onDelete={delRow}
            onCellChange={handleCellChange}
          />
        </div>
      </div>

      {savingRows.size > 0 && (
        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
          Saving changes...
        </div>
      )}
    </div>
  );
}
