import React, { useState, useEffect, useCallback } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useLifeSheetStore } from '../store/enhanced-store';
import { calculateLoanAmortization, aggregateToAnnual, calculateEMIScenarios } from '../lib/chartCalculations';

export default function LoansChart() {
  const { user, isAuthenticated } = useAuth();
  const { loans } = useLifeSheetStore();
  const [amortizationData, setAmortizationData] = useState([]);
  const [scenarioData, setScenarioData] = useState(null);
  const [chartType, setChartType] = useState('amortization'); // 'amortization' or 'scenarios'
  const [extraPayment, setExtraPayment] = useState(0);

  const calculateData = useCallback(() => {
    if (!isAuthenticated || !user || !loans.length) {
      setAmortizationData([]);
      setScenarioData(null);
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      
      // Calculate amortization data for all loans
      const allAmortizationData = [];
      loans.forEach(loan => {
        const monthlySchedule = calculateLoanAmortization(loan, currentYear);
        const annualSchedule = aggregateToAnnual(monthlySchedule);
        
        // Add loan name to each data point
        annualSchedule.forEach(year => {
          year.loanName = loan.name || `Loan ${loan.id}`;
        });
        
        allAmortizationData.push(...annualSchedule);
      });

      // Group by year and sum across all loans
      const yearlyData = {};
      allAmortizationData.forEach(year => {
        if (!yearlyData[year.year]) {
          yearlyData[year.year] = {
            year: year.year,
            interestPaid: 0,
            principalPaid: 0,
            balance: 0
          };
        }
        yearlyData[year.year].interestPaid += year.interestPaid;
        yearlyData[year.year].principalPaid += year.principalPaid;
        yearlyData[year.year].balance = Math.max(yearlyData[year.year].balance, year.balance);
      });

      const sortedData = Object.values(yearlyData).sort((a, b) => a.year - b.year);
      setAmortizationData(sortedData);

      // Calculate scenario data for the first loan (if any)
      if (loans.length > 0) {
        const firstLoan = loans[0];
        const scenarios = calculateEMIScenarios(firstLoan, extraPayment, currentYear);
        setScenarioData(scenarios);
      }
    } catch (error) {
      console.error('Error calculating loans chart data:', error);
    }
  }, [isAuthenticated, user, loans, extraPayment]);

  useEffect(() => {
    calculateData();
  }, [calculateData]);

  const formatCurrency = (value) => `₹${(value / 100000).toFixed(0)}L`;

  return (
    <div className="space-y-6">
      {/* Chart Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setChartType('amortization')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            chartType === 'amortization' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Amortization Schedule
        </button>
        <button
          onClick={() => setChartType('scenarios')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            chartType === 'scenarios' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          EMI Scenarios
        </button>
      </div>

      {/* Extra Payment Input for Scenarios */}
      {chartType === 'scenarios' && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Extra Monthly Payment:</label>
          <input
            type="number"
            value={extraPayment}
            onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
            className="px-3 py-1 border rounded-md w-32"
            placeholder="₹0"
          />
        </div>
      )}

      {/* Amortization Chart */}
      {chartType === 'amortization' && (
        <Card>
          <CardHeader>
            <CardTitle>Loan Amortization Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={amortizationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatCurrency}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelFormatter={(label) => `Year: ${label}`}
                  />
                  <Legend />
                  
                  <Bar 
                    yAxisId="left"
                    dataKey="interestPaid" 
                    stackId="a" 
                    fill="#ef4444" 
                    name="Interest Paid"
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="principalPaid" 
                    stackId="a" 
                    fill="#10b981" 
                    name="Principal Paid"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Outstanding Balance"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenario Comparison Chart */}
      {chartType === 'scenarios' && scenarioData && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>EMI Scenario Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={scenarioData.base}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip 
                      formatter={(value, name) => [formatCurrency(value), name]}
                      labelFormatter={(label) => `Period: ${label}`}
                    />
                    <Legend />
                    
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Base EMI Balance"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Base EMI Scenario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Interest:</span>
                    <span className="font-medium">{formatCurrency(scenarioData.summary.base.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payoff Date:</span>
                    <span className="font-medium">{scenarioData.summary.base.payoffDate}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">With Extra Payment (₹{extraPayment.toLocaleString()}/month)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Interest:</span>
                    <span className="font-medium">{formatCurrency(scenarioData.summary.extra.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payoff Date:</span>
                    <span className="font-medium">{scenarioData.summary.extra.payoffDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Interest Saved:</span>
                    <span className="font-medium text-green-600">{formatCurrency(scenarioData.summary.extra.interestSaved)}</span>
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
