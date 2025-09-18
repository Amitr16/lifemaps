import React, { useState, useEffect, useCallback } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useLifeSheetStore } from '../store/enhanced-store';
import { calculateExpenseProjections, calculateNeedsWantsSavings } from '../lib/chartCalculations';

export default function ExpensesChart() {
  const { user, isAuthenticated } = useAuth();
  const { lifeSheet, expenses } = useLifeSheetStore();
  const [projectionData, setProjectionData] = useState([]);
  const [nwsData, setNwsData] = useState(null);
  const [chartType, setChartType] = useState('projections'); // 'projections' or 'nws'

  const calculateData = useCallback(() => {
    if (!isAuthenticated || !user || !expenses.length) {
      setProjectionData([]);
      setNwsData(null);
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      const monthlyIncome = parseFloat(lifeSheet.monthlyIncome) || 0;
      
      // Calculate expense projections by category
      const projections = calculateExpenseProjections(expenses, currentYear, 10);
      setProjectionData(projections);

      // Calculate Needs/Wants/Savings breakdown
      const nws = calculateNeedsWantsSavings(expenses, monthlyIncome);
      setNwsData(nws);
    } catch (error) {
      console.error('Error calculating expenses chart data:', error);
    }
  }, [isAuthenticated, user, expenses, lifeSheet.monthlyIncome]);

  useEffect(() => {
    calculateData();
  }, [calculateData]);

  const formatCurrency = (value) => `₹${(value / 100000).toFixed(0)}L`;

  // Get unique categories for dynamic coloring
  const categories = [...new Set(projectionData.flatMap(year => 
    Object.keys(year).filter(key => key !== 'year' && key !== 'total')
  ))];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  return (
    <div className="space-y-6">
      {/* Chart Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setChartType('projections')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            chartType === 'projections' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Category Mix Over Time
        </button>
        <button
          onClick={() => setChartType('nws')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            chartType === 'nws' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Needs / Wants / Savings
        </button>
      </div>

      {/* Expense Projections Chart */}
      {chartType === 'projections' && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories Over Time (Inflation-Adjusted)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelFormatter={(label) => `Year: ${label}`}
                  />
                  <Legend />
                  
                  {categories.map((category, index) => (
                    <Area
                      key={category}
                      type="monotone"
                      dataKey={category}
                      stackId="1"
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.6}
                    />
                  ))}
                  
                  {/* Total line */}
                  <Area
                    type="monotone"
                    dataKey="total"
                    stackId="2"
                    stroke="#000"
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Needs/Wants/Savings Chart */}
      {chartType === 'nws' && nwsData && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Budget Breakdown (50/30/20 Rule)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[nwsData]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip 
                      formatter={(value, name) => [formatCurrency(value), name]}
                    />
                    <Legend />
                    
                    <Bar dataKey="needs" stackId="a" fill="#ef4444" name="Needs (50%)" />
                    <Bar dataKey="wants" stackId="a" fill="#f59e0b" name="Wants (30%)" />
                    <Bar dataKey="savings" stackId="a" fill="#10b981" name="Savings (20%)" />
                    
                    {/* Reference lines for 50/30/20 rule */}
                    <ReferenceLine 
                      y={nwsData.monthlyIncome * 0.5} 
                      stroke="#ef4444" 
                      strokeDasharray="5 5" 
                      label="50% Needs Target"
                    />
                    <ReferenceLine 
                      y={nwsData.monthlyIncome * 0.3} 
                      stroke="#f59e0b" 
                      strokeDasharray="5 5" 
                      label="30% Wants Target"
                    />
                    <ReferenceLine 
                      y={nwsData.monthlyIncome * 0.2} 
                      stroke="#10b981" 
                      strokeDasharray="5 5" 
                      label="20% Savings Target"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* NWS Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-red-600">Needs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{formatCurrency(nwsData.needs)}</div>
                  <div className="text-sm text-gray-600">
                    {nwsData.needsPercent.toFixed(1)}% of income
                  </div>
                  <div className={`text-xs ${nwsData.needsPercent > 50 ? 'text-red-600' : 'text-green-600'}`}>
                    {nwsData.needsPercent > 50 ? 'Over 50% target' : 'Within 50% target'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-yellow-600">Wants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{formatCurrency(nwsData.wants)}</div>
                  <div className="text-sm text-gray-600">
                    {nwsData.wantsPercent.toFixed(1)}% of income
                  </div>
                  <div className={`text-xs ${nwsData.wantsPercent > 30 ? 'text-red-600' : 'text-green-600'}`}>
                    {nwsData.wantsPercent > 30 ? 'Over 30% target' : 'Within 30% target'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-green-600">Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{formatCurrency(nwsData.savings)}</div>
                  <div className="text-sm text-gray-600">
                    {nwsData.savingsPercent.toFixed(1)}% of income
                  </div>
                  <div className={`text-xs ${nwsData.savingsPercent < 20 ? 'text-red-600' : 'text-green-600'}`}>
                    {nwsData.savingsPercent < 20 ? 'Below 20% target' : 'Above 20% target'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
