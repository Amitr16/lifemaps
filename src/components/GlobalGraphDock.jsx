import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Minimize2, 
  Maximize2, 
  X, 
  Settings,
  Eye,
  EyeOff,
  Target,
  Calendar
} from 'lucide-react'
import { useLifeSheetStore } from '@/store/enhanced-store'

const formatCurrency = (value) => {
  if (value >= 10000000) { // 1 Crore
    return `₹${(value / 10000000).toFixed(1)}Cr`
  } else if (value >= 100000) { // 1 Lakh
    return `₹${(value / 100000).toFixed(1)}L`
  } else if (value >= 1000) { // 1 Thousand
    return `₹${(value / 1000).toFixed(1)}K`
  } else {
    return `₹${value.toFixed(0)}`
  }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-semibold">{`Year: ${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {`${entry.name}: ${formatCurrency(entry.value)}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function GlobalGraphDock() {
  const {
    chartData,
    ui,
    goals,
    loans,
    toggleGraphDock,
    setGraphDockPosition
  } = useLifeSheetStore()

  const [isMinimized, setIsMinimized] = useState(false)
  const [visibleSeries, setVisibleSeries] = useState({
    netWorth: true,
    assets: false,
    liabilities: false,
    cashFlow: false
  })
  const [chartType, setChartType] = useState('line') // 'line' or 'bar'

  // Calculate additional series data
  const enhancedChartData = chartData.map(point => {
    const assets = point.asset > 0 ? point.asset : 0
    const liabilities = 0 // Calculate from loans if needed
    const cashFlow = 0 // Calculate cash flow if needed
    
    return {
      ...point,
      assets,
      liabilities,
      cashFlow,
      netWorth: point.asset
    }
  })

  // Get goal markers
  const goalMarkers = goals.map(goal => {
    const targetYear = goal.targetDate ? new Date(goal.targetDate).getFullYear() : null
    return {
      year: targetYear,
      name: goal.name,
      amount: goal.targetAmount,
      type: 'goal'
    }
  }).filter(marker => marker.year)

  // Get loan end markers
  const loanMarkers = loans.map(loan => {
    const endYear = loan.endDate ? new Date(loan.endDate).getFullYear() : null
    return {
      year: endYear,
      name: `${loan.lender} Loan End`,
      amount: 0,
      type: 'loan'
    }
  }).filter(marker => marker.year)

  const allMarkers = [...goalMarkers, ...loanMarkers]

  const toggleSeries = (series) => {
    setVisibleSeries(prev => ({
      ...prev,
      [series]: !prev[series]
    }))
  }

  if (!ui.graphDockVisible) {
    return (
      <Button
        onClick={toggleGraphDock}
        className="fixed top-4 right-4 z-50"
        size="sm"
        variant="outline"
      >
        <TrendingUp className="h-4 w-4" />
      </Button>
    )
  }

  const dockClasses = `fixed z-40 bg-white border rounded-lg shadow-lg transition-all duration-300 ${
    ui.graphDockPosition === 'top-right' ? 'top-4 right-4' :
    ui.graphDockPosition === 'top-left' ? 'top-4 left-4' :
    ui.graphDockPosition === 'bottom-right' ? 'bottom-4 right-4' :
    'bottom-4 left-4'
  } ${isMinimized ? 'w-80 h-16' : 'w-96 h-80'}`

  return (
    <Card className={dockClasses}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Life Sheet — Net Worth (real terms)
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setIsMinimized(!isMinimized)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            <Button
              onClick={toggleGraphDock}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {!isMinimized && (
          <div className="flex items-center gap-2 mt-2">
            {/* Series toggles */}
            <Button
              onClick={() => toggleSeries('netWorth')}
              size="sm"
              variant={visibleSeries.netWorth ? "default" : "outline"}
              className="h-6 text-xs"
            >
              Net Worth
            </Button>
            <Button
              onClick={() => toggleSeries('assets')}
              size="sm"
              variant={visibleSeries.assets ? "default" : "outline"}
              className="h-6 text-xs"
            >
              Assets
            </Button>
            <Button
              onClick={() => toggleSeries('liabilities')}
              size="sm"
              variant={visibleSeries.liabilities ? "default" : "outline"}
              className="h-6 text-xs"
            >
              Liabilities
            </Button>
          </div>
        )}
      </CardHeader>

      {!isMinimized && (
        <CardContent className="pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={enhancedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {visibleSeries.netWorth && (
                    <Line
                      type="monotone"
                      dataKey="netWorth"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      name="Net Worth"
                    />
                  )}
                  
                  {visibleSeries.assets && (
                    <Line
                      type="monotone"
                      dataKey="assets"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                      name="Assets"
                    />
                  )}
                  
                  {visibleSeries.liabilities && (
                    <Line
                      type="monotone"
                      dataKey="liabilities"
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={false}
                      name="Liabilities"
                    />
                  )}

                  {/* Goal markers */}
                  {allMarkers.map((marker, index) => (
                    <Line
                      key={`marker-${index}`}
                      type="monotone"
                      dataKey={() => marker.amount}
                      stroke={marker.type === 'goal' ? '#f59e0b' : '#8b5cf6'}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name={marker.name}
                    />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={enhancedChartData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {visibleSeries.netWorth && (
                    <Bar dataKey="netWorth" fill="#2563eb" name="Net Worth" />
                  )}
                  
                  {visibleSeries.assets && (
                    <Bar dataKey="assets" fill="#16a34a" name="Assets" />
                  )}
                  
                  {visibleSeries.liabilities && (
                    <Bar dataKey="liabilities" fill="#dc2626" name="Liabilities" />
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Quick stats */}
          <div className="flex justify-between items-center mt-2 text-xs">
            <div className="flex gap-2">
              {enhancedChartData.length > 0 && (
                <>
                  <Badge variant="outline" className="text-xs">
                    Current: {formatCurrency(enhancedChartData[0]?.netWorth || 0)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Peak: {formatCurrency(Math.max(...enhancedChartData.map(d => d.netWorth || 0)))}
                  </Badge>
                </>
              )}
            </div>
            
            <div className="flex gap-1">
              {goalMarkers.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Target className="h-2 w-2 mr-1" />
                  {goalMarkers.length} Goals
                </Badge>
              )}
              {loanMarkers.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Calendar className="h-2 w-2 mr-1" />
                  {loanMarkers.length} Loans
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Hook for real-time updates
export const useGraphDockUpdates = () => {
  const { chartData, recalculateAll } = useLifeSheetStore()
  
  useEffect(() => {
    // Recalculate when component mounts
    recalculateAll()
  }, [recalculateAll])

  return { chartData }
}

