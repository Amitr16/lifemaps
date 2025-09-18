import React, { useState, useEffect, useCallback } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { calculateAnnualLoanOutflow } from '../lib/chartCalculations';

export default function LoansChart({ loans = [] }) {
  const { user, isAuthenticated } = useAuth();
  const [outflowData, setOutflowData] = useState([]);

  const calculateData = useCallback(() => {
    if (!isAuthenticated || !user || !loans.length) {
      setOutflowData([]);
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      const outflow = calculateAnnualLoanOutflow(loans, currentYear);
      setOutflowData(outflow);
    } catch (error) {
      console.error('Error calculating loans chart data:', error);
    }
  }, [isAuthenticated, user, loans]);

  useEffect(() => {
    calculateData();
  }, [calculateData]);

  const formatCurrency = (value) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}K`;
    }
    return `₹${value.toFixed(0)}`;
  };

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

  // Get loan names for dynamic bars
  const loanNames = outflowData.length > 0 
    ? Object.keys(outflowData[0]).filter(key => key !== 'year' && key !== 'total')
    : [];

  if (!isAuthenticated || !user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Please log in to view loan charts</p>
        </CardContent>
      </Card>
    );
  }

  if (!loans.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No loans found. Add some loans to see the chart.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual EMI Outflow by Loan</CardTitle>
        <p className="text-sm text-gray-600">How much cash leaves your pocket each year</p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={outflowData}>
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
              
              {/* Dynamic bars for each loan */}
              {loanNames.map((loanName, index) => (
                <Bar
                  key={loanName}
                  dataKey={loanName}
                  stackId="emi"
                  fill={COLORS[index % COLORS.length]}
                  name={loanName.replace(/_/g, ' ')}
                />
              ))}
              
              {/* Total outflow line */}
              <Line
                type="monotone"
                dataKey="total"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                name="Total Outflow"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Chart interpretation */}
        <div className="mt-4 p-3 bg-orange-50 rounded-lg">
          <h4 className="text-sm font-medium text-orange-800 mb-2">How to read this chart:</h4>
          <ul className="text-xs text-orange-700 space-y-1">
            <li>• <strong>Stacked bars</strong> show each loan's annual EMI contribution</li>
            <li>• <strong>Dashed line</strong> shows total annual outflow across all active loans</li>
            <li>• <strong>Drops</strong> indicate when a loan is paid off and cash burden reduces</li>
            <li>• <strong>Height</strong> shows how much you need to budget for that year</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}