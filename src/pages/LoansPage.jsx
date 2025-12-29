import React, { useEffect, useState } from 'react'
import EditableGrid from '@/components/EditableGrid.jsx'
import { useAuth } from '../contexts/AuthContext'
import { useAdminUser } from '../contexts/AdminUserContext'
import { useLifeSheetStore } from '../store/enhanced-store'
import ApiService from '../services/api'
import LoansChart from '@/components/LoansChart.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function LoansPage() {
  const { user, isAuthenticated } = useAuth();
  const adminUser = useAdminUser();
  const { setDetailEmi, setSourcePreference } = useLifeSheetStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingRows, setSavingRows] = useState(new Set());
  
  // Determine if we're in admin mode and get the correct userId
  const isAdminMode = !!adminUser?.userId;
  const userId = isAdminMode ? adminUser.userId : (user?.id || null);

  // Event dispatching for live chart updates (following WorkAssetsPage pattern)
  const dispatchLoansEvent = (updatedLoans) => {
    try {
      const payload = Array.isArray(updatedLoans) ? updatedLoans.map(l => ({ ...l })) : [];
      window.dispatchEvent(new CustomEvent('loansUpdated', { detail: { loans: payload } }));
    } catch (e) {
      console.warn('Failed to dispatch loansUpdated event:', e);
    }
  };

  // Calculate EMI time series and update store
  const updateStoreWithEmiTimeSeries = (loansData) => {
    console.log('🔄 Loans: updateStoreWithEmiTimeSeries called with loans:', loansData.length);
    try {
      const currentYear = new Date().getFullYear();
      const emiSeries = {};
      
      // For each year, calculate total EMI payments
      for (let yearOffset = 0; yearOffset <= 50; yearOffset++) {
        const year = currentYear + yearOffset;
        let totalEmi = 0;
        
        loansData.forEach(loan => {
          const principal = parseFloat(loan.amount) || 0;
          const emi = parseFloat(loan.emi) || 0;
          const loanExpiry = parseInt(loan.loanExpiry) || 0;
          
          console.log('🔄 Loans: Processing loan:', { 
            provider: loan.provider, 
            emi, 
            loanExpiry, 
            year, 
            yearOffset 
          });
          
          // Only include EMI if the loan is still active (before expiry year)
          if (loanExpiry > 0 && year <= loanExpiry && emi > 0) {
            totalEmi += emi * 12; // Convert monthly EMI to annual
            console.log('🔄 Loans: Adding EMI for year', year, ':', emi * 12);
          }
        });
        
        emiSeries[year] = totalEmi;
      }
      
      console.log('🔄 Loans: Calculated EMI series for first 5 years:', 
        Object.keys(emiSeries).slice(0, 5).map(y => [y, emiSeries[y]]));
      
      // Update store with detailed EMI data
      setDetailEmi(emiSeries);
      // Set source preference to detailed (1) when Loans data is calculated
      setSourcePreference('loans', 1, { isAdminMode, userId: effectiveUserId });
      console.log('🔄 Loans: setDetailEmi called successfully');
      console.log('🔄 Loans: Source preference set to detailed (1)');
      
    } catch (error) {
      console.error('❌ Error updating store with EMI time series:', error);
    }
  };

  // Load loans from database
  useEffect(() => {
    if (userId) {
      loadLoans();
    }
  }, [userId]);

  const loadLoans = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = isAdminMode 
        ? await ApiService.getFinancialLoansForUser(userId)
        : await ApiService.getFinancialLoans(userId);
      console.log('💰 Loans response:', response);
      
      // Handle the response format - backend returns { loans: [...] }
      const loans = response.loans || response || [];
      console.log('💰 Loans array:', loans);
      console.log('💰 First loan loanExpiry:', loans[0]?.loanExpiry);
      console.log('💰 First loan end_date from DB:', loans[0]?.end_date);
      setRows(loans);
      
      // Dispatch event for live chart updates (following WorkAssetsPage pattern)
      dispatchLoansEvent(loans);
      
      // Update store with detailed EMI time series
      updateStoreWithEmiTimeSeries(loans);
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
        if (isAdminMode) {
          await ApiService.deleteFinancialLoanForUser(row.id, userId);
        } else {
          await ApiService.deleteFinancialLoan(row.id);
        }
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
      
      // Update store with detailed EMI time series
      updateStoreWithEmiTimeSeries(updatedRows);

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
            
            const updatePromise = isAdminMode
              ? ApiService.updateFinancialLoanForUser(row.id, {
                  lender: row.provider,
                  principal_outstanding: parseFloat(row.amount) || 0,
                  rate: parseFloat(row.interestRate) || 0,
                  emi: parseFloat(row.emi) || 0,
                  end_date: endDate
                }, userId)
              : ApiService.updateFinancialLoan(row.id, {
                  lender: row.provider,
                  principal_outstanding: parseFloat(row.amount) || 0,
                  rate: parseFloat(row.interestRate) || 0,
                  emi: parseFloat(row.emi) || 0,
                  end_date: endDate
                });
            
            updatePromise.finally(() => {
              setSavingRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(rowIndex);
                return newSet;
              });
            }).catch(error => console.error('Error updating loan:', error));
          }
        } else if (row.provider && row.amount && row.emi && row.id && row.id.toString().startsWith('temp_')) {
          // Create new row - only for temp rows with both provider and amount
          setSavingRows(prev => new Set(prev).add(rowIndex));
          const endDate = row.loanExpiry ? `${parseInt(row.loanExpiry)}-12-31` : null;
          console.log('💾 Creating loan with expiry:', { loanExpiry: row.loanExpiry, endDate });
          
          const loanPayload = {
            lender: row.provider,
            type: 'Personal',
            principal_outstanding: parseFloat(row.amount) || 0,
            rate: parseFloat(row.interestRate) || 0,
            emi: parseFloat(row.emi) || 0,
            start_date: new Date().toISOString().split('T')[0],
            end_date: endDate
          };
          
          console.log('💾 Creating loan with payload:', loanPayload);
          console.log('💾 Row data:', { 
            provider: row.provider, 
            amount: row.amount, 
            interestRate: row.interestRate, 
            emi: row.emi 
          });
          
          const createPromise = isAdminMode
            ? ApiService.createFinancialLoanForUser(loanPayload, userId)
            : ApiService.createFinancialLoan(loanPayload);
          
          createPromise.then(response => {
            const newLoan = response.loan || response;
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
      <LoansChart loans={rows} />
      
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

