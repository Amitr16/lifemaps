import React, { useState, useCallback, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Save, Filter, Download, Upload } from 'lucide-react'

// Custom cell editors
const SelectCellEditor = (props) => {
  const [value, setValue] = useState(props.value)
  
  const options = props.colDef.cellEditorParams?.options || []
  
  return (
    <Select value={value} onValueChange={(newValue) => {
      setValue(newValue)
      props.stopEditing(newValue)
    }}>
      <SelectTrigger className="w-full h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const NumberCellEditor = (props) => {
  const [value, setValue] = useState(props.value || 0)
  
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => props.stopEditing(parseFloat(value) || 0)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          props.stopEditing(parseFloat(value) || 0)
        }
      }}
      className="w-full h-8"
      autoFocus
    />
  )
}

const DateCellEditor = (props) => {
  const [value, setValue] = useState(props.value || '')
  
  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => props.stopEditing(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          props.stopEditing(value)
        }
      }}
      className="w-full h-8"
      autoFocus
    />
  )
}

// Custom cell renderers
const CurrencyCellRenderer = (props) => {
  const value = props.value || 0
  return (
    <span className="font-mono">
      ₹{value.toLocaleString('en-IN')}
    </span>
  )
}

const PercentageCellRenderer = (props) => {
  const value = props.value || 0
  return (
    <span className="font-mono">
      {(value * 100).toFixed(2)}%
    </span>
  )
}

const TagCellRenderer = (props) => {
  const value = props.value
  const colorMap = {
    'Investment': 'bg-green-100 text-green-800',
    'Personal': 'bg-blue-100 text-blue-800',
    'Emergency': 'bg-red-100 text-red-800',
    'Retirement': 'bg-purple-100 text-purple-800'
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${colorMap[value] || 'bg-gray-100 text-gray-800'}`}>
      {value}
    </span>
  )
}

// Action cell renderer for delete button
const ActionCellRenderer = (props) => {
  const onDelete = () => {
    if (props.onDelete) {
      props.onDelete(props.data)
    }
  }
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onDelete}
      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  )
}

export default function EnhancedDataGrid({
  data = [],
  columnDefs = [],
  onDataChange,
  onAddRow,
  onDeleteRow,
  title = "Data Grid",
  enableFiltering = true,
  enableSorting = true,
  enableExport = true,
  className = ""
}) {
  const gridRef = useRef()
  const [quickFilterText, setQuickFilterText] = useState('')
  const [selectedRows, setSelectedRows] = useState([])

  // Enhanced column definitions with default settings
  const enhancedColumnDefs = useMemo(() => {
    return columnDefs.map(colDef => ({
      sortable: enableSorting,
      filter: enableFiltering,
      resizable: true,
      editable: true,
      ...colDef,
      // Set appropriate cell editor based on field type
      cellEditor: colDef.cellEditor || (
        colDef.type === 'number' ? NumberCellEditor :
        colDef.type === 'date' ? DateCellEditor :
        colDef.type === 'select' ? SelectCellEditor :
        'agTextCellEditor'
      ),
      // Set appropriate cell renderer based on field type
      cellRenderer: colDef.cellRenderer || (
        colDef.type === 'currency' ? CurrencyCellRenderer :
        colDef.type === 'percentage' ? PercentageCellRenderer :
        colDef.type === 'tag' ? TagCellRenderer :
        undefined
      )
    })).concat([
      // Add action column
      {
        headerName: 'Actions',
        field: 'actions',
        cellRenderer: ActionCellRenderer,
        cellRendererParams: {
          onDelete: onDeleteRow
        },
        sortable: false,
        filter: false,
        editable: false,
        width: 80,
        pinned: 'right'
      }
    ])
  }, [columnDefs, enableSorting, enableFiltering, onDeleteRow])

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    editable: true,
    sortable: true,
    filter: true,
    resizable: true,
  }), [])

  const onCellValueChanged = useCallback((event) => {
    if (onDataChange) {
      const updatedData = [...data]
      const rowIndex = event.rowIndex
      updatedData[rowIndex] = { ...event.data }
      onDataChange(updatedData)
    }
  }, [data, onDataChange])

  const onSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current.api.getSelectedNodes()
    setSelectedRows(selectedNodes.map(node => node.data))
  }, [])

  const onAddRowClick = () => {
    if (onAddRow) {
      onAddRow()
    }
  }

  const onDeleteSelectedRows = () => {
    if (selectedRows.length > 0 && onDeleteRow) {
      selectedRows.forEach(row => onDeleteRow(row))
    }
  }

  const onExportCsv = () => {
    if (gridRef.current) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `${title.toLowerCase().replace(/\s+/g, '-')}.csv`
      })
    }
  }

  const onQuickFilterChanged = (event) => {
    setQuickFilterText(event.target.value)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {enableFiltering && (
            <Input
              type="text"
              placeholder="Quick filter..."
              value={quickFilterText}
              onChange={onQuickFilterChanged}
              className="w-48"
            />
          )}
          <Button onClick={onAddRowClick} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
          {selectedRows.length > 0 && (
            <Button onClick={onDeleteSelectedRows} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete ({selectedRows.length})
            </Button>
          )}
          {enableExport && (
            <Button onClick={onExportCsv} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Data Grid */}
      <div className="ag-theme-alpine" style={{ height: '400px', width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={data}
          columnDefs={enhancedColumnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={onCellValueChanged}
          onSelectionChanged={onSelectionChanged}
          quickFilterText={quickFilterText}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          enableRangeSelection={true}
          enableFillHandle={true}
          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={20}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          animateRows={true}
          rowHeight={40}
          headerHeight={40}
        />
      </div>

      {/* Status bar */}
      <div className="text-sm text-gray-500 flex justify-between">
        <span>{data.length} rows</span>
        {selectedRows.length > 0 && (
          <span>{selectedRows.length} selected</span>
        )}
      </div>
    </div>
  )
}

// Predefined column configurations for different modules
export const assetColumnDefs = [
  { headerName: 'Name', field: 'name', type: 'text', width: 150 },
  { 
    headerName: 'Tag', 
    field: 'tag', 
    type: 'select',
    cellEditorParams: {
      options: [
        { value: 'Investment', label: 'Investment' },
        { value: 'Personal', label: 'Personal' },
        { value: 'Emergency', label: 'Emergency' },
        { value: 'Retirement', label: 'Retirement' }
      ]
    },
    cellRenderer: TagCellRenderer,
    width: 120
  },
  { headerName: 'Sub-type', field: 'subType', type: 'text', width: 120 },
  { headerName: 'Owner', field: 'owner', type: 'text', width: 100 },
  { headerName: 'Currency', field: 'currency', type: 'text', width: 80 },
  { headerName: 'Units', field: 'units', type: 'number', width: 100 },
  { headerName: 'Cost Basis', field: 'costBasis', type: 'currency', width: 120 },
  { headerName: 'Current Value', field: 'currentValue', type: 'currency', width: 140 },
  { headerName: 'Updated At', field: 'updatedAt', type: 'date', width: 120 },
  { headerName: 'Notes', field: 'notes', type: 'text', width: 200 }
]

export const loanColumnDefs = [
  { headerName: 'Lender', field: 'lender', type: 'text', width: 150 },
  { headerName: 'Type', field: 'type', type: 'text', width: 120 },
  { headerName: 'Start Date', field: 'startDate', type: 'date', width: 120 },
  { headerName: 'End Date', field: 'endDate', type: 'date', width: 120 },
  { headerName: 'Principal Outstanding', field: 'principalOutstanding', type: 'currency', width: 180 },
  { headerName: 'Rate (%)', field: 'rate', type: 'percentage', width: 100 },
  { headerName: 'EMI', field: 'emi', type: 'currency', width: 120 },
  { headerName: 'EMI Day', field: 'emiDay', type: 'number', width: 80 },
  { headerName: 'Prepay Allowed', field: 'prepayAllowed', type: 'boolean', width: 120 },
  { headerName: 'Notes', field: 'notes', type: 'text', width: 200 }
]

export const expenseColumnDefs = [
  { headerName: 'Category', field: 'category', type: 'text', width: 150 },
  { headerName: 'Subcategory', field: 'subcategory', type: 'text', width: 150 },
  { 
    headerName: 'Frequency', 
    field: 'frequency', 
    type: 'select',
    cellEditorParams: {
      options: [
        { value: 'Monthly', label: 'Monthly' },
        { value: 'Quarterly', label: 'Quarterly' },
        { value: 'Yearly', label: 'Yearly' }
      ]
    },
    width: 120
  },
  { headerName: 'Amount', field: 'amount', type: 'currency', width: 120 },
  { headerName: 'Personal Inflation %', field: 'personalInflation', type: 'percentage', width: 160 },
  { headerName: 'Source/Receipt', field: 'source', type: 'text', width: 150 },
  { headerName: 'Notes', field: 'notes', type: 'text', width: 200 }
]

export const goalColumnDefs = [
  { headerName: 'Name', field: 'name', type: 'text', width: 150 },
  { headerName: 'Target Amount', field: 'targetAmount', type: 'currency', width: 140 },
  { headerName: 'Target Date', field: 'targetDate', type: 'date', width: 120 },
  { 
    headerName: 'Term', 
    field: 'term', 
    type: 'select',
    cellEditorParams: {
      options: [
        { value: 'ST', label: 'Short Term' },
        { value: 'LT', label: 'Long Term' }
      ]
    },
    width: 100
  },
  { headerName: 'Recommended Allocation', field: 'recommendedAllocation', type: 'text', width: 180 },
  { 
    headerName: 'Funding Source', 
    field: 'fundingSource', 
    type: 'select',
    cellEditorParams: {
      options: [
        { value: 'Portfolio', label: 'Portfolio' },
        { value: 'Savings', label: 'Savings' },
        { value: 'Mix', label: 'Mix' }
      ]
    },
    width: 140
  },
  { headerName: 'On Track', field: 'onTrack', type: 'boolean', width: 100 }
]

