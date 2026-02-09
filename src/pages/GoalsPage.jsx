
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Target } from 'lucide-react';
import EditableGrid from '@/components/EditableGrid.jsx';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import GoalsChart from '@/components/GoalsChart.jsx';

export default function GoalsPage() {
  const { user, isAuthenticated } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingRows, setSavingRows] = useState(new Set()); // Track which rows are being saved

  // Event dispatching for live chart updates (following WorkAssetsPage pattern)
  const dispatchGoalsEvent = (updatedGoals) => {
    try {
      const payload = Array.isArray(updatedGoals) ? updatedGoals.map(g => ({ ...g })) : [];
      window.dispatchEvent(new CustomEvent('goalsUpdated', { detail: { goals: payload } }));
    } catch (e) {
      console.warn('Failed to dispatch goalsUpdated event:', e);
    }
  };

  // Load goals from database
  useEffect(() => {
    if (isAuthenticated && user) {
      loadGoals();
    }
  }, [isAuthenticated, user]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      for (let i = 0; i < 100; i++) {
        clearTimeout(window[`row_${i}`]);
      }
    };
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getFinancialGoals(user.id);
      console.log('🎯 Goals response:', response);
      
      // Handle the response format - backend returns { goals: [...] }
      const goals = response.goals || response || [];
      console.log('🎯 Goals array:', goals);
      setRows(goals);
      
      // Dispatch event for live chart updates (following WorkAssetsPage pattern)
      dispatchGoalsEvent(goals);
    } catch (error) {
      console.error('Error loading goals:', error);
      setRows([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const newRow = { 
      id: `temp_${Date.now()}`, 
      description: '', 
      amount: 0, 
      targetYear: new Date().getFullYear() + 35 // Default to 35 years from now
    };
    setRows([...rows, newRow]);
  };

  const delRow = async (idx) => {
    const row = rows[idx];
    const updatedRows = rows.filter((_, i) => i !== idx);
    
    if (row.id && !row.id.toString().startsWith('temp_')) {
      try {
        await ApiService.deleteFinancialGoal(row.id);
      } catch (error) {
        console.error('Error deleting goal:', error);
      }
    }
    
    setRows(updatedRows);
    
    // Dispatch event for live chart updates (following WorkAssetsPage pattern)
    dispatchGoalsEvent(updatedRows);
  };

  const handleCellChange = (rowIndex, field, value) => {
    try {
      const updatedRows = [...rows];
      updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
      setRows(updatedRows);

      // Dispatch event for live chart updates (following WorkAssetsPage pattern)
      dispatchGoalsEvent(updatedRows);

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
          // Update existing row - only if we have both description and amount
          if (row.description && row.amount) {
            setSavingRows(prev => new Set(prev).add(rowIndex));
            ApiService.updateFinancialGoal(row.id, {
              name: row.description,
              target_amount: parseFloat(row.amount) || 0,
              target_year: parseInt(row.targetYear) || (new Date().getFullYear() + 35)
            }).finally(() => {
              setSavingRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(rowIndex);
                return newSet;
              });
            }).catch(error => console.error('Error updating goal:', error));
          }
        } else if (row.description && row.amount && row.id.toString().startsWith('temp_')) {
          // Create new row - only for temp rows with both description and amount
          setSavingRows(prev => new Set(prev).add(rowIndex));
          ApiService.createFinancialGoal({
            name: row.description,
            target_amount: parseFloat(row.amount) || 0,
            target_year: parseInt(row.targetYear) || (new Date().getFullYear() + 35)
          }).then(newGoal => {
            // Update the row with the new ID
            const updatedRowsWithId = [...rows];
            updatedRowsWithId[rowIndex] = { ...row, id: newGoal.id };
            setRows(updatedRowsWithId);
          }).finally(() => {
            setSavingRows(prev => {
              const newSet = new Set(prev);
              newSet.delete(rowIndex);
              return newSet;
            });
          }).catch(error => console.error('Error creating goal:', error));
        }
      }, 1000); // 1 second debounce
    } catch (error) {
      console.error('Error in handleCellChange:', error);
    }
  };

  const columns = [{ field:'description', headerName:'Goal' }, { field:'amount', headerName:'Target Amount', type:'number' }, { field:'targetYear', headerName:'Target Year', type:'number' }];

  // Debug logging
  console.log('GoalsPage render - loading:', loading, 'rows:', rows, 'columns:', columns);

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
    <div className="space-y-6">
      <div className="lifemap-page-header">
        <div>
          <h1 className="lifemap-page-title">Goals</h1>
          <p className="lifemap-page-subtitle flex items-center gap-2">
            <Target className="h-4 w-4 text-slate-400" />
            Add or edit your goals
          </p>
        </div>
        <div className="lifemap-alert">
          <AlertTriangle className="h-4 w-4" />
          <span>
            Start adding your first goal in the goal register below. You may add as many
            goals as you want.
          </span>
        </div>
      </div>

      <GoalsChart />
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
        <div className="p-4 text-gray-500">Loading goals...</div>
      )}
    </div>
  );
}
