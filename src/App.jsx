import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ChartProvider } from './contexts/ChartContext'
import Shell from './components/Shell.jsx'
import MockupHost from './components/MockupHost.jsx'
import GoalsPage from './pages/GoalsPage.jsx'
import InsurancePage from './pages/InsurancePage.jsx'
import GrowthAssumptionsPage from './pages/GrowthAssumptionsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SuperAdminPage from './pages/SuperAdminPage.jsx'
import SuperAdminLoginPage from './pages/SuperAdminLoginPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import AdminLoginPage from './pages/AdminLoginPage.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { Toaster } from './components/ui/sonner.jsx'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChartProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/" element={<MockupHost page="fp" />} />
                <Route path="/assets" element={<MockupHost page="assets" />} />
                <Route path="/work-assets" element={<MockupHost page="work" />} />
                <Route path="/goals" element={<MockupHost page="goals" />} />
                <Route path="/loans" element={<MockupHost page="loans" />} />
                <Route path="/expenses" element={<MockupHost page="expenses" />} />
                <Route path="/goals-original" element={
                  <Shell>
                    <ErrorBoundary>
                      <GoalsPage />
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
              <Toaster />
            </div>
          </Router>
        </ChartProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

