import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Search, Download, Filter, MoreHorizontal, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import ApiService from '@/services/api'

const NotionStyleAssetRegister = () => {
  const { user, isAuthenticated } = useAuth()
  const [assets, setAssets] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTag, setFilterTag] = useState('all')
  const [editingCell, setEditingCell] = useState(null)
  const [tempValue, setTempValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [customColumns, setCustomColumns] = useState([])
  const [editingColumn, setEditingColumn] = useState(null)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnType, setNewColumnType] = useState('text')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [showTagModal, setShowTagModal] = useState(false)
  const [availableTags, setAvailableTags] = useState([])
  const [newTag, setNewTag] = useState('')
  const [loadingTags, setLoadingTags] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Reset loaded state when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      setHasLoaded(false)
    }
  }, [isAuthenticated, user])

  // Load assets and columns from database
  useEffect(() => {
    if (isAuthenticated && user && !hasLoaded && !isLoading) {
      setIsLoading(true)
      const loadAllData = async () => {
        try {
          await Promise.all([
            loadAssets(),
            loadCustomColumns(),
            loadUserTags()
          ])
          setHasLoaded(true)
        } catch (error) {
          console.error('Error loading initial data:', error)
        } finally {
          setIsLoading(false)
        }
      }
      loadAllData()
    }
  }, [isAuthenticated, user, hasLoaded, isLoading])

  const loadAssets = async () => {
    try {
      const response = await ApiService.getFinancialAssets(user.id)
      console.log('📊 Assets fetch response:', response)
      setAssets(response.assets || [])
    } catch (error) {
      console.error('❌ Assets fetch error:', error)
      setError('Failed to load assets')
      throw error // Re-throw to be caught by Promise.all
    }
  }

  const loadCustomColumns = async () => {
    try {
      const response = await ApiService.getAssetColumns(user.id)
      console.log('📊 Columns fetch response:', response)
      
      // Backend will automatically create default columns if none exist
      setCustomColumns(response.columns.map(col => ({
        id: col.id,
        key: col.column_key,
        label: col.column_label,
        type: col.column_type
      })))
    } catch (error) {
      console.error('❌ Columns fetch error:', error)
      setCustomColumns([])
      throw error // Re-throw to be caught by Promise.all
    }
  }

  const loadUserTags = async () => {
    try {
      const response = await ApiService.getUserTags(user.id)
      console.log('🏷️ Tags fetch response:', response)
      
      // Backend will automatically create default tags if none exist
      setAvailableTags(response.tags.map(tag => tag.tag_name))
    } catch (error) {
      console.error('❌ Tags fetch error:', error)
      setAvailableTags(['Investment', 'Personal', 'Emergency', 'Retirement']) // Fallback
      throw error // Re-throw to be caught by Promise.all
    }
  }

  const filteredAssets = assets.filter(asset => {
    const customData = asset.custom_data || {}
    const matchesSearch = asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customData.subType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customData.owner?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterTag === 'all' || asset.tag === filterTag
    return matchesSearch && matchesFilter
  })

  // Sort assets based on sortConfig
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    if (!sortConfig.key) return 0

    let aValue, bValue

    // Get values based on sort key
    if (['name', 'tag', 'current_value'].includes(sortConfig.key)) {
      aValue = a[sortConfig.key]
      bValue = b[sortConfig.key]
    } else {
      // Custom column data
      aValue = a.custom_data?.[sortConfig.key] || ''
      bValue = b.custom_data?.[sortConfig.key] || ''
    }

    // Handle different data types for sorting
    const column = customColumns.find(col => col.key === sortConfig.key)
    const columnType = column?.type || 'text'

    if (columnType === 'number' || columnType === 'currency') {
      aValue = parseFloat(aValue) || 0
      bValue = parseFloat(bValue) || 0
    } else if (columnType === 'date') {
      aValue = new Date(aValue).getTime() || 0
      bValue = new Date(bValue).getTime() || 0
    } else {
      // Text, email, url - case insensitive string comparison
      aValue = String(aValue).toLowerCase()
      bValue = String(bValue).toLowerCase()
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1
    }
    return 0
  })

  const handleAddAsset = async () => {
    try {
      setLoading(true)
      const response = await ApiService.createFinancialAsset({
        name: 'New Asset',
        tag: 'Investment',
        current_value: 0,
        custom_data: {
          subType: '',
          owner: '',
          currency: 'INR',
          units: 0,
          costBasis: 0,
          notes: ''
        }
      })
      
      if (response.asset) {
        setAssets([...assets, response.asset])  // Add at end instead of beginning
      }
    } catch (error) {
      console.error('❌ Asset creation error:', error)
      setError('Failed to create asset')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAsset = async (assetId) => {
    if (!assetId) return
    
    try {
      setLoading(true)
      await ApiService.deleteFinancialAsset(assetId)
      setAssets(assets.filter(asset => asset.id !== assetId))
    } catch (error) {
      console.error('❌ Asset deletion error:', error)
      setError('Failed to delete asset')
    } finally {
      setLoading(false)
    }
  }

  const handleCellEdit = (assetId, field, value) => {
    setEditingCell({ assetId, field })
    setTempValue(value)
  }

  const handleCellSave = async (assetId, field, value = null) => {
    if (editingCell?.assetId === assetId && editingCell?.field === field) {
      try {
        setLoading(true)
        
        // Use provided value or tempValue
        const saveValue = value !== null ? value : tempValue
        
        // Determine if it's a core field or custom data field
        let updateData = {}
        if (['name', 'tag', 'current_value'].includes(field)) {
          updateData[field] = saveValue
          if (field === 'tag') {
            console.log('🏷️ Tag update data:', { field, saveValue, updateData })
          }
        } else {
          // Update custom_data
          const asset = assets.find(a => a.id === assetId)
          const customData = asset?.custom_data || {}
          updateData.custom_data = {
            ...customData,
            [field]: saveValue
          }
        }
        
        console.log('💾 Saving asset field:', { assetId, field, updateData })
        
        const response = await ApiService.updateFinancialAsset(assetId, updateData)
        
        if (response.asset) {
          setAssets(assets.map(asset => 
            asset.id === assetId ? response.asset : asset
          ))
          console.log('✅ Asset updated successfully')
        }
        
        setEditingCell(null)
        setTempValue('')
      } catch (error) {
        console.error('❌ Asset update error:', error)
        setError('Failed to update asset')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setTempValue('')
  }

  const handleAddColumn = async () => {
    if (newColumnName.trim()) {
      try {
        setLoading(true)
        const columnKey = newColumnName.toLowerCase().replace(/\s+/g, '')
        
        const response = await ApiService.createAssetColumn({
          column_key: columnKey,
          column_label: newColumnName.trim(),
          column_type: newColumnType,
          column_order: customColumns.length
        })
        
        if (response.column) {
          const newColumn = {
            id: response.column.id,
            key: response.column.column_key,
            label: response.column.column_label,
            type: response.column.column_type
          }
          setCustomColumns([...customColumns, newColumn])
          console.log('✅ Column created successfully:', newColumn)
        }
        
        setNewColumnName('')
        setEditingColumn(null)
      } catch (error) {
        console.error('❌ Column creation error:', error)
        setError('Failed to create column')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDeleteColumn = async (columnKey) => {
    try {
      const column = customColumns.find(col => col.key === columnKey)
      if (column && column.id) {
        setLoading(true)
        await ApiService.deleteAssetColumn(column.id)
        setCustomColumns(customColumns.filter(col => col.key !== columnKey))
        console.log('✅ Column deleted successfully:', columnKey)
      } else {
        // Fallback for columns without ID (default columns)
        setCustomColumns(customColumns.filter(col => col.key !== columnKey))
      }
    } catch (error) {
      console.error('❌ Column deletion error:', error)
      setError('Failed to delete column')
    } finally {
      setLoading(false)
    }
  }

  const handleRenameColumn = (columnKey, newLabel) => {
    setCustomColumns(customColumns.map(col => 
      col.key === columnKey ? { ...col, label: newLabel } : col
    ))
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <span className="text-gray-400">↕️</span>
    }
    return sortConfig.direction === 'asc' ? <span className="text-blue-500">↑</span> : <span className="text-blue-500">↓</span>
  }

  const handleAddTag = async () => {
    if (newTag.trim() && !availableTags.includes(newTag.trim())) {
      try {
        setLoadingTags(true)
        const response = await ApiService.createUserTag({
          tag_name: newTag.trim(),
          tag_order: availableTags.length
        })
        
        console.log('✅ Tag created:', response.tag)
        setAvailableTags([...availableTags, newTag.trim()])
        setNewTag('')
      } catch (error) {
        console.error('❌ Error creating tag:', error)
        setError('Failed to create tag: ' + (error.message || 'Unknown error'))
      } finally {
        setLoadingTags(false)
      }
    }
  }

  const handleRemoveTag = async (tagToRemove) => {
    if (availableTags.length > 1) { // Keep at least one tag
      try {
        setLoadingTags(true)
        
        // Find the tag ID from the database
        const response = await ApiService.getUserTags(user.id)
        const tagToDelete = response.tags.find(tag => tag.tag_name === tagToRemove)
        
        if (tagToDelete) {
          await ApiService.deleteUserTag(tagToDelete.id)
          console.log('✅ Tag deleted:', tagToRemove)
          setAvailableTags(availableTags.filter(tag => tag !== tagToRemove))
        }
      } catch (error) {
        console.error('❌ Error deleting tag:', error)
        setError('Failed to delete tag: ' + (error.message || 'Unknown error'))
      } finally {
        setLoadingTags(false)
      }
    }
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleRefresh = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setHasLoaded(false)
    try {
      await Promise.all([
        loadAssets(),
        loadCustomColumns(),
        loadUserTags()
      ])
      setHasLoaded(true)
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      
      // Prepare CSV headers
      const headers = [
        'Name',
        'Tag', 
        'Current Value',
        ...customColumns.map(col => col.label),
        'Updated'
      ]

      // Prepare CSV data
      const csvData = sortedAssets.map(asset => {
        const customData = asset.custom_data || {}
        const row = [
          asset.name || '',
          asset.tag || '',
          asset.current_value || 0,
          ...customColumns.map(col => customData[col.key] || ''),
          asset.updated_at ? new Date(asset.updated_at).toLocaleDateString() : ''
        ]
        return row
      })

      // Convert to CSV format
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          row.map(cell => {
            // Escape commas and quotes in cell values
            const escaped = String(cell).replace(/"/g, '""')
            return `"${escaped}"`
          }).join(',')
        )
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `assets-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log('✅ CSV exported successfully')
    } catch (error) {
      console.error('❌ CSV export error:', error)
      setError('Failed to export CSV: ' + (error.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  const formatCurrency = (amount) => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0
    if (numAmount >= 10000000) {
      return `₹${(numAmount / 10000000).toFixed(1)}Cr`
    } else if (numAmount >= 100000) {
      return `₹${(numAmount / 100000).toFixed(1)}L`
    } else if (numAmount >= 1000) {
      return `₹${(numAmount / 1000).toFixed(1)}K`
    }
    return `₹${numAmount.toFixed(0)}`
  }

  const getTagColor = (tag) => {
    switch (tag) {
      case 'Investment': return 'bg-green-100 text-green-800'
      case 'Personal': return 'bg-blue-100 text-blue-800'
      case 'Emergency': return 'bg-red-100 text-red-800'
      case 'Retirement': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getInputType = (columnType) => {
    switch (columnType) {
      case 'number': return 'number'
      case 'currency': return 'number'
      case 'date': return 'date'
      case 'email': return 'email'
      case 'url': return 'url'
      default: return 'text'
    }
  }

  const formatCellValue = (value, columnType) => {
    if (!value) return 'Click to edit'
    
    switch (columnType) {
      case 'currency':
        return formatCurrency(parseFloat(value) || 0)
      case 'date':
        return new Date(value).toLocaleDateString()
      case 'email':
        return value
      case 'url':
        return value
      case 'number':
        return parseFloat(value) || 0
      default:
        return value
    }
  }

  // Use all assets for summary calculations (not filtered or sorted)
  const totalValue = assets.reduce((sum, asset) => sum + (parseFloat(asset.current_value) || 0), 0)

  // Update financial profile when total assets value changes
  useEffect(() => {
    if (isAuthenticated && user && totalValue > 0) {
      const updateFinancialProfile = async () => {
        try {
          // First get the profile to get the profile ID
          const response = await ApiService.getFinancialProfile(user.id)
          if (response && response.profile && response.profile.id) {
            await ApiService.updateFinancialProfile(response.profile.id, {
              total_asset_gross_market_value: totalValue
            })
            console.log('✅ Updated financial profile with total assets:', totalValue)
          }
        } catch (error) {
          console.error('❌ Error updating financial profile:', error)
        }
      }
      
      // Debounce the update to avoid too many API calls
      const timeoutId = setTimeout(updateFinancialProfile, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [totalValue, isAuthenticated, user])
  const investmentAssets = assets.filter(asset => asset.tag === 'Investment')
  const personalAssets = assets.filter(asset => asset.tag === 'Personal')
  const investmentValue = investmentAssets.reduce((sum, asset) => sum + (parseFloat(asset.current_value) || 0), 0)
  const personalValue = personalAssets.reduce((sum, asset) => sum + (parseFloat(asset.current_value) || 0), 0)

  // Debug logging
  console.log('🔍 Asset calculations:', {
    totalAssets: assets.length,
    filteredAssets: filteredAssets.length,
    sortedAssets: sortedAssets.length,
    sortConfig,
    totalValue,
    investmentValue,
    personalValue,
    allAssetValues: assets.map(a => ({ name: a.name, tag: a.tag, value: a.current_value })),
    investmentAssets: investmentAssets.map(a => ({ name: a.name, value: a.current_value })),
    personalAssets: personalAssets.map(a => ({ name: a.name, value: a.current_value }))
  })

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Investment Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(investmentValue)}
            </div>
            <p className="text-xs text-gray-500">{investmentAssets.length} assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Personal Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(personalValue)}
            </div>
            <p className="text-xs text-gray-500">{personalAssets.length} assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-xs text-gray-500">{assets.length} total assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Register */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Asset Register</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Quick filter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  <SelectItem value="Investment">Investment</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                  <SelectItem value="Retirement">Retirement</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddAsset} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
              <Button 
                variant="outline"
                onClick={() => setEditingColumn('new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleExportCSV} disabled={exporting}>
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading assets...</p>
              </div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-lg font-medium">No assets found</p>
              <p className="text-sm">Add your first asset to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
            {/* Table Header */}
            <div className="grid gap-4 p-3 bg-gray-50 rounded-lg font-medium text-sm text-gray-600" 
                 style={{ gridTemplateColumns: `2fr 1fr 1fr ${customColumns.map(() => '1fr').join(' ')} 1fr 1fr` }}>
              <div 
                className="flex items-center gap-1 cursor-pointer hover:text-gray-800 select-none"
                onClick={() => handleSort('name')}
              >
                Name {getSortIcon('name')}
              </div>
              <div 
                className="flex items-center justify-between group cursor-pointer hover:text-gray-800 select-none"
                onClick={() => handleSort('tag')}
              >
                <div className="flex items-center gap-1">
                  Tag {getSortIcon('tag')}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowTagModal(true)
                  }}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
              <div 
                className="flex items-center gap-1 cursor-pointer hover:text-gray-800 select-none"
                onClick={() => handleSort('current_value')}
              >
                Current Value {getSortIcon('current_value')}
              </div>
              {customColumns.map((column) => (
                <div key={column.key} className="flex items-center justify-between group">
                  <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-gray-800 select-none flex-1"
                    onClick={() => handleSort(column.key)}
                  >
                    <span>{column.label}</span>
                    {getSortIcon(column.key)}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setEditingColumn(column.key)}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteColumn(column.key)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div 
                className="flex items-center gap-1 cursor-pointer hover:text-gray-800 select-none"
                onClick={() => handleSort('updated_at')}
              >
                Updated {getSortIcon('updated_at')}
              </div>
              <div>Actions</div>
            </div>

              {/* Table Rows */}
              {sortedAssets.map((asset, index) => {
                const customData = asset.custom_data || {}
                return (
                <div key={asset.id || index} className="grid gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors" 
                     style={{ gridTemplateColumns: `2fr 1fr 1fr ${customColumns.map(() => '1fr').join(' ')} 1fr 1fr` }}>
                  
                  {/* Fixed Column 1: Name */}
                  <div>
                    {editingCell?.assetId === asset.id && editingCell?.field === 'name' ? (
                      <Input
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => handleCellSave(asset.id, 'name')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCellSave(asset.id, 'name')
                          if (e.key === 'Escape') handleCellCancel()
                        }}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded font-medium"
                        onClick={() => handleCellEdit(asset.id, 'name', asset.name || '')}
                      >
                        {asset.name || 'Click to edit'}
                      </div>
                    )}
                  </div>

                  {/* Fixed Column 2: Tag */}
                  <div>
                    {editingCell?.assetId === asset.id && editingCell?.field === 'tag' ? (
                      <Select 
                        value={tempValue} 
                        onValueChange={(value) => {
                          console.log('🏷️ Tag changed to:', value)
                          setTempValue(value)
                          // Auto-save when tag is selected, pass value directly
                          setTimeout(() => {
                            console.log('🏷️ Saving tag:', value, 'for asset:', asset.id)
                            handleCellSave(asset.id, 'tag', value)
                          }, 100)
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTags.map((tag) => (
                            <SelectItem key={tag} value={tag}>
                              {tag}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                        onClick={() => handleCellEdit(asset.id, 'tag', asset.tag || '')}
                      >
                        <Badge className={`${getTagColor(asset.tag)}`}>
                          {asset.tag || 'Click to edit'}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Fixed Column 3: Current Value */}
                  <div>
                    {editingCell?.assetId === asset.id && editingCell?.field === 'current_value' ? (
                      <Input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => handleCellSave(asset.id, 'current_value')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCellSave(asset.id, 'current_value')
                          if (e.key === 'Escape') handleCellCancel()
                        }}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded font-medium"
                        onClick={() => handleCellEdit(asset.id, 'current_value', asset.current_value || 0)}
                      >
                        {formatCurrency(asset.current_value || 0)}
                      </div>
                    )}
                  </div>

                  {/* Dynamic Custom Columns */}
                  {customColumns.map((column) => (
                    <div key={column.key}>
                      {editingCell?.assetId === asset.id && editingCell?.field === column.key ? (
                        <Input
                          type={getInputType(column.type)}
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleCellSave(asset.id, column.key)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCellSave(asset.id, column.key)
                            if (e.key === 'Escape') handleCellCancel()
                          }}
                          className="h-8"
                          autoFocus
                        />
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                          onClick={() => handleCellEdit(asset.id, column.key, customData[column.key] || '')}
                        >
                          {formatCellValue(customData[column.key], column.type)}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Fixed Column 4: Updated At */}
                  <div className="text-sm text-gray-500">
                    {asset.updated_at ? new Date(asset.updated_at).toLocaleDateString() : 'N/A'}
                  </div>

                  {/* Fixed Column 5: Actions */}
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                )
              })}

              {/* Add New Row - Empty Row */}
              <div 
                className="grid gap-4 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer group" 
                style={{ gridTemplateColumns: `2fr 1fr 1fr ${customColumns.map(() => '1fr').join(' ')} 1fr 1fr` }}
                onClick={handleAddAsset}
              >
                {/* Fixed Column 1: Name */}
                <div className="flex items-center text-gray-500 group-hover:text-blue-600">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="text-sm">Click to add new asset</span>
                </div>

                {/* Fixed Column 2: Tag */}
                <div className="flex items-center text-gray-400">
                  <span className="text-sm">-</span>
                </div>

                {/* Fixed Column 3: Current Value */}
                <div className="flex items-center text-gray-400">
                  <span className="text-sm">-</span>
                </div>

                {/* Custom Columns */}
                {customColumns.map((column) => (
                  <div key={column.key} className="flex items-center text-gray-400">
                    <span className="text-sm">-</span>
                  </div>
                ))}

                {/* Fixed Column 4: Updated */}
                <div className="flex items-center text-gray-400">
                  <span className="text-sm">-</span>
                </div>

                {/* Fixed Column 5: Actions */}
                <div className="flex items-center text-gray-400">
                  <span className="text-sm">-</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>{filteredAssets.length} rows</span>
            <div className="flex items-center gap-2">
              <span>Total Value: {formatCurrency(totalValue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Column Modal */}
      <Dialog open={editingColumn === 'new'} onOpenChange={(open) => {
        if (!open) {
          setEditingColumn(null)
          setNewColumnName('')
          setNewColumnType('text')
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
            <DialogDescription>
              Create a new custom column for your asset register
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Column Name
              </label>
              <Input
                placeholder="Column name (e.g., 'Purchase Date')"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn()
                  if (e.key === 'Escape') setEditingColumn(null)
                }}
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Type
              </label>
              <Select value={newColumnType} onValueChange={setNewColumnType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Choose the data type for proper sorting and validation
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditingColumn(null)
                setNewColumnName('')
                setNewColumnType('text')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim()}>
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Tag Management Modal */}
      {showTagModal && (
        <Dialog open={showTagModal} onOpenChange={setShowTagModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Tags</DialogTitle>
              <DialogDescription>
                Add or remove tag options for your assets
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Current Tags */}
              <div>
                <h4 className="text-sm font-medium mb-2">Current Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                    >
                      <span>{tag}</span>
                      {availableTags.length > 1 && (
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          disabled={loadingTags}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Tag */}
              <div>
                <h4 className="text-sm font-medium mb-2">Add New Tag</h4>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Enter tag name"
                    className="flex-1"
                    disabled={loadingTags}
                  />
                  <Button 
                    onClick={handleAddTag} 
                    disabled={!newTag.trim() || loadingTags}
                  >
                    {loadingTags ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTagModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default NotionStyleAssetRegister
