import React, { useEffect } from 'react'
import EnhancedDataGrid from '@/components/EnhancedDataGrid.jsx'
import GlobalGraphDock from '@/components/GlobalGraphDock.jsx'
import { useLifeSheetStore } from '@/store/enhanced-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const dependantsColumnDefs = [
  { headerName: 'Name', field: 'name', type: 'text', width: 150 },
  { 
    headerName: 'Relation', 
    field: 'relation', 
    type: 'select',
    cellEditorParams: {
      options: [
        { value: 'Spouse', label: 'Spouse' },
        { value: 'Child', label: 'Child' },
        { value: 'Parent', label: 'Parent' },
        { value: 'Sibling', label: 'Sibling' },
        { value: 'Other', label: 'Other' }
      ]
    },
    width: 120
  },
  { headerName: 'Birth Date', field: 'birthDate', type: 'date', width: 120 },
  { 
    headerName: 'Role', 
    field: 'role', 
    type: 'select',
    cellEditorParams: {
      options: [
        { value: 'Dependant', label: 'Dependant' },
        { value: 'Contributor', label: 'Contributor' },
        { value: 'Both', label: 'Both' }
      ]
    },
    width: 120
  },
  { headerName: 'Expense Share %', field: 'expenseShare', type: 'percentage', width: 140 },
  { headerName: 'Income Share %', field: 'incomeShare', type: 'percentage', width: 140 },
  { headerName: 'Notes', field: 'notes', type: 'text', width: 200 }
]

export default function DependantsPage() {
  const {
    persons,
    addPerson,
    updatePerson,
    deletePerson,
    loadFromLocalStorage
  } = useLifeSheetStore()

  useEffect(() => {
    loadFromLocalStorage()
  }, [loadFromLocalStorage])

  const handleDataChange = (updatedData) => {
    // Update each person that has changed
    updatedData.forEach((person, index) => {
      const originalPerson = persons[index]
      if (originalPerson && JSON.stringify(person) !== JSON.stringify(originalPerson)) {
        updatePerson(person.id, person)
      }
    })
  }

  const handleAddRow = () => {
    addPerson({
      name: 'New Person',
      relation: 'Child',
      birthDate: '',
      role: 'Dependant',
      expenseShare: 0,
      incomeShare: 0,
      notes: ''
    })
  }

  const handleDeleteRow = (person) => {
    if (person.id) {
      deletePerson(person.id)
    }
  }

  // Calculate summary statistics
  const dependants = persons.filter(person => person.role === 'Dependant' || person.role === 'Both')
  const contributors = persons.filter(person => person.role === 'Contributor' || person.role === 'Both')
  const totalExpenseShare = persons.reduce((sum, person) => sum + (person.expenseShare || 0), 0)
  const totalIncomeShare = persons.reduce((sum, person) => sum + (person.incomeShare || 0), 0)

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <GlobalGraphDock />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dependants & Contributors</h1>
          <p className="text-gray-600">Manage family members and their financial impact</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            {persons.length} people
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Dependants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {dependants.length}
            </div>
            <p className="text-xs text-gray-500">People depending on you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {contributors.length}
            </div>
            <p className="text-xs text-gray-500">People contributing income</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Expense Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalExpenseShare.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">Total expense allocation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Income Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalIncomeShare.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">Total income contribution</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Data Grid */}
      <EnhancedDataGrid
        data={persons}
        columnDefs={dependantsColumnDefs}
        onDataChange={handleDataChange}
        onAddRow={handleAddRow}
        onDeleteRow={handleDeleteRow}
        title="Family Members"
        enableFiltering={true}
        enableSorting={true}
        enableExport={true}
      />

      {/* Information */}
      <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
        <p>
          <strong>How it works:</strong> Adding dependants and contributors adjusts your expense 
          and income projections. Expense shares increase your total expenses, while income shares 
          reduce your personal income burden in the financial projections.
        </p>
      </div>

      {/* Back-link info */}
      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p>
          <strong>Back-link:</strong> Changes here affect your "Family Structure" and expense/income 
          calculations in your Life Sheet projections.
        </p>
      </div>
    </div>
  )
}

