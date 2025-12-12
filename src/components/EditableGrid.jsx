
import React, { useMemo } from 'react';

export default function EditableGrid({ columns, rows, onChange, onAdd, onDelete, onCellChange }){
  // Add error handling for missing props
  if (!columns || !Array.isArray(columns)) {
    console.error('EditableGrid: columns prop is missing or not an array', columns);
    return <div className="p-4 text-red-600">Error: Invalid columns configuration</div>;
  }
  
  if (!rows || !Array.isArray(rows)) {
    console.error('EditableGrid: rows prop is missing or not an array', rows);
    return <div className="p-4 text-red-600">Error: Invalid rows data</div>;
  }

  const handleCell = (rowIdx, field, value)=>{
    try {
      const next = rows.map((r,i)=> i===rowIdx ? ({...r, [field]: value}) : r);
      onChange(next);
      
      // Call onCellChange if provided for auto-save functionality
      if (onCellChange) {
        onCellChange(rowIdx, field, value);
      }
    } catch (error) {
      console.error('Error in handleCell:', error);
    }
  };
  
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(col=>(
              <th key={col.field} className="px-4 py-2 text-left font-semibold min-w-[120px]">{col.headerName}</th>
            ))}
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx)=>(
            <tr key={row.id || idx} className="border-t">
              {columns.map(col=>(
                <td key={col.field} className="px-4 py-2 min-w-[120px]">
                  {col.render ? col.render(row, (v)=>handleCell(idx, col.field, v)) : 
                   col.type === 'select' && col.options ? (
                    <select
                      className="w-full border rounded px-2 py-1 min-w-[100px]"
                      value={row[col.field] ?? ''}
                      onChange={e=>handleCell(idx, col.field, e.target.value)}
                      onBlur={col.onBlur ? (e) => col.onBlur(row, idx, e.target.value, handleCell) : undefined}
                    >
                      <option value="">Select {col.headerName}</option>
                      {(typeof col.options === 'function' ? col.options(row) : col.options).map(opt => (
                        <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                          {typeof opt === 'string' ? opt : (opt.label || opt.value)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full border rounded px-2 py-1 min-w-[100px]"
                      type={col.type || 'text'}
                      value={row[col.field] ?? ''}
                      onChange={e=>handleCell(idx, col.field, e.target.value)}
                      onBlur={(e) => {
                        // Call column-specific onBlur if provided
                        if (col.onBlur) {
                          col.onBlur(row, idx, e.target.value, handleCell);
                        }
                        // Always trigger onCellChange for auto-save (if provided)
                        if (onCellChange) {
                          onCellChange(idx, col.field, e.target.value);
                        }
                      }}
                    />
                  )}
                </td>
              ))}
              <td className="px-3 py-1">
                <button className="text-red-600" onClick={()=>onDelete(idx)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2">
        <button className="px-3 py-1 bg-black text-white rounded" onClick={onAdd}>Add Row</button>
      </div>
    </div>
  );
}
