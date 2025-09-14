
import React, { useEffect, useState } from 'react';
import EditableGrid from '@/components/EditableGrid.jsx';
import GraphDock from '@/components/GraphDock.jsx';
import { loadData, saveData } from '@/store/data';

export default function GoalsPage() {
  const [rows, setRows] = useState([]);
  const [formData, setFormData] = useState({});

  useEffect(()=>{ 
    const d = loadData(); 
    setRows(d['goals'] || []); 
    setFormData(d.formData||{});
  },[]);

  useEffect(()=>{ 
    const d = loadData(); 
    d['goals'] = rows; 
    saveData(d);
  },[rows]);

  const addRow = ()=> setRows([...rows, {}]);
  const delRow = (idx)=> setRows(rows.filter((_,i)=>i!==idx));

  const columns = [{ field:'description', headerName:'Goal' }, { field:'amount', headerName:'Target Amount', type:'number' }, { field:'targetDate', headerName:'Target Date', type:'text' }];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <GraphDock />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">GoalsPage</h1>
      </div>
      <EditableGrid columns={columns} rows={rows} onChange={setRows} onAdd={addRow} onDelete={delRow} />
    </div>
  );
}
