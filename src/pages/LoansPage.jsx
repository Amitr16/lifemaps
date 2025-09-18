import React, { useEffect, useState } from 'react'
import EditableGrid from '@/components/EditableGrid.jsx'
import { useAuth } from '../contexts/AuthContext'
import ApiService from '../services/api'
import LoansChart from '@/components/LoansChart.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function LoansPage() {
  const { user, isAuthenticated } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingRows, setSavingRows] = useState(new Set());

  // Event dispatching for live chart updates (following WorkAssetsPage pattern)
  const dispatchLoansEvent = (updatedLoans) => {
    try {
      const payload = Array.isArray(updatedLoans) ? updatedLoans.map(l => ({ ...l })) : [];
      window.dispatchEvent(new CustomEvent('loansUpdated', { detail: { loans: payload } }));
    } catch (e) {
      console.warn('Failed to dispatch loansUpdated event:', e);
    }
  };

  // Load loans from database
  useEffect(() => {
    if (isAuthenticated && user) {
      loadLoans();
    }
  }, [isAuthenticated, user]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getFinancialLoans(user.id);
      console.log('💰 Loans response:', response);
      
      // Handle the response format - backend returns { loans: [...] }
      const loans = response.loans || response || [];
      console.log('💰 Loans array:', loans);
      console.log('💰 First loan loanExpiry:', loans[0]?.loanExpiry);
      console.log('💰 First loan end_date from DB:', loans[0]?.end_date);
      setRows(loans);
      
      // Dispatch event for live chart updates (following WorkAssetsPage pattern)
      dispatchLoansEvent(loans);
    } catch (error) {
      console.error('Error loading loans:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const newRow = { 
      id: `temp_${Date.now()}`, 
      provider: '', 
      amount: 0, 
      interestRate: 0, 
      emi: 0, 
      frequency: 'Monthly',
      loanExpiry: new Date().getFullYear() + 35 // Default to 35 years from now
    };
    setRows([...rows, newRow]);
  };

  const delRow = async (idx) => {
    const row = rows[idx];
    if (row.id && !row.id.toString().startsWith('temp_')) {
      try {
        await ApiService.deleteFinancialLoan(row.id);
      } catch (error) {
        console.error('Error deleting loan:', error);
      }
    }
    const updatedRows = rows.filter((_, i) => i !== idx);
    setRows(updatedRows);
    
    // Dispatch event for live chart updates (following WorkAssetsPage pattern)
    dispatchLoansEvent(updatedRows);
  };

  const handleCellChange = (rowIndex, field, value) => {
    try {
      const updatedRows = [...rows];
      updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
      setRows(updatedRows);

      // Dispatch event for live chart updates (following WorkAssetsPage pattern)
      dispatchLoansEvent(updatedRows);

      const row = updatedRows[rowIndex];
      
      // Clear any existing timeout for this row
      const timeoutKey = `row_${rowIndex}`;
      clearTimeout(window[timeoutKey]);
      
      // Set a new timeout for auto-save (debounce)
      window[timeoutKey] = setTimeout(() => {
        // Check if row is already being saved
        if (savingRows.has(rowIndex)) {
          return;
        }
        
        // Auto-save to database
        if (row.id && !row.id.toString().startsWith('temp_')) {
          // Update existing row - only if we have both provider and amount
          if (row.provider && row.amount) {
            setSavingRows(prev => new Set(prev).add(rowIndex));
            const endDate = row.loanExpiry ? `${parseInt(row.loanExpiry)}-12-31` : null;
            console.log('💾 Saving loan with expiry:', { loanExpiry: row.loanExpiry, endDate });
            
            ApiService.updateFinancialLoan(row.id, {
              lender: row.provider,
              principal_outstanding: parseFloat(row.amount) || 0,
              rate: parseFloat(row.interestRate) || 0,
              emi: parseFloat(row.emi) || 0,
              end_date: endDate
            }).finally(() => {
              setSavingRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(rowIndex);
                return newSet;
              });
            }).catch(error => console.error('Error updating loan:', error));
          }
        } else if (row.provider && row.amount && row.id.toString().startsWith('temp_')) {
          // Create new row - only for temp rows with both provider and amount
          setSavingRows(prev => new Set(prev).add(rowIndex));
          const endDate = row.loanExpiry ? `${parseInt(row.loanExpiry)}-12-31` : null;
          console.log('💾 Creating loan with expiry:', { loanExpiry: row.loanExpiry, endDate });
          
          ApiService.createFinancialLoan({
            lender: row.provider,
            type: 'Personal',
            principal_outstanding: parseFloat(row.amount) || 0,
            rate: parseFloat(row.interestRate) || 0,
            emi: parseFloat(row.emi) || 0,
            start_date: new Date().toISOString().split('T')[0],
            end_date: endDate
          }).then(newLoan => {
            // Update the row with the new ID
            const updatedRowsWithId = [...rows];
            updatedRowsWithId[rowIndex] = { ...row, id: newLoan.id };
            setRows(updatedRowsWithId);
          }).finally(() => {
            setSavingRows(prev => {
              const newSet = new Set(prev);
              newSet.delete(rowIndex);
              return newSet;
            });
          }).catch(error => console.error('Error creating loan:', error));
        }
      }, 1000); // 1 second debounce
    } catch (error) {
      console.error('Error in handleCellChange:', error);
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      for (let i = 0; i < 100; i++) {
        clearTimeout(window[`row_${i}`]);
      }
    };
  }, []);

  // Calculate summary statistics
  const totalPrincipal = rows.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0)
  const totalEMI = rows.reduce((sum, loan) => sum + (parseFloat(loan.emi) || 0), 0)
  // Calculate weighted average interest rate based on loan amounts
  const averageRate = (() => {
    if (rows.length === 0) return 0;
    
    const totalWeightedRate = rows.reduce((sum, loan) => {
      const amount = parseFloat(loan.amount) || 0;
      const rate = parseFloat(loan.interestRate) || 0;
      return sum + (amount * rate);
    }, 0);
    
    const totalAmount = rows.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
    
    return totalAmount > 0 ? totalWeightedRate / totalAmount : 0;
  })()

  const columns = [
    { field: 'provider', headerName: 'Provider' },
    { field: 'amount', headerName: 'Amount', type: 'number' },
    { field: 'interestRate', headerName: 'Interest Rate %', type: 'number' },
    { field: 'emi', headerName: 'EMI', type: 'number' },
    { field: 'frequency', headerName: 'Frequency' },
    { field: 'loanExpiry', headerName: 'Loan Expiry', type: 'number' }
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <LoansChart />
      
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
            <p className="text-xs text-gray-500">{rows.length} loans</p>
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

      {/* Loan Register */}
      {columns && Array.isArray(columns) && rows && Array.isArray(rows) ? (
        <div>
          <EditableGrid 
            columns={columns} 
            rows={rows} 
            onChange={setRows} 
            onAdd={addRow} 
            onDelete={delRow}
            onCellChange={handleCellChange}
          />
          {savingRows.size > 0 && (
            <div className="mt-2 text-sm text-blue-600">
              Saving {savingRows.size} row(s)...
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-gray-500">Loading loans...</div>
      )}

      {/* Important Note */}
      <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
        <p>
          <strong>Note:</strong> EMI payments are automatically excluded from your Expenses module 
          to avoid double counting. Loan EMIs are tracked separately here and included in your 
          financial projections.
        </p>
      </div>
    </div>
  )
}

