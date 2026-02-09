import React, { useEffect, useState } from 'react';
import { AlertTriangle, Target } from 'lucide-react';
import EditableGrid from '@/components/EditableGrid.jsx';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import GoalsChart from '@/components/GoalsChart.jsx';
import GoalDonutChart from '@/components/GoalDonutChart.jsx';
import LinkedAssetsEditor from '@/components/LinkedAssetsEditor.jsx';
import { calculateGoalFunding, formatCurrency, syncEarmarkingData } from '@/lib/goalCalculations';
import { eventBus } from '@/lib/eventBus';
import { Button } from '@/components/ui/button';

export default function EnhancedGoalsPage() {
  const { user, isAuthenticated } = useAuth();
  const [rows, setRows] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingRows, setSavingRows] = useState(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('progress'); // 'progress' or 'saving'

  // Load goals and assets from database
  useEffect(() => {
    if (isAuthenticated && user) {
      loadData();
    }
  }, [isAuthenticated, user]);

  // Listen for asset earmarking changes from Assets page
  useEffect(() => {
    const handleAssetEarmarkingChange = (data) => {
      console.log('🔄 Received asset earmarking change event:', data);
      
      // Update assets state with the new data
      setAssets(data.allAssets);
      
      // Sync goals with the updated assets
      const { updatedGoals } = syncEarmarkingData(data.allAssets, rows);
      console.log('🔄 Synced goals after asset earmarking change:', updatedGoals);
      setRows(updatedGoals);
      
      // Force refresh
      setRefreshKey(prev => prev + 1);
    };

    const unsubscribe = eventBus.subscribe('assetEarmarkingChanged', handleAssetEarmarkingChange);
    
    return () => {
      unsubscribe();
    };
  }, [rows]);


  const loadData = async () => {
    try {
      setLoading(true);
      const [goalsResponse, assetsResponse] = await Promise.all([
        ApiService.getFinancialGoals(user.id),
        ApiService.getFinancialAssets(user.id)
      ]);
      
      console.log('🎯 Goals response:', goalsResponse);
      console.log('📊 Assets response:', assetsResponse);
      
      const goals = goalsResponse.goals || goalsResponse || [];
      const assetsData = assetsResponse.assets || [];
      
      // Debug: Log the actual data structure
      console.log('🔍 Raw goals data:', goals);
      goals.forEach((goal, index) => {
        console.log(`🔍 Goal ${index}:`, {
          id: goal.id,
          description: goal.description,
          custom_data: goal.custom_data,
          linkedAssets: goal.custom_data?.linkedAssets
        });
      });
      
      // Ensure custom_data is properly initialized and sync with assets
      const processedGoals = goals.map(goal => ({
        ...goal,
        custom_data: goal.custom_data || {}
      }));
      
      // Don't sync goals with assets during page load to preserve deletions
      // The sync will happen when needed through user actions
      console.log('🔄 Loading goals without auto-sync to preserve deletions:', processedGoals);
      
      setRows(processedGoals);
      setAssets(assetsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setRows([]);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const newRow = { 
      id: `temp_${Date.now()}`, 
      description: '', 
      amount: 0, 
      targetYear: new Date().getFullYear() + 35, // Default to 35 years from now
      custom_data: { linkedAssets: [] }
    };
    setRows([...rows, newRow]);
  };

  const delRow = async (idx) => {
    const row = rows[idx];
    if (row.id && !row.id.toString().startsWith('temp_')) {
      try {
        await ApiService.deleteFinancialGoal(row.id);
      } catch (error) {
        console.error('Error deleting goal:', error);
      }
    }
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleCellChange = (rowIndex, field, value) => {
    try {
      const updatedRows = [...rows];
      updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
      setRows(updatedRows);

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
              target_year: parseInt(row.targetYear) || (new Date().getFullYear() + 35),
              custom_data: row.custom_data || {}
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
            target_year: parseInt(row.targetYear) || (new Date().getFullYear() + 35),
            custom_data: row.custom_data || {}
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

  const handleLinkedAssetsChange = async (rowIndex, linkedAssets) => {
    console.log('🔗 handleLinkedAssetsChange called:', { rowIndex, linkedAssets, currentRows: rows.length });
    console.log('🔗 Current row data:', rows[rowIndex]);
    console.log('🔗 New linkedAssets data:', linkedAssets);
    
    try {
      // First, update the UI state immediately for instant feedback
      const updatedRows = [...rows];
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        custom_data: {
          ...updatedRows[rowIndex].custom_data,
          linkedAssets
        }
      };
      console.log('🔗 Updated row data:', updatedRows[rowIndex]);
      
      // Update rows state immediately for UI refresh
      setRows(updatedRows);
      console.log('🔗 Rows state updated, new rows length:', updatedRows.length);
      console.log('🔗 Updated row custom_data:', updatedRows[rowIndex].custom_data);

      // Sync with assets (update asset earmarking)
      const { updatedAssets } = syncEarmarkingData(assets, updatedRows);
      console.log('🔗 Synced assets:', updatedAssets.length);
      
      // Update assets state immediately for UI refresh
      setAssets(updatedAssets);
      console.log('🔗 Assets state updated');

      // Force component refresh
      setRefreshKey(prev => {
        const newKey = prev + 1;
        console.log('🔗 Refresh key updated:', newKey);
        return newKey;
      });

      // Save goal with updated custom_data (async, don't wait for UI)
      const row = updatedRows[rowIndex];
      console.log('🔗 Saving goal:', { rowId: row.id, customData: row.custom_data });
      
      if (row.id && !row.id.toString().startsWith('temp_')) {
        console.log('🔗 Calling API to update goal...');
        console.log('🔗 API payload:', {
          goalId: row.id,
          custom_data: row.custom_data,
          linkedAssets: row.custom_data?.linkedAssets
        });
        
        ApiService.updateFinancialGoal(row.id, {
          custom_data: row.custom_data
        }).then(response => {
          console.log('🔗 Goal update response:', response);
          console.log('🔗 Goal update successful - custom_data saved to database');
          console.log('🔗 Response goal data:', response.goal);
          console.log('🔗 Response custom_data:', response.goal?.custom_data);
          
          // Verify the data was actually saved by checking the response
          if (response.goal && response.goal.custom_data) {
            console.log('✅ Goal custom_data confirmed saved to database');
            console.log('🔗 Saved linkedAssets:', response.goal.custom_data.linkedAssets);
          } else {
            console.warn('⚠️ Goal update response missing custom_data');
          }
        }).catch(error => {
          console.error('❌ Error updating goal:', error);
          console.error('❌ Error details:', error.message, error.stack);
          console.error('❌ Full error object:', error);
        });
      } else {
        console.log('🔗 Skipping goal save - temp row or no ID, but UI should still update');
      }

      // Update each affected asset (async, don't wait for UI)
      console.log('🔗 Updating assets, linkedAssets count:', linkedAssets.length);
      for (const linkedAsset of linkedAssets) {
        console.log('🔗 Processing linked asset:', linkedAsset);
        const asset = assets.find(a => a.id === linkedAsset.assetId);
        if (asset) {
          console.log('🔗 Found asset to update:', asset.id, asset.name);
          const updatedAsset = updatedAssets.find(a => a.id === linkedAsset.assetId);
          if (updatedAsset) {
            console.log('🔗 Updating asset:', { assetId: asset.id, customData: updatedAsset.custom_data });
            ApiService.updateFinancialAsset(asset.id, {
              custom_data: updatedAsset.custom_data
            }).then(assetResponse => {
              console.log('🔗 Asset update response:', assetResponse);
            }).catch(error => {
              console.error('❌ Error updating asset:', error);
              console.error('❌ Asset error details:', error.message, error.stack);
            });
          } else {
            console.log('❌ Updated asset not found for ID:', linkedAsset.assetId);
          }
        } else {
          console.log('❌ Asset not found for ID:', linkedAsset.assetId);
        }
      }

      // Handle cross-table deletion: Remove assets that are no longer linked to any goal
      console.log('🗑️ Checking for assets to delete from goals...');
      const currentLinkedAssetIds = linkedAssets.map(la => la.assetId);
      const previousLinkedAssetIds = (rows[rowIndex]?.custom_data?.linkedAssets || []).map(la => la.assetId);
      const removedAssetIds = previousLinkedAssetIds.filter(id => !currentLinkedAssetIds.includes(id));
      
      console.log('🗑️ Removed asset IDs:', removedAssetIds);
      
      // For each removed asset, remove this goal from its earmarking
      for (const removedAssetId of removedAssetIds) {
        const asset = assets.find(a => a.id === removedAssetId);
        if (asset) {
          console.log('🗑️ Removing goal from asset earmarking:', { assetId: removedAssetId, assetName: asset.name, goalId: row.id });
          
          // Update asset's custom_data to remove this goal from earmarking
          const updatedAssetEarmarking = (asset.custom_data?.goalEarmarks || []).filter(
            earmark => earmark.goalId !== row.id
          );
          
          const updatedAssetCustomData = {
            ...asset.custom_data,
            goalEarmarks: updatedAssetEarmarking
          };
          
          ApiService.updateFinancialAsset(removedAssetId, {
            custom_data: updatedAssetCustomData
          }).then(response => {
            console.log('🗑️ Asset earmarking updated after goal removal:', response);
          }).catch(error => {
            console.error('❌ Error updating asset earmarking after goal removal:', error);
          });
        }
      }

      // Emit event to notify assets page of goal changes
      console.log('📡 Emitting goalLinkedAssetsChanged event:', {
        goalId: row.id,
        goalName: row.description,
        linkedAssets: linkedAssets,
        allGoalsCount: updatedRows.length,
        allAssetsCount: updatedAssets.length
      });
      
      try {
        eventBus.emit('goalLinkedAssetsChanged', {
          goalId: row.id,
          goalName: row.description,
          linkedAssets: linkedAssets,
          allGoals: updatedRows,
          allAssets: updatedAssets
        });
        console.log('📡 Event emitted successfully');
      } catch (error) {
        console.error('❌ Error emitting event:', error);
      }

      console.log('✅ Linked assets change completed successfully - UI updated immediately');

    } catch (error) {
      console.error('❌ Error updating linked assets:', error);
    }
  };

  const handleReset = () => {
    loadData();
  };

  const handleExportCsv = () => {
    const headers = ['Goal', 'Target Amount (₹)', 'Target Year', 'Linked Assets'];
    const csvRows = rows.map(row => ([
      row.description || '',
      row.amount ?? '',
      row.targetYear ?? '',
      JSON.stringify(row.custom_data?.linkedAssets || [])
    ]));
    const content = [headers, ...csvRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `goals-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { field: 'description', headerName: 'Goal' }, 
    { field: 'amount', headerName: 'Target Amount (₹)', type: 'number' }, 
    { field: 'targetYear', headerName: 'Target Year', type: 'number' },
    {
      field: 'linkedAssets',
      headerName: 'Linked Assets',
      render: (row, onChange) => {
        const linkedAssetsValue = row.custom_data?.linkedAssets || [];
        console.log('🔗 Rendering LinkedAssetsEditor for row:', {
          rowId: row.id,
          rowName: row.description,
          linkedAssetsValue,
          linkedAssetsLength: linkedAssetsValue.length
        });
        
        return (
          <LinkedAssetsEditor
            key={`linked-assets-${row.id}-${linkedAssetsValue.length}-${refreshKey}`}
            value={linkedAssetsValue}
            onChange={(linkedAssets) => {
              const rowIndex = rows.findIndex(r => r.id === row.id);
              console.log('🔗 LinkedAssetsEditor onChange called:', { rowIndex, linkedAssets });
              if (rowIndex !== -1) {
                handleLinkedAssetsChange(rowIndex, linkedAssets);
              }
            }}
            availableAssets={assets}
            className="min-h-[40px]"
          />
        );
      }
    },
    {
      field: 'percentFunded',
      headerName: '% Funded',
      render: (row) => {
        const funding = calculateGoalFunding(row, assets);
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(funding.percentFunded, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">
              {funding.percentFunded.toFixed(1)}%
            </span>
          </div>
        );
      }
    },
    {
      field: 'fundedAmount',
      headerName: 'Funded Amount',
      render: (row) => {
        const funding = calculateGoalFunding(row, assets);
        return (
          <div className="text-sm">
            <div className="font-medium text-green-600">
              {formatCurrency(funding.fundedAmount)}
            </div>
            <div className="text-gray-500">
              of {formatCurrency(row.amount || 0)}
            </div>
          </div>
        );
      }
    },
    {
      field: 'fundingGap',
      headerName: 'Funding Gap',
      render: (row) => {
        const funding = calculateGoalFunding(row, assets);
        const gap = funding.fundingGap;
        return (
          <div className={`text-sm font-medium ${gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {gap > 0 ? `-${formatCurrency(gap)}` : `+${formatCurrency(Math.abs(gap))}`}
          </div>
        );
      }
    }
  ];

  // Calculate summary statistics
  const totalTargetAmount = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  const totalFundedAmount = rows.reduce((sum, row) => {
    const funding = calculateGoalFunding(row, assets);
    return sum + funding.fundedAmount;
  }, 0);
  const overallPercentFunded = totalTargetAmount > 0 ? (totalFundedAmount / totalTargetAmount) * 100 : 0;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Get first goal for donut chart (or selected goal)
  const selectedGoal = rows.length > 0 ? rows[0] : null;

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
        {rows.length === 0 && (
          <div className="lifemap-alert">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Start adding your first goal in the goal register below. You may add as many
              goals as you want.
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'progress' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
          onClick={() => setActiveTab('progress')}
        >
          Progress to Goals
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'saving' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
          onClick={() => setActiveTab('saving')}
        >
          Saving Need Over Time
        </button>
      </div>

      <div className="lifemap-stat-grid">
        <div className="lifemap-stat-card">
          <p className="lifemap-stat-title">Total Target Amount</p>
          <div className="lifemap-stat-value text-blue-600">{formatCurrency(totalTargetAmount)}</div>
        </div>
        <div className="lifemap-stat-card">
          <p className="lifemap-stat-title">Total Funded</p>
          <div className="lifemap-stat-value text-green-600">{formatCurrency(totalFundedAmount)}</div>
        </div>
        <div className="lifemap-stat-card">
          <p className="lifemap-stat-title">Overall Progress</p>
          <div className="lifemap-stat-value text-purple-600">{overallPercentFunded.toFixed(1)}%</div>
          <p className="text-xs text-slate-500 mt-1">Future-value basis, assumes 6% return</p>
        </div>
      </div>

      <div className="lifemap-panel">
        <div className="lifemap-panel-header">
          <div className="lifemap-panel-title">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
              <Target className="h-4 w-4" />
            </span>
            Goals with Asset Linking
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={addRow}>Add Row</Button>
            <Button size="sm" variant="outline" onClick={handleExportCsv}>Export CSV</Button>
            <Button size="sm" variant="ghost" className="text-red-500" onClick={handleReset}>Reset</Button>
          </div>
        </div>
      
        {columns && Array.isArray(columns) && rows && Array.isArray(rows) ? (
          <div key={refreshKey} className="p-6">
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

      {activeTab === 'progress' && selectedGoal && (
        <GoalDonutChart goal={selectedGoal} assets={assets} />
      )}

      {activeTab === 'saving' && (
        <GoalsChart goals={rows} assets={assets} chartType="funding" />
      )}
    </div>
  );
}
