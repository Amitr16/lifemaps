import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Calculator,
  ChevronDown,
  CreditCard,
  LogOut,
  Moon,
  Sun,
  PiggyBank,
  Shield,
  ShoppingCart,
  Target,
  Briefcase,
  TrendingUp,
  UserCircle
} from 'lucide-react'
import FloatingChartDock, { ChartToggleButton } from './FloatingChartDock'
import { useChart } from '../contexts/ChartContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

const navigationItems = [
  { path: '/', label: 'FP Calculator', icon: Calculator },
  { path: '/assets', label: 'Assets', icon: PiggyBank },
  { path: '/work-assets', label: 'Work Assets', icon: Briefcase },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/loans', label: 'Loans', icon: CreditCard },
  { path: '/expenses', label: 'Expenses', icon: ShoppingCart },
  { path: '/insurance', label: 'Insurance', icon: Shield },
  { path: '/growth-assumptions', label: 'Growth Assumptions', icon: TrendingUp },
]

export default function Shell({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { isChartVisible, chartData, closeChart, toggleChart } = useChart()
  
  // Only show chart on non-main pages
  const isMainPage = location.pathname === '/'
  const shouldShowChart = !isMainPage && isChartVisible

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="lifemap-shell">
      <aside className="lifemap-sidebar">
        <div className="lifemap-logo">
          <div className="lifemap-logo-icon">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <span className="lifemap-logo-text">LifeMap</span>
        </div>

        <nav className="lifemap-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`lifemap-nav-item ${isActive ? 'lifemap-nav-item-active' : ''}`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="lifemap-sidebar-footer">
          <Link to="/profile" className="lifemap-nav-item">
            <UserCircle className="h-4 w-4" />
            <span>Your Profile</span>
          </Link>
          {user ? (
            <button type="button" className="lifemap-nav-item" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          ) : (
            <button
              type="button"
              className="lifemap-nav-item"
              onClick={() => window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'login' } }))}
            >
              <LogOut className="h-4 w-4" />
              <span>Login</span>
            </button>
          )}
        </div>
      </aside>

      <div className="lifemap-main">
        <header className="lifemap-topbar">
          <div className="lifemap-topbar-actions">
            <button
              type="button"
              className="lifemap-toggle"
              data-theme={resolvedTheme || theme || 'light'}
              aria-label="Toggle theme"
              aria-pressed={(resolvedTheme || theme) === 'dark'}
              onClick={() => setTheme((resolvedTheme || theme) === 'dark' ? 'light' : 'dark')}
            >
              <Moon className="h-3 w-3" />
              <Sun className="h-3 w-3" />
              <span className="lifemap-toggle-knob" />
            </button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="lifemap-user cursor-pointer">
                    <span className="lifemap-user-label">Welcome</span>
                    <div className="lifemap-user-name-container">
                      <span className="lifemap-user-name">
                        {user?.name || user?.email || 'User'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-400 ml-1" />
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                      <UserCircle className="h-4 w-4" />
                      <span>Your Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400">
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full bg-blue-600 text-white text-sm px-4 py-2"
                  onClick={() => window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'login' } }))}
                >
                  Login
                </button>
                <button
                  type="button"
                  className="rounded-full bg-blue-100 text-blue-700 text-sm px-4 py-2"
                  onClick={() => window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'register' } }))}
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="lifemap-content">
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

        <footer className="lifemap-footer">
          <div>© 2025 Life Sheet. Financial planning made simple.</div>
          <div className="lifemap-footer-links">
            <span>Terms &amp; Conditions</span>
            <span>|</span>
            <span>Privacy Policy</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

