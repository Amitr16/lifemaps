import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { TrendingUp, TrendingDown, Calculator, Target, DollarSign, PiggyBank, User, LogOut, Save, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { useLifeSheetStore } from '@/store/enhanced-store'
import GlobalGraphDock from '@/components/GlobalGraphDock.jsx'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import AuthModal from './AuthModal'

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

export default function EnhancedLifeSheet() {
  const { user, logout, isAuthenticated } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  const {
    lifeSheet,
    chartData,
    assets,
    loans,
    expenses,
    goals,
    updateLifeSheet,
    loadFromLocalStorage,
    saveToLocalStorage,
    recalculateAll
  } = useLifeSheetStore()

  useEffect(() => {
    loadFromLocalStorage()
    recalculateAll()
  }, [loadFromLocalStorage, recalculateAll])

  // Auto-save functionality
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      saveToLocalStorage()
      setSaveStatus('Saved')
      setTimeout(() => setSaveStatus(''), 2000)
    }, 1000)

    return () => clearTimeout(saveTimer)
  }, [lifeSheet, saveToLocalStorage])

  const handleInputChange = (field, value) => {
    updateLifeSheet({ [field]: value })
  }

  const addGoal = () => {
    const newGoal = {
      name: `Goal ${goals.length + 1}`,
      targetAmount: 0,
      targetDate: '',
      term: 'LT'
    }
    // This would be handled by the store
  }

  const addExpense = () => {
    const newExpense = {
      category: 'New Category',
      amount: 0,
      frequency: 'Monthly'
    }
    // This would be handled by the store
  }

  const addLoan = () => {
    const newLoan = {
      lender: 'New Lender',
      principalOutstanding: 0,
      emi: 0
    }
    // This would be handled by the store
  }

  // Calculate totals from store data
  const totalAssets = assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0)
  const totalLiabilities = loans.reduce((sum, loan) => sum + (loan.principalOutstanding || 0), 0)
  const totalGoals = goals.reduce((sum, goal) => sum + (goal.targetAmount || 0), 0)
  const annualExpenses = expenses.reduce((sum, expense) => {
    const multiplier = expense.frequency === 'Monthly' ? 12 : 
                     expense.frequency === 'Quarterly' ? 4 :
                     expense.frequency === 'Yearly' ? 1 : 12
    return sum + (expense.amount || 0) * multiplier
  }, 0)

  // Calculate human capital
  const currentIncome = parseFloat(lifeSheet.currentAnnualGrossIncome || 0)
  const yearsToRetirement = 35 // Default
  const growthRate = 0.06
  let totalHumanCapital = 0
  for (let year = 0; year < yearsToRetirement; year++) {
    totalHumanCapital += currentIncome * Math.pow(1 + growthRate, year)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalGraphDock />
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Calculator className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Life Sheet</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {saveStatus && (
              <Badge variant="outline" className="text-green-600">
                {saveStatus}
              </Badge>
            )}
            
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
                <Button onClick={logout} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowAuthModal(true)} variant="default">
                <User className="h-4 w-4 mr-1" />
                Login / Register
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Warning for non-authenticated users */}
      {!isAuthenticated && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4 rounded">
          <p className="text-yellow-700">
            You are not logged in. You can use the calculator, but your data will not be saved unless you log in.
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Financial Information Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Age */}
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter your age"
                    value={lifeSheet.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                  />
                </div>

                {/* Income and Tenure */}
                <div className="space-y-2">
                  <Label>Current Annual Gross Income & Work Tenure</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Rs. XX,XXX"
                      value={lifeSheet.currentAnnualGrossIncome}
                      onChange={(e) => handleInputChange('currentAnnualGrossIncome', e.target.value)}
                    />
                    <Input
                      placeholder="XX years"
                      value={lifeSheet.workTenureYears}
                      onChange={(e) => handleInputChange('workTenureYears', e.target.value)}
                    />
                  </div>
                </div>

                {/* Total Asset Value */}
                <div className="space-y-2">
                  <Label htmlFor="assets">Total Asset Gross Market Value</Label>
                  <Input
                    id="assets"
                    placeholder="Enter your Gross Market Value"
                    value={totalAssets || lifeSheet.totalAssetGrossMarketValue}
                    onChange={(e) => handleInputChange('totalAssetGrossMarketValue', e.target.value)}
                    className="bg-gray-50"
                    readOnly
                  />
                  <p className="text-xs text-gray-500">
                    Calculated from Assets module: {assets.length} assets
                  </p>
                </div>

                {/* Outstanding Loans */}
                <div className="space-y-2">
                  <Label>Outstanding Loans</Label>
                  <div className="space-y-2">
                    <Input
                      value={formatCurrency(totalLiabilities)}
                      readOnly
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">
                      Calculated from Loans module: {loans.length} loans
                    </p>
                    <Button onClick={addLoan} variant="outline" size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Loan
                    </Button>
                  </div>
                </div>

                {/* Financial Goals */}
                <div className="space-y-2">
                  <Label>Specific Financial Goals</Label>
                  <div className="space-y-2">
                    <Input
                      value={formatCurrency(totalGoals)}
                      readOnly
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">
                      Total from Goals module: {goals.length} goals
                    </p>
                    <Button onClick={addGoal} variant="outline" size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Goal
                    </Button>
                  </div>
                </div>

                {/* Annual Expenses */}
                <div className="space-y-2">
                  <Label>All Inclusive Annual Expenses</Label>
                  <div className="space-y-2">
                    <Input
                      value={formatCurrency(annualExpenses)}
                      readOnly
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">
                      Calculated from Expenses module: {expenses.length} expenses
                    </p>
                    <Button onClick={addExpense} variant="outline" size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Expense
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Life Sheet Summary */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <PiggyBank className="h-5 w-5" />
                    Life Sheet
                  </CardTitle>
                  <Badge variant="secondary">Surplus: ₹0</Badge>
                </div>
              </CardHeader>
              <CardContent>
                
                {/* Summary Grid */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Existing Assets</span>
                      <span className="font-semibold text-green-600">+ {formatCurrency(totalAssets)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Human Capital</span>
                      <span className="font-semibold text-green-600">+ {formatCurrency(totalHumanCapital)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm font-medium">Total</span>
                      <span className="font-bold text-green-600">+ {formatCurrency(totalAssets + totalHumanCapital)}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Existing Liabilities</span>
                      <span className="font-semibold text-red-600">- {formatCurrency(totalLiabilities)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Future Expense</span>
                      <span className="font-semibold text-red-600">- {formatCurrency(annualExpenses * 20)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cumulative Financial Goal</span>
                      <span className="font-semibold text-red-600">- {formatCurrency(totalGoals)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm font-medium">Total</span>
                      <span className="font-bold text-red-600">- {formatCurrency(totalLiabilities + (annualExpenses * 20) + totalGoals)}</span>
                    </div>
                  </div>
                </div>

                {/* Chart Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Graph Heading</span>
                  </div>
                  
                  {chartData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.slice(-10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis tickFormatter={formatCurrency} />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Bar dataKey="asset" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Enter your financial information to see projections</p>
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  )
}

