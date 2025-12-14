
import React, { useEffect, useState } from 'react';
import EditableGrid from '@/components/EditableGrid.jsx';
import ExpensesChart from '@/components/ExpensesChart.jsx';
import ExpenseCategoriesModal from '@/components/ExpenseCategoriesModal.jsx';
import ExpenseTagSelector from '@/components/ExpenseTagSelector.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { useLifeSheetStore } from '../store/enhanced-store';
import ApiService from '@/services/api';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';

export default function ExpensesPage() {
  const { user } = useAuth();
  const { setDetailExpenses, setSourcePreference } = useLifeSheetStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRows, setSavingRows] = useState(new Set());
  const [classifyingRows, setClassifyingRows] = useState(new Set());
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);

  // Event dispatching for live chart updates (following WorkAssetsPage pattern)
  const dispatchExpensesEvent = (updatedExpenses) => {
    try {
      const payload = Array.isArray(updatedExpenses) ? updatedExpenses.map(e => ({ ...e })) : [];
      window.dispatchEvent(new CustomEvent('expensesUpdated', { detail: { expenses: payload } }));
    } catch (e) {
      console.warn('Failed to dispatch expensesUpdated event:', e);
    }
  };

  // Calculate expenses time series and update store
  const updateStoreWithExpensesTimeSeries = (expensesData) => {
    console.log('🔄 Expenses: updateStoreWithExpensesTimeSeries called with expenses:', expensesData.length);
    try {
      const currentYear = new Date().getFullYear();
      const expensesSeries = {};
      
      // For each year, calculate total expenses with inflation
      for (let yearOffset = 0; yearOffset <= 50; yearOffset++) {
        const year = currentYear + yearOffset;
        let totalExpenses = 0;
        
        expensesData.forEach(expense => {
          const annualAmount = parseFloat(expense.annual_budget) || 0;
          const inflationRate = (parseFloat(expense.personal_inflation) || 6) / 100;
          
          // Apply inflation for each year
          const inflatedAmount = annualAmount * Math.pow(1 + inflationRate, yearOffset);
          totalExpenses += inflatedAmount;
        });
        
        expensesSeries[year] = totalExpenses;
      }
      
      console.log('🔄 Expenses: Calculated expenses series for first 5 years:', 
        Object.keys(expensesSeries).slice(0, 5).map(y => [y, expensesSeries[y]]));
      
      // Update store with detailed expenses data
      setDetailExpenses(expensesSeries);
      // Set source preference to detailed (1) when Expenses data is calculated
      setSourcePreference('expenses', 1);
      console.log('🔄 Expenses: setDetailExpenses called successfully');
      console.log('🔄 Expenses: Source preference set to detailed (1)');
      
    } catch (error) {
      console.error('❌ Error updating store with expenses time series:', error);
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
      const mappedExpenses = expenses.map(expense => {
        const amount = parseFloat(expense.amount) || 0;
        const frequency = expense.frequency || 'Monthly';
        
        // Calculate annual budget based on frequency
        let annualBudget = amount;
        if (frequency === 'Weekly') annualBudget = amount * 52;
        else if (frequency === 'Fortnightly') annualBudget = amount * 26;
        else if (frequency === 'Monthly') annualBudget = amount * 12;
        else if (frequency === 'Quarterly') annualBudget = amount * 4;
        else if (frequency === 'Semi-Annually') annualBudget = amount * 2;
        else if (frequency === 'Annually') annualBudget = amount;
        
        return {
          id: expense.id,
          description: expense.description || '', // Specific Goods/Service
          amount: amount, // Price/Unit
          frequency: frequency, // Expense Frequency
          annual_budget: annualBudget, // Annual Budget (calculated)
          category: expense.category || '',
          subcategory: expense.subcategory || '',
          tag_for: expense.tag_for || '', // For tag
          lifestyle_level: expense.lifestyle_level || '', // Lifestyle level
          payment_from: expense.payment_from || '', // Payment From
          expiry: expense.expiry ? (typeof expense.expiry === 'string' ? parseInt(expense.expiry.split('-')[0]) : expense.expiry.getFullYear()) : '', // Expiry year (like loan expiry)
          source: expense.source,
          user_id: expense.user_id,
          created_at: expense.created_at,
          updated_at: expense.updated_at
        };
      });
      
      setRows(mappedExpenses);
      
      // Dispatch event for live chart updates (following WorkAssetsPage pattern)
      dispatchExpensesEvent(mappedExpenses);
      
      // Update store with detailed expenses time series
      updateStoreWithExpensesTimeSeries(mappedExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const newRow = {
      id: `temp_${Date.now()}`,
      description: '', // Specific Goods/Service
      amount: 0, // Price/Unit
      frequency: 'Monthly', // Expense Frequency
      annual_budget: 0, // Annual Budget (calculated)
      category: '', // Will be auto-classified by LLM
      subcategory: '', // Will be auto-classified by LLM
      tag_for: '', // For tag
      lifestyle_level: '', // Lifestyle level
      payment_from: '', // Payment From
      expiry: '', // Expiry date
      source: ''
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

  // Save row to database (used after classification and on blur)
  const saveRowToDb = async (rowIndex, overrideTags = null) => {
    if (savingRows.has(rowIndex)) {
      return;
    }
    
    // Get current row data from state
    const row = rows[rowIndex];
    if (!row) return;
    
    if (row.id && !row.id.toString().startsWith('temp_')) {
      // Update existing row
      if (row.description && row.amount) {
        setSavingRows(prev => new Set(prev).add(rowIndex));
        
        const updatePayload = {
          description: row.description,
          amount: parseFloat(row.amount) || 0,
          frequency: row.frequency || 'Monthly',
        };
        
        if (row.category && row.category.trim()) {
          updatePayload.category = row.category.trim();
        }
        if (row.subcategory && row.subcategory.trim()) {
          updatePayload.subcategory = row.subcategory.trim();
        }
        
        // Use override tags if provided, otherwise use row values
        if (overrideTags) {
          // Always include tag fields when overrideTags is provided (even if empty to clear them)
          // Send null for empty strings so backend can clear the field
          updatePayload.tag_for = overrideTags.tag_for && overrideTags.tag_for.trim() ? overrideTags.tag_for.trim() : null;
          updatePayload.lifestyle_level = overrideTags.lifestyle_level && overrideTags.lifestyle_level.trim() ? overrideTags.lifestyle_level.trim() : null;
          updatePayload.payment_from = overrideTags.payment_from && overrideTags.payment_from.trim() ? overrideTags.payment_from.trim() : null;
          console.log('💾 Saving with override tags:', updatePayload);
        } else {
          if (row.tag_for && row.tag_for.trim()) {
            updatePayload.tag_for = row.tag_for.trim();
          }
          if (row.lifestyle_level && row.lifestyle_level.trim()) {
            updatePayload.lifestyle_level = row.lifestyle_level.trim();
          }
          if (row.payment_from && row.payment_from.trim()) {
            updatePayload.payment_from = row.payment_from.trim();
          }
        }
        if (row.expiry) {
          // Convert year to date format (YYYY-12-31) like loans
          const expiryYear = typeof row.expiry === 'number' ? row.expiry : parseInt(row.expiry);
          if (!isNaN(expiryYear)) {
            updatePayload.expiry = `${expiryYear}-12-31`;
          }
        }
        if (row.source && row.source.trim()) {
          updatePayload.source = row.source.trim();
        }
        
        try {
          const response = await ApiService.updateFinancialExpense(row.id, updatePayload);
          console.log('✅ Expense updated successfully:', response);
        } catch (error) {
          console.error('❌ Error updating expense:', error);
        } finally {
          setSavingRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(rowIndex);
            return newSet;
          });
        }
      }
    }
    
    if (row.description && row.amount && row.id && row.id.toString().startsWith('temp_')) {
      // Create new row
      setSavingRows(prev => new Set(prev).add(rowIndex));
        
        const createPayload = {
          description: row.description,
          amount: parseFloat(row.amount) || 0,
          frequency: row.frequency || 'Monthly',
          personal_inflation: parseFloat(row.personal_inflation) / 100 || 0.06,
        };
        
        if (row.category && row.category.trim()) {
          createPayload.category = row.category.trim();
        }
        if (row.subcategory && row.subcategory.trim()) {
          createPayload.subcategory = row.subcategory.trim();
        }
        
        // Use override tags if provided, otherwise use row values
        if (overrideTags) {
          // Always include tag fields when overrideTags is provided (even if empty)
          createPayload.tag_for = overrideTags.tag_for ? overrideTags.tag_for.trim() : '';
          createPayload.lifestyle_level = overrideTags.lifestyle_level ? overrideTags.lifestyle_level.trim() : '';
          createPayload.payment_from = overrideTags.payment_from ? overrideTags.payment_from.trim() : '';
        } else {
          if (row.tag_for && row.tag_for.trim()) {
            createPayload.tag_for = row.tag_for.trim();
          }
          if (row.lifestyle_level && row.lifestyle_level.trim()) {
            createPayload.lifestyle_level = row.lifestyle_level.trim();
          }
          if (row.payment_from && row.payment_from.trim()) {
            createPayload.payment_from = row.payment_from.trim();
          }
        }
        if (row.expiry) {
          // Convert year to date format (YYYY-12-31) like loans
          const expiryYear = typeof row.expiry === 'number' ? row.expiry : parseInt(row.expiry);
          if (!isNaN(expiryYear)) {
            createPayload.expiry = `${expiryYear}-12-31`;
          }
        }
        if (row.source && row.source.trim()) {
          createPayload.source = row.source.trim();
        }
        if (row.notes && row.notes.trim()) {
          createPayload.notes = row.notes.trim();
        }
        
        ApiService.createFinancialExpense(createPayload).then(newExpense => {
          setRows(prevRows => {
            const updatedRows = [...prevRows];
            updatedRows[rowIndex] = { ...row, id: newExpense.expense.id };
            return updatedRows;
          });
        }).finally(() => {
          setSavingRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(rowIndex);
            return newSet;
          });
        }).catch(error => console.error('Error creating expense:', error));
    }
  };

  // Handle LLM classification on description blur
  const handleDescriptionBlur = async (row, rowIndex, value, handleCell) => {
    if (!value || !value.trim() || !user?.id) return;
    
    // Skip if already classifying
    if (classifyingRows.has(rowIndex)) return;
    
    // Always classify when description changes (even if category/subcategory already exist)
    // This allows re-classification if user changes the description
    
    try {
      setClassifyingRows(prev => new Set(prev).add(rowIndex));
      
      const result = await ApiService.classifyExpense(value.trim(), user.id);
      
      console.log('Classification result:', result);
      console.log('Current row before update:', rows[rowIndex]);
      console.log('Row index:', rowIndex);
      
      // Use handleCellChange which properly updates state and triggers re-render
      if (result.category && result.subcategory) {
        // Update both fields
        handleCellChange(rowIndex, 'category', result.category);
        handleCellChange(rowIndex, 'subcategory', result.subcategory);
        
        // Save to DB immediately after classification
        setTimeout(() => {
          saveRowToDb(rowIndex);
        }, 200);
      } else if (result.category) {
        handleCellChange(rowIndex, 'category', result.category);
        setTimeout(() => {
          saveRowToDb(rowIndex);
        }, 200);
      } else if (result.subcategory) {
        handleCellChange(rowIndex, 'subcategory', result.subcategory);
        setTimeout(() => {
          saveRowToDb(rowIndex);
        }, 200);
      }
    } catch (error) {
      console.error('Error classifying expense:', error);
      // Don't show error to user, just log it
    } finally {
      setClassifyingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowIndex);
        return newSet;
      });
    }
  };

  const handleCellChange = async (rowIndex, field, value) => {
    try {
      console.log(`handleCellChange: rowIndex=${rowIndex}, field=${field}, value=${value}`);
      
      // Use functional update to avoid stale closure issues - do everything in one call
      setRows(prevRows => {
        const updatedRows = [...prevRows];
        updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
        console.log(`Updated row ${rowIndex}:`, updatedRows[rowIndex]);
        
        // Recalculate annual_budget when amount or frequency changes
        if (field === 'amount' || field === 'frequency') {
          const amount = parseFloat(updatedRows[rowIndex].amount) || 0;
          const frequency = updatedRows[rowIndex].frequency || 'Monthly';
          
          let annualBudget = amount;
          if (frequency === 'Weekly') annualBudget = amount * 52;
          else if (frequency === 'Fortnightly') annualBudget = amount * 26;
          else if (frequency === 'Monthly') annualBudget = amount * 12;
          else if (frequency === 'Quarterly') annualBudget = amount * 4;
          else if (frequency === 'Semi-Annually') annualBudget = amount * 2;
          else if (frequency === 'Annually') annualBudget = amount;
          
          updatedRows[rowIndex].annual_budget = annualBudget;
        }
        
        // Dispatch event for live chart updates (use updatedRows, not prevRows)
        dispatchExpensesEvent(updatedRows);
        
        // Update store with detailed expenses time series (use updatedRows)
        updateStoreWithExpensesTimeSeries(updatedRows);
        
        return updatedRows;
      });

      // Debounce auto-save on blur (like LoansPage pattern)
      const timeoutKey = `expense_row_${rowIndex}`;
      clearTimeout(window[timeoutKey]);
      
      window[timeoutKey] = setTimeout(() => {
        saveRowToDb(rowIndex);
      }, 1000); // 1 second debounce
    } catch (error) {
      console.error('Error in handleCellChange:', error);
    }
  };

  // Calculate summary statistics
  const totalAnnualExpenses = rows.reduce((sum, expense) => {
    return sum + (parseFloat(expense.annual_budget) || 0);
  }, 0);

  const columns = [
    { 
      field: 'description', 
      headerName: 'Specific Goods / Service',
      onBlur: handleDescriptionBlur
    },
    { field: 'amount', headerName: 'Price/Unit', type: 'number' },
    { 
      field: 'frequency', 
      headerName: 'Expense Frequency',
      type: 'select',
      options: ['Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Semi-Annually', 'Annually']
    },
    { field: 'annual_budget', headerName: 'Annual Budget', type: 'number', render: (row) => (
      <span className="font-semibold">₹{parseFloat(row.annual_budget || 0).toLocaleString('en-IN')}</span>
    )},
    { 
      field: 'category', 
      headerName: 'Category',
      render: (row, onChange) => {
        const rowIndex = rows.findIndex(r => r.id === row.id);
        const isClassifying = rowIndex >= 0 && classifyingRows.has(rowIndex);
        return (
          <input
            className={`w-full border rounded px-2 py-1 ${isClassifying ? 'opacity-50 bg-gray-100' : ''}`}
            type="text"
            value={isClassifying ? 'Assigning...' : (row.category || '')}
            onChange={e => onChange(e.target.value)}
            placeholder={isClassifying ? 'Assigning...' : ''}
            disabled={isClassifying}
            onBlur={() => {
              // Trigger auto-save on blur
              if (rowIndex >= 0 && row.category) {
                handleCellChange(rowIndex, 'category', row.category);
              }
            }}
          />
        );
      }
    },
    { 
      field: 'subcategory', 
      headerName: 'Subcategory',
      render: (row, onChange) => {
        const rowIndex = rows.findIndex(r => r.id === row.id);
        const isClassifying = rowIndex >= 0 && classifyingRows.has(rowIndex);
        return (
          <input
            className={`w-full border rounded px-2 py-1 min-w-[120px] ${isClassifying ? 'opacity-50 bg-gray-100' : ''}`}
            type="text"
            value={isClassifying ? 'Assigning...' : (row.subcategory || '')}
            onChange={e => onChange(e.target.value)}
            placeholder={isClassifying ? 'Assigning...' : ''}
            disabled={isClassifying}
            onBlur={() => {
              // Trigger auto-save on blur
              if (rowIndex >= 0 && row.subcategory) {
                handleCellChange(rowIndex, 'subcategory', row.subcategory);
              }
            }}
          />
        );
      }
    },
    { 
      field: 'tags', 
      headerName: 'Tags',
      render: (row, onChange) => {
        const rowIndex = rows.findIndex(r => r.id === row.id);
        const tagValues = {
          'For': row.tag_for || '',
          'Lifestyle Level': row.lifestyle_level || '',
          'Payment From': row.payment_from || ''
        };
        
        return (
          <div className="min-w-[400px]">
            <ExpenseTagSelector
              userId={user?.id}
              values={tagValues}
              onChange={(newTagValues) => {
                // Update each field separately using handleCellChange
                if (rowIndex >= 0) {
                  const newTagFor = newTagValues['For'] || '';
                  const newLifestyleLevel = newTagValues['Lifestyle Level'] || '';
                  const newPaymentFrom = newTagValues['Payment From'] || '';
                  
                  // Update state immediately
                  if (row.tag_for !== newTagFor) {
                    handleCellChange(rowIndex, 'tag_for', newTagFor);
                  }
                  if (row.lifestyle_level !== newLifestyleLevel) {
                    handleCellChange(rowIndex, 'lifestyle_level', newLifestyleLevel);
                  }
                  if (row.payment_from !== newPaymentFrom) {
                    handleCellChange(rowIndex, 'payment_from', newPaymentFrom);
                  }
                  
                  // Also update the row object for EditableGrid
                  onChange({
                    ...row,
                    tag_for: newTagFor,
                    lifestyle_level: newLifestyleLevel,
                    payment_from: newPaymentFrom
                  });
                }
              }}
              onBlur={(currentTagValues) => {
                // Clear any pending debounced saves and save immediately with current tag values
                if (rowIndex >= 0) {
                  console.log('💾 Tag blur - saving tags:', {
                    rowIndex,
                    rowId: row.id,
                    currentTagValues,
                    tag_for: currentTagValues['For'] || '',
                    lifestyle_level: currentTagValues['Lifestyle Level'] || '',
                    payment_from: currentTagValues['Payment From'] || ''
                  });
                  
                  const timeoutKey = `expense_row_${rowIndex}`;
                  clearTimeout(window[timeoutKey]);
                  
                  // Update the row state with current tag values
                  setRows(prevRows => {
                    const updatedRows = [...prevRows];
                    if (updatedRows[rowIndex]) {
                      updatedRows[rowIndex] = {
                        ...updatedRows[rowIndex],
                        tag_for: currentTagValues['For'] || '',
                        lifestyle_level: currentTagValues['Lifestyle Level'] || '',
                        payment_from: currentTagValues['Payment From'] || ''
                      };
                    }
                    return updatedRows;
                  });
                  
                  // Save immediately with override tags to ensure latest values are saved
                  saveRowToDb(rowIndex, {
                    tag_for: currentTagValues['For'] || '',
                    lifestyle_level: currentTagValues['Lifestyle Level'] || '',
                    payment_from: currentTagValues['Payment From'] || ''
                  });
                }
              }}
            />
          </div>
        );
      }
    },
    { 
      field: 'expiry', 
      headerName: 'Expiry',
      type: 'number',
      render: (row, onChange) => {
        const rowIndex = rows.findIndex(r => r.id === row.id);
        return (
          <input
            type="number"
            className="w-full border rounded px-2 py-1"
            placeholder="Year"
            min={new Date().getFullYear()}
            max={new Date().getFullYear() + 100}
            value={row.expiry || ''}
            onChange={e => {
              const newValue = e.target.value ? parseInt(e.target.value) : '';
              onChange(newValue);
              // Update row state immediately
              if (rowIndex >= 0) {
                const updatedRows = [...rows];
                updatedRows[rowIndex] = { ...updatedRows[rowIndex], expiry: newValue };
                setRows(updatedRows);
              }
            }}
            onBlur={() => {
              // Trigger auto-save on blur - convert year to date format (YYYY-12-31)
              if (rowIndex >= 0 && row.expiry) {
                const expiryDate = `${parseInt(row.expiry)}-12-31`;
                handleCellChange(rowIndex, 'expiry', expiryDate);
              }
            }}
          />
        );
      }
    }
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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCategoriesModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Manage Categories
          </Button>
          <div className="text-right">
            <div className="text-2xl font-bold text-red-600">
              ₹{totalAnnualExpenses.toLocaleString('en-IN')}
            </div>
            <p className="text-sm text-gray-500">Total Annual Expenses</p>
          </div>
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

      {user?.id && (
        <ExpenseCategoriesModal
          userId={user.id}
          open={categoriesModalOpen}
          onOpenChange={setCategoriesModalOpen}
        />
      )}
    </div>
  );
}
