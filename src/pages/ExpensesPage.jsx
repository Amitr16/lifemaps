
import React, { useEffect, useState } from 'react';
import EditableGrid from '@/components/EditableGrid.jsx';
import ExpensesChart from '@/components/ExpensesChart.jsx';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/api';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRows, setSavingRows] = useState(new Set());

  // Event dispatching for live chart updates (following WorkAssetsPage pattern)
  const dispatchExpensesEvent = (updatedExpenses) => {
    try {
      const payload = Array.isArray(updatedExpenses) ? updatedExpenses.map(e => ({ ...e })) : [];
      window.dispatchEvent(new CustomEvent('expensesUpdated', { detail: { expenses: payload } }));
    } catch (e) {
      console.warn('Failed to dispatch expensesUpdated event:', e);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadExpenses();
    }
  }, [user?.id]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getFinancialExpenses(user.id);
      const expenses = response.expenses || response || [];
      
      // Map database fields to frontend field names
      const mappedExpenses = expenses.map(expense => ({
        id: expense.id,
        category: expense.category,
        amount: expense.amount,
        frequency: expense.frequency || 'Yearly',
        subcategory: expense.subcategory,
        personal_inflation: expense.personal_inflation || 6,
        source: expense.source,
        notes: expense.notes,
        user_id: expense.user_id,
        created_at: expense.created_at,
        updated_at: expense.updated_at
      }));
      
      setRows(mappedExpenses);
      
      // Dispatch event for live chart updates (following WorkAssetsPage pattern)
      dispatchExpensesEvent(mappedExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const newRow = {
      id: `temp_${Date.now()}`,
      category: '',
      amount: 0,
      frequency: 'Yearly',
      subcategory: '',
      personal_inflation: 6,
      source: '',
      notes: ''
    };
    setRows([...rows, newRow]);
  };

  const delRow = async (rowIndex) => {
    const row = rows[rowIndex];
    
    const updatedRows = rows.filter((_, i) => i !== rowIndex);
    
    if (row.id && !row.id.toString().startsWith('temp_')) {
      try {
        await ApiService.deleteFinancialExpense(row.id);
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
    
    setRows(updatedRows);
    
    // Dispatch event for live chart updates (following WorkAssetsPage pattern)
    dispatchExpensesEvent(updatedRows);
  };

  const handleCellChange = (rowIndex, field, value) => {
    try {
      const updatedRows = [...rows];
      updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
      setRows(updatedRows);

      // Dispatch event for live chart updates (following WorkAssetsPage pattern)
      dispatchExpensesEvent(updatedRows);

      const row = updatedRows[rowIndex];
      
      // Debounce auto-save
      const timeoutKey = `expense_row_${rowIndex}`;
      clearTimeout(window[timeoutKey]);
      
      window[timeoutKey] = setTimeout(() => {
        if (savingRows.has(rowIndex)) {
          return;
        }
        
        if (row.id && !row.id.toString().startsWith('temp_')) {
          // Update existing row
          if (row.category && row.amount) {
            setSavingRows(prev => new Set(prev).add(rowIndex));
            ApiService.updateFinancialExpense(row.id, {
              category: row.category,
              amount: parseFloat(row.amount) || 0,
              frequency: row.frequency || 'Yearly',
              subcategory: row.subcategory,
              personal_inflation: parseFloat(row.personal_inflation) / 100 || 0.06,
              source: row.source,
              notes: row.notes
            }).finally(() => {
              setSavingRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(rowIndex);
                return newSet;
              });
            }).catch(error => console.error('Error updating expense:', error));
          }
        } else if (row.category && row.amount && row.id.toString().startsWith('temp_')) {
          // Create new row
          setSavingRows(prev => new Set(prev).add(rowIndex));
          ApiService.createFinancialExpense({
            category: row.category,
            amount: parseFloat(row.amount) || 0,
            frequency: row.frequency || 'Yearly',
            subcategory: row.subcategory,
            personal_inflation: parseFloat(row.personal_inflation) / 100 || 0.06,
            source: row.source,
            notes: row.notes
          }).then(newExpense => {
            const updatedRowsWithId = [...rows];
            updatedRowsWithId[rowIndex] = { ...row, id: newExpense.expense.id };
            setRows(updatedRowsWithId);
          }).finally(() => {
            setSavingRows(prev => {
              const newSet = new Set(prev);
              newSet.delete(rowIndex);
              return newSet;
            });
          }).catch(error => console.error('Error creating expense:', error));
        }
      }, 1000); // 1 second debounce
    } catch (error) {
      console.error('Error in handleCellChange:', error);
    }
  };

  // Calculate summary statistics
  const totalAnnualExpenses = rows.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount) || 0;
    const frequency = expense.frequency || 'Yearly';
    
    // Convert to annual amount
    let annualAmount = amount;
    if (frequency === 'Monthly') annualAmount = amount * 12;
    else if (frequency === 'Quarterly') annualAmount = amount * 4;
    
    return sum + annualAmount;
  }, 0);

  const columns = [
    { field: 'category', headerName: 'Category' },
    { field: 'amount', headerName: 'Amount', type: 'number' },
    { field: 'frequency', headerName: 'Frequency' },
    { field: 'subcategory', headerName: 'Subcategory' },
    { field: 'personal_inflation', headerName: 'Inflation %', type: 'number' },
    { field: 'source', headerName: 'Source' },
    { field: 'notes', headerName: 'Notes' }
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading expenses...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <ExpensesChart />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-gray-600">Track your recurring expenses and their growth</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-red-600">
            ₹{totalAnnualExpenses.toLocaleString('en-IN')}
          </div>
          <p className="text-sm text-gray-500">Total Annual Expenses</p>
        </div>
      </div>

      <EditableGrid 
        columns={columns} 
        rows={rows} 
        onChange={setRows} 
        onAdd={addRow} 
        onDelete={delRow}
        onCellChange={handleCellChange}
      />

      {savingRows.size > 0 && (
        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
          Saving changes...
        </div>
      )}
    </div>
  );
}
