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
  { path: '/', value: 'dashboard', label: 'FP Calculator', icon: Calculator },
  { path: '/assets', value: 'assets', label: 'Assets', icon: PiggyBank },
  { path: '/work-assets', value: 'work-assets', label: 'Work Assets', icon: Briefcase },
  { path: '/goals', value: 'goals', label: 'Goals', icon: Target },
  { path: '/loans', value: 'loans', label: 'Loans', icon: CreditCard },
  { path: '/expenses', value: 'expenses', label: 'Expenses', icon: ShoppingCart },
  { path: '/insurance', value: 'insurance', label: 'Insurance', icon: Shield },
  { path: '/growth-assumptions', value: 'growth-assumptions', label: 'Growth Assumptions', icon: TrendingUp },
]

export default function Shell({ children, adminMode = false, activeSection, onSectionChange, adminUserName, userName }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, admin, logout, adminLogout } = useAuth()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { isChartVisible, chartData, closeChart, toggleChart } = useChart()
  
  // Only show chart on non-main pages
  const isMainPage = adminMode ? activeSection === 'dashboard' : location.pathname === '/'
  const shouldShowChart = !isMainPage && isChartVisible

  const handleLogout = async () => {
    if (adminMode && admin) {
      await adminLogout()
      window.location.href = 'https://lifemaps-frontend.onrender.com/'
    } else {
      await logout()
      navigate('/')
    }
  }

  // Determine active item based on mode
  const getActiveItem = () => {
    if (adminMode) {
      return activeSection || 'dashboard'
    }
    return location.pathname
  }

  const activePath = getActiveItem()

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
            const isActive = adminMode 
              ? activeSection === item.value
              : location.pathname === item.path

            if (adminMode && onSectionChange) {
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onSectionChange(item.value)}
                  className={`lifemap-nav-item ${isActive ? 'lifemap-nav-item-active' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              )
            }

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
          {!adminMode && (
            <Link to="/profile" className="lifemap-nav-item">
              <UserCircle className="h-4 w-4" />
              <span>Your Profile</span>
            </Link>
          )}
          {adminMode && admin ? (
            <button type="button" className="lifemap-nav-item" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          ) : user ? (
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
            {adminMode && admin ? (
              <div className="lifemap-user">
                <span className="lifemap-user-label">Welcome</span>
                <div className="lifemap-user-name-wrapper">
                  <span className="lifemap-user-name">
                    {admin?.name || admin?.username || 'Admin'}
                  </span>
                </div>
                {userName && (
                  <span className="lifemap-user-label text-xs mt-1 block">Viewing: {userName}</span>
                )}
              </div>
            ) : user ? (
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

