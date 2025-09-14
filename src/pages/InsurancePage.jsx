
import React, { useEffect, useState } from 'react';
import EditableGrid from '@/components/EditableGrid.jsx';
import GraphDock from '@/components/GraphDock.jsx';
import { loadData, saveData } from '@/store/data';

export default function InsurancePage() {
  const [rows, setRows] = useState([]);
  const [formData, setFormData] = useState({});

  useEffect(()=>{ 
    const d = loadData(); 
    setRows(d['insurance'] || []); 
    setFormData(d.formData||{});
  },[]);

  useEffect(()=>{ 
    const d = loadData(); 
    d['insurance'] = rows; 
    saveData(d);
  },[rows]);

  const addRow = ()=> setRows([...rows, {}]);
  const delRow = (idx)=> setRows(rows.filter((_,i)=>i!==idx));

  const columns = [{ field:'policyType', headerName:'Policy' }, { field:'cover', headerName:'Cover', type:'number' }, { field:'premium', headerName:'Premium', type:'number' }];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <GraphDock />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">InsurancePage</h1>
      </div>
      <EditableGrid columns={columns} rows={rows} onChange={setRows} onAdd={addRow} onDelete={delRow} />
    </div>
  );
}
