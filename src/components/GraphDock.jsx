
import React, {useEffect, useState} from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { loadData } from '@/store/data';
import { computeTotals, buildChartSeries } from '@/lib/calc';

export default function GraphDock(){
  const [series, setSeries] = useState([]);

  const recompute = ()=>{
    const data = loadData();
    const totals = computeTotals(data);
    const s = buildChartSeries({formData:data.formData||{}, totals, loans:data.loans, expenses:data.expenses, goals:data.goals});
    setSeries(s);
  };

  useEffect(()=>{
    recompute();
    const onAny = ()=>recompute();
    window.addEventListener('lifesheet:update', onAny);
    window.addEventListener('storage', onAny);
    return ()=>{
      window.removeEventListener('lifesheet:update', onAny);
      window.removeEventListener('storage', onAny);
    };
  }, []);

  return (
    <div className="w-full h-64 border rounded-lg p-2 bg-white">
      <div className="text-sm font-semibold mb-1">Life Sheet — Net Worth (real terms)</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="netWorth" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
