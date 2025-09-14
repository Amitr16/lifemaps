import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useLifeSheetStore } from '../store/enhanced-store'

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
  const { isAuthenticated, user } = useAuth()
  const { lifeSheet, assets, loans, expenses, goals } = useLifeSheetStore()

  // Calculate chart data using the same logic as the main page
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

      // Calculate annual expenses and EMI
      const annualExpense = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
      const totalEmi = loans.reduce((sum, loan) => sum + (parseFloat(loan.emi) || 0), 0)

      const data = []
      const currentYear = new Date().getFullYear()
      let cumulativeEarnings = 0

      for (let year = 0; year <= (lifespan - age); year++) {
        // Add annual earnings only for active years
        if (year < workTenure) {
          cumulativeEarnings += currentIncome || 0
        }
        
        // Asset value for this year (same calculation as main page)
        const assetValue = (parseFloat(assetsValue) || 0) + cumulativeEarnings - ((annualExpense + totalEmi) * year)
        
        data.push({
          year: currentYear + year,
          age: age + year,
          asset: Math.round(assetValue),
          netWorth: Math.round(assetValue), // For floating chart compatibility
          assets: Math.round(assetValue),
          liabilities: 0 // Simplified for now
        })
      }

      setChartData(data)
    } catch (error) {
      console.error('Error calculating chart data:', error)
      setChartData([])
    }
  }, [isAuthenticated, user, lifeSheet, assets, loans, expenses, goals])

  // Recalculate when store data changes
  useEffect(() => {
    calculateChartData()
  }, [calculateChartData])

  const toggleChart = () => {
    setIsChartVisible(prev => !prev)
  }

  const closeChart = () => {
    setIsChartVisible(false)
  }

  const value = {
    isChartVisible,
    chartData,
    toggleChart,
    closeChart
  }

  return (
    <ChartContext.Provider value={value}>
      {children}
    </ChartContext.Provider>
  )
}
