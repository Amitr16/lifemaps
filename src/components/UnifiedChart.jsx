import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '../contexts/AuthContext';
import { useLifeSheetStore } from '../store/enhanced-store';
import ApiService from '../services/api';

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
            const growthRate = 0.06; // 6% default growth
            const grownValue = value * Math.pow(1 + growthRate, yearOffset);
            console.log('🔍 Asset', asset.name, 'value:', value, 'grown to:', grownValue);
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
            const targetAge = parseInt(goal.target_age) || currentAge + 10;
            if (currentAge >= targetAge) {
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
