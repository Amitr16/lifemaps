
import React, { useEffect, useState } from 'react';
import EditableGrid from '@/components/EditableGrid.jsx';
import { useAuth } from '../contexts/AuthContext';
import { useLifeSheetStore } from '../store/enhanced-store';
import ApiService from '../services/api';
import UnifiedChart from '@/components/UnifiedChart.jsx';

export default function WorkAssetsPage() {
  const { user, isAuthenticated } = useAuth();
  const { lifeSheet } = useLifeSheetStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Get current age from the store (same as main page)
  const currentAge = parseInt(lifeSheet.age) || 30;

  // Load work assets from database
  useEffect(() => {
    if (isAuthenticated && user) {
      loadWorkAssets();
    }
  }, [isAuthenticated, user]);

  const loadWorkAssets = async () => {
    try {
      setLoading(true);
      const workAssets = await ApiService.getWorkAssets(user.id);
      console.log('🔍 Work assets from API:', workAssets);
      setRows(workAssets);
    } catch (error) {
      console.error('Error loading work assets:', error);
    } finally {
      setLoading(false);
    }
  };


  const addRow = () => {
    const newRow = { 
      id: `temp_${Date.now()}`, 
      stream: '', 
      amount: 0, 
      growthRate: 3, // This will be treated as 3% in the calculation
      endAge: Math.max(currentAge + 10, 65) // Ensure end age is at least 10 years from current age
    };
    setRows([...rows, newRow]);
  };

  const delRow = async (idx) => {
    const row = rows[idx];
    if (row.id && !row.id.toString().startsWith('temp_')) {
      try {
        await ApiService.deleteWorkAsset(row.id);
      } catch (error) {
        console.error('Error deleting work asset:', error);
      }
    }
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleCellChange = async (rowIndex, field, value) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
    setRows(updatedRows);

    const row = updatedRows[rowIndex];
    
    // Auto-save to database
    try {
      if (row.id && !row.id.toString().startsWith('temp_')) {
        // Update existing row
        await ApiService.updateWorkAsset(row.id, {
          stream: row.stream,
          amount: parseFloat(row.amount) || 0,
          growthRate: parseFloat(row.growthRate) || 0,
          endAge: parseInt(row.endAge) || 65
        });
      } else if (row.stream && row.amount) {
        // Create new row
        const newAsset = await ApiService.createWorkAsset({
          stream: row.stream,
          amount: parseFloat(row.amount) || 0,
          growthRate: parseFloat(row.growthRate) || 3,
          endAge: parseInt(row.endAge) || 65
        });
        
        // Update the row with the new ID
        updatedRows[rowIndex] = { ...row, id: newAsset.id };
        setRows(updatedRows);
      }
    } catch (error) {
      console.error('Error saving work asset:', error);
    }
  };


  const columns = [
    { field:'stream', headerName:'Income Stream' }, 
    { field:'amount', headerName:'Annual Amount', type:'number' },
    { field:'growthRate', headerName:'Growth Rate %', type:'number' },
    { field:'endAge', headerName:'End Age', type:'number' }
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
      <UnifiedChart defaultEnabled={['workAssets']} />
      
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Work Assets</h1>
      </div>
      <EditableGrid 
        columns={columns} 
        rows={rows} 
        onChange={setRows} 
        onAdd={addRow} 
        onDelete={delRow}
        onCellChange={handleCellChange}
      />
    </div>
  );
}
