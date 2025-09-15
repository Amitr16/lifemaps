
import React, { useEffect, useState } from 'react';
import EditableGrid from '@/components/EditableGrid.jsx';
import UnifiedChart from '@/components/UnifiedChart.jsx';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/api';

export default function InsurancePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRows, setSavingRows] = useState(new Set());

  useEffect(() => {
    if (user?.id) {
      loadInsurance();
    }
  }, [user?.id]);

  const loadInsurance = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getFinancialInsurance(user.id);
      const insurance = response.insurance || response || [];
      
      // Map database fields to frontend field names
      const mappedInsurance = insurance.map(policy => ({
        id: policy.id,
        policyType: policy.policy_type,
        cover: policy.cover,
        premium: policy.premium,
        frequency: policy.frequency || 'Yearly',
        provider: policy.provider,
        policyNumber: policy.policy_number,
        startDate: policy.start_date,
        endDate: policy.end_date,
        notes: policy.notes,
        user_id: policy.user_id,
        created_at: policy.created_at,
        updated_at: policy.updated_at
      }));
      
      setRows(mappedInsurance);
    } catch (error) {
      console.error('Error loading insurance:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const newRow = {
      id: `temp_${Date.now()}`,
      policyType: '',
      cover: 0,
      premium: 0,
      frequency: 'Yearly',
      provider: '',
      policyNumber: '',
      startDate: '',
      endDate: '',
      notes: ''
    };
    setRows([...rows, newRow]);
  };

  const delRow = async (rowIndex) => {
    const row = rows[rowIndex];
    
    if (row.id && !row.id.toString().startsWith('temp_')) {
      try {
        await ApiService.deleteFinancialInsurance(row.id);
        setRows(rows.filter((_, i) => i !== rowIndex));
      } catch (error) {
        console.error('Error deleting insurance:', error);
      }
    } else {
      setRows(rows.filter((_, i) => i !== rowIndex));
    }
  };

  const handleCellChange = (rowIndex, field, value) => {
    try {
      const updatedRows = [...rows];
      updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
      setRows(updatedRows);

      const row = updatedRows[rowIndex];
      
      // Debounce auto-save
      const timeoutKey = `insurance_row_${rowIndex}`;
      clearTimeout(window[timeoutKey]);
      
      window[timeoutKey] = setTimeout(() => {
        if (savingRows.has(rowIndex)) {
          return;
        }
        
        if (row.id && !row.id.toString().startsWith('temp_')) {
          // Update existing row
          if (row.policyType && row.cover && row.premium) {
            setSavingRows(prev => new Set(prev).add(rowIndex));
            ApiService.updateFinancialInsurance(row.id, {
              policy_type: row.policyType,
              cover: parseFloat(row.cover) || 0,
              premium: parseFloat(row.premium) || 0,
              frequency: row.frequency || 'Yearly',
              provider: row.provider,
              policy_number: row.policyNumber,
              start_date: row.startDate,
              end_date: row.endDate,
              notes: row.notes
            }).finally(() => {
              setSavingRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(rowIndex);
                return newSet;
              });
            }).catch(error => console.error('Error updating insurance:', error));
          }
        } else if (row.policyType && row.cover && row.premium && row.id.toString().startsWith('temp_')) {
          // Create new row
          setSavingRows(prev => new Set(prev).add(rowIndex));
          ApiService.createFinancialInsurance({
            policy_type: row.policyType,
            cover: parseFloat(row.cover) || 0,
            premium: parseFloat(row.premium) || 0,
            frequency: row.frequency || 'Yearly',
            provider: row.provider,
            policy_number: row.policyNumber,
            start_date: row.startDate,
            end_date: row.endDate,
            notes: row.notes
          }).then(newInsurance => {
            const updatedRowsWithId = [...rows];
            updatedRowsWithId[rowIndex] = { ...row, id: newInsurance.insurance.id };
            setRows(updatedRowsWithId);
          }).finally(() => {
            setSavingRows(prev => {
              const newSet = new Set(prev);
              newSet.delete(rowIndex);
              return newSet;
            });
          }).catch(error => console.error('Error creating insurance:', error));
        }
      }, 1000); // 1 second debounce
    } catch (error) {
      console.error('Error in handleCellChange:', error);
    }
  };

  // Calculate summary statistics
  const totalCover = rows.reduce((sum, policy) => sum + (parseFloat(policy.cover) || 0), 0);
  const totalAnnualPremium = rows.reduce((sum, policy) => {
    const premium = parseFloat(policy.premium) || 0;
    const frequency = policy.frequency || 'Yearly';
    
    // Convert to annual premium
    let annualPremium = premium;
    if (frequency === 'Monthly') annualPremium = premium * 12;
    else if (frequency === 'Quarterly') annualPremium = premium * 4;
    
    return sum + annualPremium;
  }, 0);

  const columns = [
    { field: 'policyType', headerName: 'Policy Type' },
    { field: 'cover', headerName: 'Cover Amount', type: 'number' },
    { field: 'premium', headerName: 'Premium', type: 'number' },
    { field: 'frequency', headerName: 'Frequency' },
    { field: 'provider', headerName: 'Provider' },
    { field: 'policyNumber', headerName: 'Policy Number' },
    { field: 'startDate', headerName: 'Start Date', type: 'date' },
    { field: 'endDate', headerName: 'End Date', type: 'date' },
    { field: 'notes', headerName: 'Notes' }
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading insurance...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <UnifiedChart defaultSelections={['Insurance']} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insurance</h1>
          <p className="text-gray-600">Manage your insurance policies and coverage</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            ₹{totalCover.toLocaleString('en-IN')}
          </div>
          <p className="text-sm text-gray-500">Total Coverage</p>
          <div className="text-lg font-semibold text-green-600">
            ₹{totalAnnualPremium.toLocaleString('en-IN')}
          </div>
          <p className="text-sm text-gray-500">Annual Premiums</p>
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
