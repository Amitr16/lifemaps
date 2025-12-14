import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useLifeSheetStore } from '../store/enhanced-store';
import { calculateExpenseProjections, calculateProjectionYears } from '../lib/chartCalculations';

export default function ExpensesChart() {
  const { user, isAuthenticated } = useAuth();
  const { expenses, lifeSheet } = useLifeSheetStore();
  const [chartData, setChartData] = useState([]);

  const calculateData = useCallback(() => {
    if (!isAuthenticated || !user || !expenses.length) {
      setChartData([]);
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      const currentAge = parseInt(lifeSheet?.age) || 30;
      const projectionYears = calculateProjectionYears(currentAge, 80);
      // Calculate cumulative annual expenses over time
      const projections = calculateExpenseProjections(expenses, currentYear, projectionYears);
      setChartData(projections);
    } catch (error) {
      console.error('Error calculating expenses chart data:', error);
      setChartData([]);
    }
  }, [isAuthenticated, user, expenses, lifeSheet?.age]);

  useEffect(() => {
    calculateData();
  }, [calculateData]);

  const formatCurrency = (value) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else {
      return `₹${value.toLocaleString('en-IN')}`;
    }
  };

  if (!chartData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expenses Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-gray-500">
            No expense data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }}
                label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
                label={{ value: 'Annual Expenses', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Annual Expenses']}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4 }}
                name="Annual Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
