import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, BarChart, Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useLifeSheetStore } from '../store/enhanced-store';
import { calculateExpenseProjections, calculateProjectionYears, calculateNeedsWantsSavings } from '../lib/chartCalculations';

export default function ExpensesChart({ activeView = 'category' }) {
  const { user, isAuthenticated } = useAuth();
  const store = useLifeSheetStore();
  
  // Safely extract values with defaults
  const expenses = Array.isArray(store?.expenses) ? store.expenses : [];
  const lifeSheet = store?.lifeSheet || {};
  const [chartData, setChartData] = useState([]);

  // Create stable dependency key
  const expensesKey = useMemo(() => {
    if (!Array.isArray(expenses) || expenses.length === 0) return '';
    try {
      return expenses.map(e => `${e?.id || ''}-${e?.amount || ''}-${e?.category || ''}`)
        .filter(Boolean)
        .join('|');
    } catch {
      return '';
    }
  }, [expenses]);
  
  const lifeSheetAge = lifeSheet?.age || null;

  useEffect(() => {
    try {
      // Get fresh data from store to avoid stale closures
      const currentStore = useLifeSheetStore.getState();
      const currentExpenses = Array.isArray(currentStore?.expenses) ? currentStore.expenses : [];
      const currentLifeSheet = currentStore?.lifeSheet || {};
      
      if (!isAuthenticated || !user || !currentExpenses.length) {
        setChartData([]);
        return;
      }

      const currentYear = new Date().getFullYear();
      const currentAge = parseInt(currentLifeSheet?.age) || 30;
      const projectionYears = calculateProjectionYears(currentAge, 80);
      // Calculate cumulative annual expenses over time
      const projections = calculateExpenseProjections(currentExpenses, currentYear, projectionYears);
      setChartData(projections);
    } catch (error) {
      console.error('Error calculating expenses chart data:', error);
      setChartData([]);
    }
  }, [isAuthenticated, user, expensesKey, lifeSheetAge]);

  const categorySeries = useMemo(() => {
    try {
      if (!Array.isArray(expenses) || !expenses.length || !lifeSheet?.age) return [];
      const currentYear = new Date().getFullYear();
      const projectionYears = calculateProjectionYears(parseInt(lifeSheet?.age) || 30, 80);
      const series = [];
      const categories = {};

      expenses.forEach(expense => {
        try {
          const category = (expense?.category || 'Other').trim() || 'Other';
          const inflation = (parseFloat(expense?.personal_inflation) || 6) / 100;
          const annualAmount = parseFloat(expense?.annual_budget)
            || (() => {
              const amount = parseFloat(expense?.amount) || 0;
              const frequency = expense?.frequency || 'Monthly';
              if (frequency === 'Weekly') return amount * 52;
              if (frequency === 'Fortnightly') return amount * 26;
              if (frequency === 'Quarterly') return amount * 4;
              if (frequency === 'Semi-Annually') return amount * 2;
              if (frequency === 'Annually') return amount;
              return amount * 12;
            })();

          categories[category] = { annualAmount, inflation };
        } catch (err) {
          console.error('Error processing expense:', err);
        }
      });

      for (let yearOffset = 0; yearOffset <= projectionYears; yearOffset++) {
        const year = currentYear + yearOffset;
        const row = { year, total: 0 };
        Object.entries(categories).forEach(([category, data]) => {
          const value = data.annualAmount * Math.pow(1 + data.inflation, yearOffset);
          row[category] = value;
          row.total += value;
        });
        series.push(row);
      }

      return series;
    } catch (error) {
      console.error('Error calculating categorySeries:', error);
      return [];
    }
  }, [expenses, lifeSheet?.age]);

  const needsWantsSavings = useMemo(() => {
    const monthlyIncome = parseFloat(lifeSheet?.currentAnnualGrossIncome || 0) / 12;
    return calculateNeedsWantsSavings(Array.isArray(expenses) ? expenses : [], monthlyIncome);
  }, [expenses, lifeSheet?.currentAnnualGrossIncome]);

  const formatCurrency = (value) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else {
      return `₹${value.toLocaleString('en-IN')}`;
    }
  };

  if (!chartData.length && !categorySeries.length) {
    return (
      <Card className="lifemap-panel">
        <CardHeader className="lifemap-panel-header">
          <CardTitle className="lifemap-panel-title">Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex flex-col items-center justify-center text-gray-500 gap-3">
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center">
              !
            </div>
            <div className="text-lg font-semibold text-slate-700">No Expenses found</div>
            <div className="text-sm text-slate-500">Add some expenses to see the chart</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lifemap-panel">
      <CardHeader className="lifemap-panel-header">
        <div className="flex items-center justify-between w-full">
          <CardTitle className="lifemap-panel-title">
            {activeView === 'category'
              ? 'Expense Categories Over Time (Inflation-Adjusted)'
              : 'Monthly Budget Breakdown (50/30/20 Rule)'}
          </CardTitle>
          <span className="text-xs text-slate-500">Total Expenses</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {activeView === 'category' ? (
              <AreaChart data={categorySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
                <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(label) => `Year: ${label}`} />
                <Legend />
                {Array.isArray(categorySeries) && categorySeries.length > 0 ? Object.keys(categorySeries[0] || {})
                  .filter(key => key !== 'year' && key !== 'total')
                  .map((key, index) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stackId="1"
                      stroke={index % 2 === 0 ? '#0ea5e9' : '#f59e0b'}
                      fill={index % 2 === 0 ? '#bae6fd' : '#fde68a'}
                      name={key}
                    />
                  )) : null}
                <Line type="monotone" dataKey="total" stroke="#111827" strokeDasharray="5 5" dot={false} name="Total Expenses" />
              </AreaChart>
            ) : (
              <BarChart data={[{
                name: 'Monthly Budget',
                Needs: needsWantsSavings.needs,
                Wants: needsWantsSavings.wants,
                Savings: needsWantsSavings.savings
              }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Needs" stackId="a" fill="#0ea5e9" />
                <Bar dataKey="Wants" stackId="a" fill="#f472b6" />
                <Bar dataKey="Savings" stackId="a" fill="#22c55e" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        {activeView === 'nws' && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="lifemap-stat-card">
              <p className="lifemap-stat-title">Needs</p>
              <div className="lifemap-stat-value text-sky-600">₹{needsWantsSavings.needs.toLocaleString('en-IN')}</div>
              <p className="text-xs text-slate-500">{needsWantsSavings.needsPercent.toFixed(1)}% of income</p>
            </div>
            <div className="lifemap-stat-card">
              <p className="lifemap-stat-title">Wants</p>
              <div className="lifemap-stat-value text-pink-600">₹{needsWantsSavings.wants.toLocaleString('en-IN')}</div>
              <p className="text-xs text-slate-500">{needsWantsSavings.wantsPercent.toFixed(1)}% of income</p>
            </div>
            <div className="lifemap-stat-card">
              <p className="lifemap-stat-title">Savings</p>
              <div className="lifemap-stat-value text-emerald-600">₹{needsWantsSavings.savings.toLocaleString('en-IN')}</div>
              <p className="text-xs text-slate-500">{needsWantsSavings.savingsPercent.toFixed(1)}% of income</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
