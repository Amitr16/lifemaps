import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useLifeSheetStore } from '../store/enhanced-store'
import ApiService from '../services/api'

const ChartContext = createContext()

export const useChart = () => {
  const context = useContext(ChartContext)
  if (!context) {
    throw new Error('useChart must be used within a ChartProvider')
  }
  return context
}

export const ChartProvider = ({ children }) => {
  const [isChartVisible, setIsChartVisible] = useState(false)
  const [chartData, setChartData] = useState([])
  const [workAssets, setWorkAssets] = useState([])
  const { isAuthenticated, user } = useAuth()
  const { lifeSheet, assets, loans, expenses, goals, setLoans, setExpenses, setGoals } = useLifeSheetStore()

  // Load work assets
  const loadWorkAssets = useCallback(async () => {
    if (!isAuthenticated || !user) return
    
    try {
      const workAssetsData = await ApiService.getWorkAssets(user.id)
      setWorkAssets(workAssetsData)
    } catch (error) {
      console.error('Error loading work assets for chart:', error)
    }
  }, [isAuthenticated, user])

  // Calculate chart data using the exact logic from the main page
  const calculateChartData = useCallback(() => {
    if (!isAuthenticated || !user) {
      setChartData([])
      return
    }

    try {
      const age = parseInt(lifeSheet.age) || 0
      const currentIncome = parseFloat(lifeSheet.currentAnnualGrossIncome) || 0
      const workTenure = parseInt(lifeSheet.workTenureYears) || 0
      const assetsValue = parseFloat(lifeSheet.totalAssetGrossMarketValue) || 0
      const lifespan = parseInt(lifeSheet.lifespanYears) || 85
      const growthRate = parseFloat(lifeSheet.incomeGrowthRate) || 0.06

      if (age === 0) {
        setChartData([])
        return
      }

      // Calculate annual expenses and EMI (exactly as specified)
      const annualExpense = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
      const totalEmi = loans.reduce((sum, loan) => sum + (parseFloat(loan.emi) || 0), 0)

      const data = []
      const currentYear = new Date().getFullYear()
      let cumulativeEarnings = 0

      // Generate chart data for each year until lifespan (exactly as specified)
      for (let year = 0; year <= (lifespan - age); year++) {
        // Add annual earnings only while working (exactly as specified)
        if (year < workTenure) {
          cumulativeEarnings += currentIncome || 0
        }
        
        // Asset value calculation (exactly as specified):
        // assetValue = initialAssets + cumulativeEarnings - (annualExpense + totalEmi) * year
        const assetValue = (parseFloat(assetsValue) || 0) + cumulativeEarnings - ((annualExpense + totalEmi) * year)
        
        data.push({
          year: currentYear + year,
          age: age + year,
          asset: Math.round(assetValue)
        })
      }

      setChartData(data)
    } catch (error) {
      console.error('Error calculating chart data:', error)
      setChartData([])
    }
  }, [isAuthenticated, user, lifeSheet, assets, loans, expenses, goals, workAssets])

  // Calculate financial metrics (exactly as specified)
  const calculateFinancials = useCallback(() => {
    if (!isAuthenticated || !user) {
      return {
        totalExistingAssets: 0,
        totalHumanCapital: 0,
        totalFutureExpenses: 0,
        totalFinancialGoals: 0,
        totalExistingLiabilities: 0,
        currentNetworth: 0,
        surplusDeficit: 0
      }
    }

    try {
      const age = parseInt(lifeSheet.age) || 0
      const currentIncome = parseFloat(lifeSheet.currentAnnualGrossIncome) || 0
      const workTenure = parseInt(lifeSheet.workTenureYears) || 0
      const assetsValue = parseFloat(lifeSheet.totalAssetGrossMarketValue) || 0
      const lifespan = parseInt(lifeSheet.lifespanYears) || 85

      // Total Human Capital: currentIncome * workTenure
      const totalHumanCapital = currentIncome * workTenure

      // Total Future Expenses: (sum(expense.amount) + sum(loan.emi)) * (lifespan - age)
      const annualExpense = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
      const annualEmi = loans.reduce((sum, loan) => sum + (parseFloat(loan.emi) || 0), 0)
      const totalFutureExpenses = (annualExpense + annualEmi) * (lifespan - age)

      // Total Financial Goals: sum(goal.amount)
      const totalFinancialGoals = goals.reduce((sum, goal) => sum + (parseFloat(goal.amount) || 0), 0)

      // Total Existing Assets: starts from totalAssetGrossMarketValue
      const totalExistingAssets = assetsValue

      // Total Existing Liabilities: sum of loan amounts
      const totalExistingLiabilities = loans.reduce((sum, loan) => sum + (parseFloat(loan.principal_outstanding) || 0), 0)

      // Current Networth: assets - liabilities
      const currentNetworth = totalExistingAssets - totalExistingLiabilities

      // Surplus/Deficit: (assets + humanCapital) - (liabilities + futureExpenses + goals)
      const surplusDeficit = (totalExistingAssets + totalHumanCapital) - (totalExistingLiabilities + totalFutureExpenses + totalFinancialGoals)

      return {
        totalExistingAssets,
        totalHumanCapital,
        totalFutureExpenses,
        totalFinancialGoals,
        totalExistingLiabilities,
        currentNetworth,
        surplusDeficit
      }
    } catch (error) {
      console.error('Error calculating financials:', error)
      return {
        totalExistingAssets: 0,
        totalHumanCapital: 0,
        totalFutureExpenses: 0,
        totalFinancialGoals: 0,
        totalExistingLiabilities: 0,
        currentNetworth: 0,
        surplusDeficit: 0
      }
    }
  }, [isAuthenticated, user, lifeSheet, expenses, goals, loans])

  // Load work assets when user changes
  useEffect(() => {
    loadWorkAssets()
  }, [loadWorkAssets])

  // Recalculate when store data changes
  useEffect(() => {
    calculateChartData()
  }, [calculateChartData])

  // Listen for updates from other pages
  useEffect(() => {
    const handleLoansUpdated = (event) => {
      console.log('🔍 ChartContext received loansUpdated event:', event.detail)
      if (event.detail?.loans) {
        setLoans(event.detail.loans)
      }
    }

    const handleExpensesUpdated = (event) => {
      console.log('🔍 ChartContext received expensesUpdated event:', event.detail)
      if (event.detail?.expenses) {
        setExpenses(event.detail.expenses)
      }
    }

    const handleGoalsUpdated = (event) => {
      console.log('🔍 ChartContext received goalsUpdated event:', event.detail)
      if (event.detail?.goals) {
        setGoals(event.detail.goals)
      }
    }

    window.addEventListener('loansUpdated', handleLoansUpdated)
    window.addEventListener('expensesUpdated', handleExpensesUpdated)
    window.addEventListener('goalsUpdated', handleGoalsUpdated)

    return () => {
      window.removeEventListener('loansUpdated', handleLoansUpdated)
      window.removeEventListener('expensesUpdated', handleExpensesUpdated)
      window.removeEventListener('goalsUpdated', handleGoalsUpdated)
    }
  }, [])

  const toggleChart = () => {
    setIsChartVisible(prev => !prev)
  }

  const closeChart = () => {
    setIsChartVisible(false)
  }

  const value = {
    isChartVisible,
    chartData,
    calculateFinancials,
    toggleChart,
    closeChart
  }

  return (
    <ChartContext.Provider value={value}>
      {children}
    </ChartContext.Provider>
  )
}
