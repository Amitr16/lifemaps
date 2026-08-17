
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
    <div className="overflow-x-auto border border-[#e2e8f2] rounded-[14px] bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-[#f6f8fb]">
          <tr>
            {columns.map(col=>(
              <th key={col.field} className="px-3 py-3 text-left font-bold text-[10.5px] tracking-[0.09em] uppercase text-[#9aa7bd] min-w-[120px]">{col.headerName}</th>
            ))}
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx)=>(
            <tr key={row.id || idx} className="border-t border-[#e2e8f2] hover:bg-[#fbfcfe]">
              {columns.map(col=>(
                <td key={col.field} className="px-2 py-1 min-w-[120px] text-[#0a1f44]">
                  {col.render ? col.render(row, (v)=>handleCell(idx, col.field, v)) : 
                   col.type === 'select' && col.options ? (
                    <select
                      className="w-full border border-transparent rounded-lg px-2 py-2 min-w-[100px] text-sm bg-transparent text-[#0a1f44] hover:bg-[#f6f8fb] focus:border-[#003c8f] focus:bg-white"
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
                      className="w-full border border-transparent rounded-lg px-2 py-2 min-w-[100px] text-sm bg-transparent text-[#0a1f44] placeholder:text-[#9aa7bd] hover:bg-[#f6f8fb] focus:border-[#003c8f] focus:bg-white focus:outline-none"
                      type={col.type || 'text'}
                      value={row[col.field] ?? ''}
                      onChange={e=>handleCell(idx, col.field, e.target.value)}
                      onBlur={(e) => {
                        if (col.onBlur) {
                          col.onBlur(row, idx, e.target.value, handleCell);
                        }
                        if (onCellChange) {
                          onCellChange(idx, col.field, e.target.value);
                        }
                      }}
                    />
                  )}
                </td>
              ))}
              <td className="px-3 py-1">
                <button className="text-[#e2574c] text-sm hover:underline" onClick={()=>onDelete(idx)}>Delete</button>
              </td>
            </tr>
          ))}
          <tr className="border-t border-[#e2e8f2]">
            <td
              colSpan={columns.length + 1}
              className="px-4 py-3 text-sm text-[#003c8f] cursor-pointer font-bold hover:bg-[#eef3fa]"
              onClick={onAdd}
            >
              + Click to add a new row
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
