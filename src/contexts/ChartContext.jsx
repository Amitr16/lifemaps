import React, { createContext, useContext, useState } from 'react'
import { useLifeSheetStore } from '../store/enhanced-store'
import { shallow } from 'zustand/shallow'

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
  
  // 👉 single source of truth from the store
  const chartData = useLifeSheetStore(s => s.chartData, shallow)

  // Debug: Log when chartData changes (ChatGPT's verification)
  React.useEffect(() => {
    console.log('ChartContext sees chartData length:', chartData?.length)
    console.log('ChartContext sees chartData sample:', chartData?.slice(0, 3))
  }, [chartData])

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
    closeChart,
  }

  return (
    <ChartContext.Provider value={value}>
      {children}
    </ChartContext.Provider>
  )
}