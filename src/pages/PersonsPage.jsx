
import React, { useEffect, useState } from 'react';
import EditableGrid from '@/components/EditableGrid.jsx';
import GraphDock from '@/components/GraphDock.jsx';
import { loadData, saveData } from '@/store/data';

export default function PersonsPage() {
  const [rows, setRows] = useState([]);
  const [formData, setFormData] = useState({});

  useEffect(()=>{ 
    const d = loadData(); 
    setRows(d['persons'] || []); 
    setFormData(d.formData||{});
  },[]);

  useEffect(()=>{ 
    const d = loadData(); 
    d['persons'] = rows; 
    saveData(d);
  },[rows]);

  const addRow = ()=> setRows([...rows, {}]);
  const delRow = (idx)=> setRows(rows.filter((_,i)=>i!==idx));

  const columns = [{ field:'name', headerName:'Name' }, { field:'role', headerName:'Role' }, { field:'share', headerName:'Share %', type:'number' }];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <GraphDock />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">PersonsPage</h1>
      </div>
      <EditableGrid columns={columns} rows={rows} onChange={setRows} onAdd={addRow} onDelete={delRow} />
    </div>
  );
}
