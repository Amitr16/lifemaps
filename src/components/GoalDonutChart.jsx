import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { calculateGoalFunding, formatCurrency } from '@/lib/goalCalculations';

export default function GoalDonutChart({ goal, assets }) {
  const funding = calculateGoalFunding(goal, assets);
  const percentFunded = Math.min(funding.percentFunded, 100);
  const percentUnfunded = Math.max(100 - percentFunded, 0);
  
  const data = [
    { name: 'Funded', value: percentFunded, color: '#14b8a6' }, // teal
    { name: 'Unfunded', value: percentUnfunded, color: '#374151' } // dark gray
  ];

  const COLORS = {
    'Funded': '#14b8a6',
    'Unfunded': '#374151'
  };

  return (
    <div className="lifemap-panel">
      <div className="lifemap-panel-header">
        <div className="lifemap-panel-title">
          {goal.description || 'Goal'}
          {(goal.target_year || goal.targetYear) && (
            <span className="text-sm font-normal text-slate-500 ml-2">
              Target year: {goal.target_year || goal.targetYear}
            </span>
          )}
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="relative w-64 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-slate-700">
                {percentFunded.toFixed(1)}%
              </div>
              <div className="text-sm text-slate-500">funded</div>
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-2 text-center">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Funded:</span>
            <span className="font-semibold text-green-600">
              {formatCurrency(funding.fundedAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Target:</span>
            <span className="font-semibold">
              {formatCurrency(goal.amount || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Gap:</span>
            <span className={`font-semibold ${funding.fundingGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {funding.fundingGap > 0 ? '-' : '+'}{formatCurrency(Math.abs(funding.fundingGap))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

