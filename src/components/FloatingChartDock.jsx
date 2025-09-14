import React, { useState, useRef, useEffect } from 'react'
import { X, Minimize2, Maximize2, Move, TrendingUp, BarChart3 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'

export default function FloatingChartDock({ 
  data = [], 
  isVisible = true, 
  onClose, 
  onToggleVisibility,
  title = "Life Sheet — Net Worth (real terms)"
}) {
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 400, height: 300 })
  const [chartType, setChartType] = useState('line') // 'line' or 'bar'
  
  const dockRef = useRef(null)
  const headerRef = useRef(null)

  // Handle dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.dock-header')) {
      setIsDragging(true)
      const rect = dockRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 200
      const maxY = window.innerHeight - 100
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, dragOffset])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 200),
        y: Math.min(prev.y, window.innerHeight - 100)
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Format currency for display
  const formatCurrency = (value) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)}Cr`
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`
    }
    return `₹${value?.toFixed(0) || 0}`
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`Age: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (!isVisible) return null

  return (
    <>
      {/* Floating Chart Dock */}
      <div
        ref={dockRef}
        className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
          width: isMinimized ? 'auto' : size.width,
          height: isMinimized ? 'auto' : size.height,
          minWidth: isMinimized ? '200px' : '350px',
          minHeight: isMinimized ? '50px' : '250px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Header */}
        <div
          ref={headerRef}
          className="dock-header bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 cursor-grab active:cursor-grabbing flex items-center justify-between"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center space-x-2 flex-1">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium text-sm truncate">{title}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Chart Type Toggle */}
            {!isMinimized && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                onClick={() => setChartType(chartType === 'line' ? 'bar' : 'line')}
                title={`Switch to ${chartType === 'line' ? 'bar' : 'line'} chart`}
              >
                {chartType === 'line' ? <BarChart3 className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              </Button>
            )}
            
            {/* Minimize/Maximize */}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </Button>
            
            {/* Close */}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
              onClick={onClose}
              title="Close chart dock"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-4 h-full">
            <div className="h-full">
              {data && data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="age" 
                        stroke="#666"
                        fontSize={12}
                        tickFormatter={(value) => `${value}`}
                      />
                      <YAxis 
                        stroke="#666"
                        fontSize={12}
                        tickFormatter={formatCurrency}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="netWorth" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="assets" 
                        stroke="#059669" 
                        strokeWidth={2}
                        dot={{ fill: '#059669', strokeWidth: 2, r: 3 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="liabilities" 
                        stroke="#dc2626" 
                        strokeWidth={2}
                        dot={{ fill: '#dc2626', strokeWidth: 2, r: 3 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="age" 
                        stroke="#666"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#666"
                        fontSize={12}
                        tickFormatter={formatCurrency}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="netWorth" fill="#2563eb" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Enter financial data to see projections</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resize Handle */}
        {!isMinimized && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400 transition-colors"
            style={{
              background: 'linear-gradient(-45deg, transparent 30%, #d1d5db 30%, #d1d5db 70%, transparent 70%)'
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              const startX = e.clientX
              const startY = e.clientY
              const startWidth = size.width
              const startHeight = size.height

              const handleResize = (e) => {
                const newWidth = Math.max(350, startWidth + (e.clientX - startX))
                const newHeight = Math.max(250, startHeight + (e.clientY - startY))
                setSize({ width: newWidth, height: newHeight })
              }

              const handleResizeEnd = () => {
                document.removeEventListener('mousemove', handleResize)
                document.removeEventListener('mouseup', handleResizeEnd)
                document.body.style.cursor = ''
                document.body.style.userSelect = ''
              }

              document.addEventListener('mousemove', handleResize)
              document.addEventListener('mouseup', handleResizeEnd)
              document.body.style.cursor = 'se-resize'
              document.body.style.userSelect = 'none'
            }}
          />
        )}
      </div>

      {/* Backdrop for dragging */}
      {isDragging && (
        <div className="fixed inset-0 z-40 cursor-grabbing" />
      )}
    </>
  )
}

// Chart Toggle Button Component (for when chart is hidden)
export function ChartToggleButton({ onClick, className = "" }) {
  return (
    <Button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-40 professional-button professional-button-primary rounded-full w-14 h-14 p-0 shadow-lg hover:shadow-xl transition-all ${className}`}
      title="Show Chart Dock"
    >
      <TrendingUp className="w-6 h-6" />
    </Button>
  )
}

