import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator, 
  PiggyBank, 
  Briefcase, 
  Target, 
  CreditCard, 
  ShoppingCart, 
  Shield, 
  Users,
  TrendingUp
} from 'lucide-react'
import FloatingChartDock, { ChartToggleButton } from './FloatingChartDock'
import { useChart } from '../contexts/ChartContext'

const navigationItems = [
  { path: '/', label: 'Life Sheet', icon: Calculator },
  { path: '/assets', label: 'Assets', icon: PiggyBank },
  { path: '/work-assets', label: 'Work Assets', icon: Briefcase },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/loans', label: 'Loans', icon: CreditCard },
  { path: '/expenses', label: 'Expenses', icon: ShoppingCart },
  { path: '/insurance', label: 'Insurance', icon: Shield },
]

export default function Shell({ children }) {
  const location = useLocation()
  const { isChartVisible, chartData, closeChart, toggleChart } = useChart()
  
  // Only show chart on non-main pages
  const isMainPage = location.pathname === '/'
  const shouldShowChart = !isMainPage && isChartVisible

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Life Sheet</h1>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={`flex items-center gap-2 ${
                        isActive 
                          ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="px-4 py-2">
          <div className="grid grid-cols-4 gap-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`w-full flex flex-col items-center gap-1 h-auto py-2 ${
                      isActive 
                        ? "bg-emerald-500 text-white" 
                        : "text-gray-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Floating Chart Dock - Only on non-main pages */}
      {shouldShowChart && (
        <FloatingChartDock
          data={chartData}
          isVisible={shouldShowChart}
          onClose={closeChart}
          title="Life Sheet — Net Worth (real terms)"
        />
      )}

      {/* Chart Toggle Button - Only on non-main pages when chart is hidden */}
      {!isMainPage && !isChartVisible && (
        <ChartToggleButton onClick={toggleChart} />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              © 2025 Life Sheet. Financial planning made simple.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                v2.0 Enhanced
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

