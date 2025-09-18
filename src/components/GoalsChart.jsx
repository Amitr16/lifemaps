import React, { useState, useEffect, useCallback } from 'react';
import { 
  ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { calculateGoalsProgress, calculateGoalsFundingNeed } from '../lib/chartCalculations';

export default function GoalsChart({ goals = [], assets = [] }) {
  const { user, isAuthenticated } = useAuth();
  const [progressData, setProgressData] = useState([]);
  const [fundingData, setFundingData] = useState([]);
  const [chartType, setChartType] = useState('progress'); // 'progress' or 'funding'

  console.log('🎯 GoalsChart received props:', { goals: goals.length, assets: assets.length });

  const calculateData = useCallback(() => {
    if (!isAuthenticated || !user || !goals.length) {
      setProgressData([]);
      setFundingData([]);
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      
      // Calculate progress data for donut charts
      const progress = calculateGoalsProgress(goals, assets, currentYear);
      console.log('🎯 GoalsChart progress data:', progress);
      setProgressData(progress);

      // Calculate funding need data for area chart
      const funding = calculateGoalsFundingNeed(goals, assets, currentYear, 20);
      console.log('🎯 GoalsChart funding data:', funding);
      setFundingData(funding);
    } catch (error) {
      console.error('Error calculating goals chart data:', error);
    }
  }, [isAuthenticated, user, goals, assets]);

  useEffect(() => {
    calculateData();
  }, [calculateData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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

  const getFundingColor = (percentFunded) => {
    if (percentFunded >= 100) return '#10b981'; // Green for overfunded
    if (percentFunded >= 80) return '#22c55e'; // Light green for well-funded
    if (percentFunded >= 60) return '#84cc16'; // Yellow-green for good progress
    if (percentFunded >= 40) return '#eab308'; // Yellow for moderate progress
    if (percentFunded >= 20) return '#f59e0b'; // Orange for low progress
    return '#ef4444'; // Red for very low progress
  };

  return (
    <div className="space-y-6">
      {/* Chart Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setChartType('progress')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            chartType === 'progress' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Progress to Goals
        </button>
        <button
          onClick={() => setChartType('funding')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            chartType === 'funding' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Saving Need Over Time
        </button>
      </div>

      {/* Progress Chart - Individual Donut Cards */}
      {chartType === 'progress' && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">Goal Progress</h2>
            <p className="text-sm text-gray-600">Donut snapshots</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {progressData.map((goal, index) => (
              <div key={goal.name} className="bg-white p-6 rounded-lg border shadow-sm">
                {/* Goal Title */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">{goal.name}</h3>
                  <p className="text-sm text-gray-500">{goal.targetYear}</p>
                </div>
                
                {/* Donut Chart */}
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Funded', value: goal.percentFunded, fill: getFundingColor(goal.percentFunded) },
                          { name: 'Remaining', value: Math.max(0, 100 - goal.percentFunded), fill: '#e5e7eb' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        startAngle={90}
                        endAngle={450}
                        dataKey="value"
                      >
                        <Cell fill={getFundingColor(goal.percentFunded)} />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center percentage */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">
                        {goal.percentFunded.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">funded</div>
                    </div>
                  </div>
                  
                  {/* Overfunded star indicator */}
                  {goal.percentFunded >= 100 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-yellow-800 text-xs font-bold">★</span>
                    </div>
                  )}
                </div>
                
                {/* Financial Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Funded:</span>
                    <span className="font-medium text-green-600">{formatCurrency(goal.funded)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-medium">{formatCurrency(goal.target)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gap:</span>
                    <span className={`font-medium ${goal.gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {goal.gap > 0 ? `-${formatCurrency(goal.gap)}` : `+${formatCurrency(Math.abs(goal.gap))}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center text-xs text-gray-500">
            Future-value basis, assumes 6% return
          </div>
        </div>
      )}

      {/* Funding Need Chart */}
      {chartType === 'funding' && (
        <Card>
          <CardHeader>
            <CardTitle>Saving Need Over Time</CardTitle>
            <p className="text-sm text-gray-600">Annual contributions required to meet all goals</p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fundingData}>
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
                  
                  {/* Dynamic areas for each goal - use the actual goal keys from data */}
                  {fundingData.length > 0 && Object.keys(fundingData[0])
                    .filter(key => key !== 'year' && key !== 'requiredTotal')
                    .map((goalKey, index) => (
                      <Area
                        key={goalKey}
                        type="monotone"
                        dataKey={goalKey}
                        stackId="1"
                        stroke={COLORS[index % COLORS.length]}
                        fill={COLORS[index % COLORS.length]}
                        fillOpacity={0.6}
                        name={goalKey.replace(/_/g, ' ')}
                      />
                    ))}
                  
                  {/* Total line */}
                  <Area
                    type="monotone"
                    dataKey="requiredTotal"
                    stackId="2"
                    stroke="#000"
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Total Required"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Chart interpretation */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">How to read this chart:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• <strong>Height</strong> at any year = total saving you need that year</li>
                <li>• <strong>Spikes</strong> show collision years where multiple goals demand higher contributions</li>
                <li>• <strong>Dashed line</strong> shows the total required saving across all goals</li>
                <li>• Each colored area represents one goal's annual saving requirement</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
