import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ChartProvider } from './contexts/ChartContext'
import Shell from './components/Shell.jsx'
import OriginalLifeSheet from './components/OriginalLifeSheet.jsx'
import AssetsPage from './pages/AssetsPage.jsx'
import WorkAssetsPage from './pages/WorkAssetsPage.jsx'
import GoalsPage from './pages/GoalsPage.jsx'
import EnhancedGoalsPage from './pages/EnhancedGoalsPage.jsx'
import LoansPage from './pages/LoansPage.jsx'
import ExpensesPage from './pages/ExpensesPage.jsx'
import InsurancePage from './pages/InsurancePage.jsx'
import GrowthAssumptionsPage from './pages/GrowthAssumptionsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SuperAdminPage from './pages/SuperAdminPage.jsx'
import SuperAdminLoginPage from './pages/SuperAdminLoginPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import AdminLoginPage from './pages/AdminLoginPage.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChartProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Regular User Routes - with Shell navigation */}
                <Route path="/" element={
                  <Shell>
                    <ErrorBoundary>
                      <OriginalLifeSheet />
                    </ErrorBoundary>
                  </Shell>
                } />
                <Route path="/assets" element={
                  <Shell>
                    <AssetsPage />
                  </Shell>
                } />
                <Route path="/work-assets" element={
                  <Shell>
                    <ErrorBoundary>
                      <WorkAssetsPage />
                    </ErrorBoundary>
                  </Shell>
                } />
                <Route path="/goals" element={
                  <Shell>
                    <ErrorBoundary>
                      <EnhancedGoalsPage />
                    </ErrorBoundary>
                  </Shell>
                } />
                <Route path="/goals-original" element={
                  <Shell>
                    <ErrorBoundary>
                      <GoalsPage />
                    </ErrorBoundary>
                  </Shell>
                } />
                <Route path="/loans" element={
                  <Shell>
                    <ErrorBoundary>
                      <LoansPage />
                    </ErrorBoundary>
                  </Shell>
                } />
                <Route path="/expenses" element={
                  <Shell>
                    <ErrorBoundary>
                      <ExpensesPage />
                    </ErrorBoundary>
                  </Shell>
                } />
                <Route path="/insurance" element={
                  <Shell>
                    <ErrorBoundary>
                      <InsurancePage />
                    </ErrorBoundary>
                  </Shell>
                } />
                <Route path="/growth-assumptions" element={
                  <Shell>
                    <ErrorBoundary>
                      <GrowthAssumptionsPage />
                    </ErrorBoundary>
                  </Shell>
                } />
                <Route path="/profile" element={
                  <Shell>
                    <ErrorBoundary>
                      <ProfilePage />
                    </ErrorBoundary>
                  </Shell>
                } />
                {/* Admin Routes - without Shell navigation */}
                <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
                <Route path="/super-admin" element={<SuperAdminPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Routes>
            </div>
          </Router>
        </ChartProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

