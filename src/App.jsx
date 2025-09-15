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
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChartProvider>
          <Router>
            <div className="App">
              <Shell>
                <Routes>
                  <Route path="/" element={
                    <ErrorBoundary>
                      <OriginalLifeSheet />
                    </ErrorBoundary>
                  } />
                  <Route path="/assets" element={<AssetsPage />} />
                  <Route path="/work-assets" element={
                    <ErrorBoundary>
                      <WorkAssetsPage />
                    </ErrorBoundary>
                  } />
                  <Route path="/goals" element={
                    <ErrorBoundary>
                      <EnhancedGoalsPage />
                    </ErrorBoundary>
                  } />
                  <Route path="/goals-original" element={
                    <ErrorBoundary>
                      <GoalsPage />
                    </ErrorBoundary>
                  } />
                  <Route path="/loans" element={
                    <ErrorBoundary>
                      <LoansPage />
                    </ErrorBoundary>
                  } />
                  <Route path="/expenses" element={
                    <ErrorBoundary>
                      <ExpensesPage />
                    </ErrorBoundary>
                  } />
                  <Route path="/insurance" element={
                    <ErrorBoundary>
                      <InsurancePage />
                    </ErrorBoundary>
                  } />
                </Routes>
              </Shell>
            </div>
          </Router>
        </ChartProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

