import React, { useEffect } from 'react'
import EnhancedDataGrid, { loanColumnDefs } from '@/components/EnhancedDataGrid.jsx'
import GlobalGraphDock from '@/components/GlobalGraphDock.jsx'
import { useLifeSheetStore } from '@/store/enhanced-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export default function LoansPage() {
  const {
    loans,
    addLoan,
    updateLoan,
    deleteLoan,
    loadFromLocalStorage
  } = useLifeSheetStore()

  useEffect(() => {
    loadFromLocalStorage()
  }, [loadFromLocalStorage])

  const handleDataChange = (updatedData) => {
    // Update each loan that has changed
    updatedData.forEach((loan, index) => {
      const originalLoan = loans[index]
      if (originalLoan && JSON.stringify(loan) !== JSON.stringify(originalLoan)) {
        updateLoan(loan.id, loan)
      }
    })
  }

  const handleAddRow = () => {
    addLoan({
      lender: 'New Lender',
      type: 'Personal',
      startDate: '',
      endDate: '',
      principalOutstanding: 0,
      rate: 0,
      emi: 0,
      emiDay: 1,
      prepayAllowed: true,
      notes: ''
    })
  }

  const handleDeleteRow = (loan) => {
    if (loan.id) {
      deleteLoan(loan.id)
    }
  }

  // Calculate summary statistics
  const totalPrincipal = loans.reduce((sum, loan) => sum + (loan.principalOutstanding || 0), 0)
  const totalEMI = loans.reduce((sum, loan) => sum + (loan.emi || 0), 0)
  const averageRate = loans.length > 0 ? 
    loans.reduce((sum, loan) => sum + (loan.rate || 0), 0) / loans.length : 0

  // Calculate loan progress (simplified)
  const loansWithProgress = loans.map(loan => {
    const startDate = loan.startDate ? new Date(loan.startDate) : new Date()
    const endDate = loan.endDate ? new Date(loan.endDate) : new Date()
    const totalDuration = endDate.getTime() - startDate.getTime()
    const elapsed = Date.now() - startDate.getTime()
    const progress = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0
    
    return {
      ...loan,
      progress: Math.round(progress)
    }
  })

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <GlobalGraphDock />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loans</h1>
          <p className="text-gray-600">Manage your loan portfolio and EMI schedules</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            Total Outstanding: ₹{totalPrincipal.toLocaleString('en-IN')}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{totalPrincipal.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-gray-500">{loans.length} loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly EMI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹{totalEMI.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-gray-500">Total monthly outflow</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {averageRate.toFixed(2)}%
            </div>
            <p className="text-xs text-gray-500">Weighted average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Annual Outflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ₹{(totalEMI * 12).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-gray-500">EMI × 12 months</p>
          </CardContent>
        </Card>
      </div>

      {/* Loan Progress */}
      {loansWithProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Loan Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loansWithProgress.map((loan, index) => (
                <div key={loan.id || index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{loan.lender}</span>
                    <span className="text-sm text-gray-500">{loan.progress}% complete</span>
                  </div>
                  <Progress value={loan.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>₹{(loan.principalOutstanding || 0).toLocaleString('en-IN')} outstanding</span>
                    <span>EMI: ₹{(loan.emi || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Data Grid */}
      <EnhancedDataGrid
        data={loans}
        columnDefs={loanColumnDefs}
        onDataChange={handleDataChange}
        onAddRow={handleAddRow}
        onDeleteRow={handleDeleteRow}
        title="Loan Register"
        enableFiltering={true}
        enableSorting={true}
        enableExport={true}
      />

      {/* Important Note */}
      <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
        <p>
          <strong>Note:</strong> EMI payments are automatically excluded from your Expenses module 
          to avoid double counting. Loan EMIs are tracked separately here and included in your 
          financial projections.
        </p>
      </div>

      {/* Back-link info */}
      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p>
          <strong>Back-link:</strong> This view is connected to the "Total Existing Liabilities" 
          metric in your Life Sheet. Changes here will instantly update your financial projections.
        </p>
      </div>
    </div>
  )
}

