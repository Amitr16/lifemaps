import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '../contexts/AuthContext';
import { useLifeSheetStore, eventBus } from '../store/enhanced-store';
import ApiService from '../services/api';

/**
 * Calculate SIP projection with proper compounding logic
 * @param {Object} params
 * @param {number} params.initial - Initial lump sum (₹)
 * @param {number} params.sipAmount - SIP contribution amount
 * @param {string} params.sipFrequency - SIP frequency (Monthly, Weekly, etc.)
 * @param {number} params.annualRate - Expected annual return (e.g. 0.10 for 10%)
 * @param {number} params.years - Total years to project
 * @param {string} params.sipExpiryDate - SIP expiry date (YYYY-MM-DD)
 * @returns {number} Total projected value
 */
const calculateSIPProjection = ({ initial, sipAmount, sipFrequency, annualRate, years, sipExpiryDate }) => {
  if (sipAmount <= 0 || !sipFrequency) {
    // No SIP, just return initial value with compound growth
    return initial * Math.pow(1 + annualRate, years);
  }

  // Convert SIP frequency to monthly contributions
  let monthlySIP = 0;
  switch (sipFrequency) {
    case 'Weekly':
      monthlySIP = sipAmount * 4.33; // ~4.33 weeks per month
      break;
    case 'Bi-weekly':
      monthlySIP = sipAmount * 2.17; // ~2.17 bi-weeks per month
      break;
    case 'Monthly':
      monthlySIP = sipAmount;
      break;
    case 'Bi-monthly':
      monthlySIP = sipAmount * 2;
      break;
    case 'Quarterly':
      monthlySIP = sipAmount / 3;
      break;
    case 'Semi-annual':
      monthlySIP = sipAmount / 6;
      break;
    case 'Annual':
      monthlySIP = sipAmount / 12;
      break;
    case 'Lumpsum':
      monthlySIP = 0; // One-time only
      break;
    default:
      monthlySIP = 0;
  }

  // Calculate SIP months (how long SIP runs)
  let sipMonths = years * 12; // Default: SIP runs for all years
  if (sipExpiryDate) {
    const expiryYear = new Date(sipExpiryDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const maxSipYears = Math.max(0, expiryYear - currentYear);
    sipMonths = Math.min(years * 12, maxSipYears * 12);
  }

  const monthlyRate = annualRate / 12;
  const totalMonths = years * 12;

  // Lump sum part (grows throughout the entire period)
  const lumpValue = initial * Math.pow(1 + monthlyRate, totalMonths);

  // SIP part (accumulate up to SIP expiry, then let it compound)
  let sipValue = 0;
  if (monthlySIP > 0 && sipMonths > 0) {
    // Calculate SIP accumulated up to expiry
    const sipAccumulated = monthlySIP * ((Math.pow(1 + monthlyRate, sipMonths) - 1) / monthlyRate);
    
    // After SIP stops, let the accumulated SIP pot continue compounding
    const remainingMonths = totalMonths - sipMonths;
    sipValue = sipAccumulated * Math.pow(1 + monthlyRate, remainingMonths);
  }

  return lumpValue + sipValue;
};

const UnifiedChart = ({ defaultEnabled = ['assets'] }) => {
  const { user, isAuthenticated } = useAuth();
  const { lifeSheet, loans, expenses, goals } = useLifeSheetStore();
  const [assets, setAssets] = useState([]);
  const [workAssets, setWorkAssets] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [dependants, setDependants] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [enabledData, setEnabledData] = useState(defaultEnabled);

  // Load additional data
  useEffect(() => {
    if (isAuthenticated && user) {
      loadAssets();
      loadWorkAssets();
      loadInsurance();
      loadDependants();
    }
  }, [isAuthenticated, user]);

  const loadAssets = async () => {
    try {
      const response = await ApiService.getFinancialAssets(user.id);
      console.log('📊 Assets for chart - Full response:', response);
      console.log('📊 Assets for chart - Assets array:', response.assets);
      if (response.assets && response.assets.length > 0) {
        console.log('📊 First asset details:', response.assets[0]);
      }
      setAssets(response.assets || []);
    } catch (error) {
      console.error('Error loading assets for chart:', error);
    }
  };

  // Calculate chart data
  const calculateChartData = useCallback(() => {
    if (!isAuthenticated || !user) {
      setChartData([]);
      return;
    }

    try {
      const age = parseInt(lifeSheet.age) || 30;
      const currentYear = new Date().getFullYear();
      const lifespan = parseInt(lifeSheet.lifespanYears) || 85;
      const maxAge = Math.min(age + 50, lifespan); // Show up to 50 years or lifespan

      const data = [];

      for (let yearOffset = 0; yearOffset <= (maxAge - age); yearOffset++) {
        const currentAge = age + yearOffset;
        const year = currentYear + yearOffset;
        
        const yearData = {
          year,
          age: currentAge,
          assets: 0,
          workAssets: 0,
          goals: 0,
          loans: 0,
          expenses: 0,
          insurance: 0,
          dependants: 0
        };

        // Calculate Assets
        if (enabledData.includes('assets')) {
          console.log('🔍 Calculating assets for year', year, 'with', assets.length, 'assets');
          const totalAssets = assets.reduce((sum, asset) => {
            const value = parseFloat(asset.current_value) || 0;
            const customData = asset.custom_data || {};
            const expectedReturn = parseFloat(customData.expectedReturn) || 5; // Default 5%
            console.log('🔍 Asset', asset.name, 'expectedReturn raw:', customData.expectedReturn, 'parsed:', expectedReturn);
            const growthRate = expectedReturn / 100;
            
            // Calculate SIP contributions and compound growth
            const sipAmount = parseFloat(customData.sipAmount) || 0;
            const sipFrequency = customData.sipFrequency || '';
            const sipExpiryDate = customData.sipExpiryDate || '';
            
            // Use the improved SIP projection logic
            const grownValue = calculateSIPProjection({
              initial: value,
              sipAmount: parseFloat(customData.sipAmount) || 0,
              sipFrequency: customData.sipFrequency || '',
              annualRate: growthRate,
              years: yearOffset,
              sipExpiryDate: customData.sipExpiryDate || ''
            });
            
            console.log('🔍 Asset', asset.name, 'value:', value, 'SIP Amount:', sipAmount, 'SIP Frequency:', sipFrequency, 'SIP Expiry:', sipExpiryDate, 'expectedReturn:', expectedReturn, 'yearOffset:', yearOffset, 'grown to:', grownValue);
            return sum + grownValue;
          }, 0);
          yearData.assets = Math.round(totalAssets);
          console.log('🔍 Total assets for year', year, ':', yearData.assets);
        }

        // Calculate Work Assets
        if (enabledData.includes('workAssets')) {
          let workAssetsValue = 0;
          workAssets.forEach(asset => {
            const endAge = parseInt(asset.endAge) || 65;
            if (currentAge <= endAge) {
              const amount = parseFloat(asset.amount) || 0;
              const growthRate = (parseFloat(asset.growthRate) || 3) / 100;
              const yearsFromStart = yearOffset;
              workAssetsValue += amount * Math.pow(1 + growthRate, yearsFromStart);
            }
          });
          yearData.workAssets = Math.round(workAssetsValue);
        }

        // Calculate Goals (future value needed)
        if (enabledData.includes('goals')) {
          const totalGoals = goals.reduce((sum, goal) => {
            const amount = parseFloat(goal.amount) || 0;
            const targetYear = parseInt(goal.target_year) || currentYear + 10;
            if (currentYear >= targetYear) {
              return sum + amount;
            }
            return sum;
          }, 0);
          yearData.goals = Math.round(totalGoals);
        }

        // Calculate Loans (outstanding balance)
        if (enabledData.includes('loans')) {
          const totalLoans = loans.reduce((sum, loan) => {
            const principal = parseFloat(loan.principal_outstanding) || 0;
            const rate = parseFloat(loan.rate) || 0;
            const emi = parseFloat(loan.emi) || 0;
            const monthsRemaining = Math.max(0, (parseInt(loan.end_date?.split('-')[0]) || currentYear + 10) - year);
            const remainingBalance = Math.max(0, principal - (emi * monthsRemaining));
            return sum + remainingBalance;
          }, 0);
          yearData.loans = Math.round(totalLoans);
        }

        // Calculate Expenses (annual)
        if (enabledData.includes('expenses')) {
          const totalExpenses = expenses.reduce((sum, expense) => {
            const amount = parseFloat(expense.amount) || 0;
            const frequency = expense.frequency || 'Monthly';
            const multiplier = frequency === 'Monthly' ? 12 : frequency === 'Quarterly' ? 4 : 1;
            return sum + (amount * multiplier);
          }, 0);
          yearData.expenses = Math.round(totalExpenses);
        }

        data.push(yearData);
      }

      setChartData(data);
    } catch (error) {
      console.error('Error calculating chart data:', error);
    }
  }, [isAuthenticated, user, lifeSheet, assets, workAssets, goals, loans, expenses, insurance, dependants, enabledData]);

  // Listen for asset updates from the store
  useEffect(() => {
    console.log('📊 Chart received updated assets:', assets);
    // Assets are now automatically updated from the store
  }, [assets]);

  // Listen for asset updates from the asset register component
  useEffect(() => {
    const handleAssetUpdate = (data) => {
      console.log('📊 Chart received asset update event:', data);
      // Update local assets state with the updated assets from the event
      if (data.allAssets) {
        setAssets(data.allAssets);
      }
      // Trigger chart recalculation when assets are updated
      calculateChartData();
    };

    // Subscribe to asset update events
    const unsubscribe = eventBus.subscribe('assetUpdated', handleAssetUpdate);
    
    return () => {
      unsubscribe();
    };
  }, [calculateChartData]);

  const loadWorkAssets = async () => {
    try {
      const workAssetsData = await ApiService.getWorkAssets(user.id);
      setWorkAssets(workAssetsData);
    } catch (error) {
      console.error('Error loading work assets:', error);
    }
  };

  const loadInsurance = async () => {
    try {
      // Placeholder - implement when insurance API is ready
      setInsurance([]);
    } catch (error) {
      console.error('Error loading insurance:', error);
    }
  };

  const loadDependants = async () => {
    try {
      // Placeholder - implement when dependants API is ready
      setDependants([]);
    } catch (error) {
      console.error('Error loading dependants:', error);
    }
  };

  useEffect(() => {
    calculateChartData();
  }, [calculateChartData]);

  const toggleData = (dataType) => {
    setEnabledData(prev => 
      prev.includes(dataType) 
        ? prev.filter(item => item !== dataType)
        : [...prev, dataType]
    );
  };

  const dataTypes = [
    { key: 'assets', label: 'Assets', color: '#3b82f6' },
    { key: 'workAssets', label: 'Work Assets', color: '#10b981' },
    { key: 'goals', label: 'Goals', color: '#f59e0b' },
    { key: 'loans', label: 'Loans', color: '#ef4444' },
    { key: 'expenses', label: 'Expenses', color: '#8b5cf6' },
    { key: 'insurance', label: 'Insurance', color: '#06b6d4' },
    { key: 'dependants', label: 'Dependants', color: '#84cc16' }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Financial Overview</CardTitle>
          <div className="flex flex-wrap gap-4">
            {dataTypes.map(({ key, label, color }) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={enabledData.includes(key)}
                  onCheckedChange={() => toggleData(key)}
                />
                <label
                  htmlFor={key}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  style={{ color }}
                >
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
              />
              <Tooltip 
                formatter={(value, name) => [`₹${value.toLocaleString()}`, dataTypes.find(dt => dt.key === name)?.label || name]}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Legend />
              {enabledData.includes('assets') && (
                <Line 
                  type="monotone" 
                  dataKey="assets" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              )}
              {enabledData.includes('workAssets') && (
                <Line 
                  type="monotone" 
                  dataKey="workAssets" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
              )}
              {enabledData.includes('goals') && (
                <Line 
                  type="monotone" 
                  dataKey="goals" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                />
              )}
              {enabledData.includes('loans') && (
                <Line 
                  type="monotone" 
                  dataKey="loans" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                />
              )}
              {enabledData.includes('expenses') && (
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                />
              )}
              {enabledData.includes('insurance') && (
                <Line 
                  type="monotone" 
                  dataKey="insurance" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                />
              )}
              {enabledData.includes('dependants') && (
                <Line 
                  type="monotone" 
                  dataKey="dependants" 
                  stroke="#84cc16" 
                  strokeWidth={2}
                  dot={{ fill: '#84cc16', strokeWidth: 2, r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedChart;
