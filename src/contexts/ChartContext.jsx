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
  const { lifeSheet, assets, loans, expenses, goals } = useLifeSheetStore()

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

      // Calculate work assets income for each year
      const calculateWorkAssetsIncome = (year) => {
        let totalIncome = 0
        workAssets.forEach(asset => {
          const assetAge = age + year
          const endAge = parseInt(asset.endAge) || 65
          if (assetAge <= endAge) {
            const amount = parseFloat(asset.amount) || 0
            const growthRate = parseFloat(asset.growthRate) || 0.03
            totalIncome += amount * Math.pow(1 + growthRate, year)
          }
        })
        return totalIncome
      }

      const data = []
      const currentYear = new Date().getFullYear()
      let cumulativeEarnings = 0

      for (let year = 0; year <= (lifespan - age); year++) {
        // Add annual earnings only for active years
        if (year < workTenure) {
          cumulativeEarnings += currentIncome || 0
        }
        
        // Add work assets income for this year
        const workAssetsIncome = calculateWorkAssetsIncome(year)
        cumulativeEarnings += workAssetsIncome
        
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
  }, [isAuthenticated, user, lifeSheet, assets, loans, expenses, goals, workAssets])

  // Load work assets when user changes
  useEffect(() => {
    loadWorkAssets()
  }, [loadWorkAssets])

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
