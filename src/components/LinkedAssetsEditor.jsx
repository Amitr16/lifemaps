import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Save, X, AlertTriangle } from 'lucide-react'

const LinkedAssetsEditor = ({ 
  value = [], 
  onChange, 
  availableAssets = [],
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [linkedAssets, setLinkedAssets] = useState([])
  const [newAssetId, setNewAssetId] = useState('')
  const [newPercent, setNewPercent] = useState('')
  const [errors, setErrors] = useState({})

  // Initialize linked assets when value changes
  useEffect(() => {
    console.log('🔄 LinkedAssetsEditor useEffect - value changed:', { value, valueType: typeof value, valueLength: value?.length });
    setLinkedAssets(value || [])
  }, [value])

  const handleOpen = () => {
    console.log('🔓 Dialog opening:', { 
      value, 
      valueLength: value?.length || 0,
      availableAssets: availableAssets.length,
      availableAssetsList: availableAssets.map(a => ({ id: a.id, name: a.name }))
    })
    setIsOpen(true)
    setLinkedAssets(value || [])
    setNewAssetId('')
    setNewPercent('')
    setErrors({})
  }

  const handleClose = () => {
    console.log('🔒 Dialog closing, resetting to original value:', { value, currentLinkedAssets: linkedAssets })
    setIsOpen(false)
    setLinkedAssets(value || [])
    setNewAssetId('')
    setNewPercent('')
    setErrors({})
  }

  const handleAddLinkedAsset = () => {
    console.log('➕ handleAddLinkedAsset called:', { newAssetId, newPercent, currentLinkedAssets: linkedAssets })
    
    const errors = {}
    
    if (!newAssetId) errors.asset = 'Please select an asset'
    if (!newPercent || isNaN(newPercent) || parseFloat(newPercent) <= 0) {
      errors.percent = 'Please enter a valid percentage'
    }

    if (Object.keys(errors).length > 0) {
      console.log('❌ Validation errors:', errors)
      setErrors(errors)
      return
    }

    const percent = parseFloat(newPercent)
    
    // Check for duplicates
    const isDuplicate = linkedAssets.some(la => la.assetId === newAssetId)

    if (isDuplicate) {
      console.log('❌ Duplicate asset detected')
      setErrors({ asset: 'This asset is already linked' })
      return
    }

    const newLinkedAsset = {
      assetId: newAssetId,
      assetName: availableAssets.find(a => a.id === newAssetId)?.name || 'Unknown Asset',
      percent: percent
    }

    const updatedLinkedAssets = [...linkedAssets, newLinkedAsset]
    console.log('✅ Adding new linked asset:', { newLinkedAsset, updatedLinkedAssets })
    setLinkedAssets(updatedLinkedAssets)
    console.log('✅ Local state updated, linkedAssets now has length:', updatedLinkedAssets.length)
    setNewAssetId('')
    setNewPercent('')
    setErrors({})
  }

  const handleRemoveLinkedAsset = (index) => {
    console.log('🗑️ handleRemoveLinkedAsset called with index:', index, 'Current linkedAssets:', linkedAssets)
    const updatedLinkedAssets = linkedAssets.filter((_, i) => i !== index)
    console.log('🗑️ Updated linkedAssets after removal:', updatedLinkedAssets)
    setLinkedAssets(updatedLinkedAssets)
    console.log('🗑️ Local state updated, linkedAssets now has length:', updatedLinkedAssets.length)
    // Don't call onChange immediately - wait for user to save
  }

  const handleUpdatePercent = (index, newPercent) => {
    const percent = parseFloat(newPercent) || 0
    const updatedLinkedAssets = linkedAssets.map((la, i) => 
      i === index ? { ...la, percent } : la
    )
    setLinkedAssets(updatedLinkedAssets)
    setErrors({})
    console.log('📊 Updating linked asset percent locally:', updatedLinkedAssets)
    // Don't call onChange immediately - wait for user to save
  }

  const handleSave = () => {
    console.log('💾 LinkedAssetsEditor handleSave called:', { 
      linkedAssets, 
      linkedAssetsLength: linkedAssets.length,
      onChange: typeof onChange,
      isFunction: typeof onChange === 'function'
    })
    
    if (typeof onChange === 'function') {
      console.log('💾 Calling onChange with linkedAssets:', linkedAssets)
      onChange(linkedAssets)
      console.log('💾 onChange called successfully')
    } else {
      console.error('❌ onChange is not a function:', onChange)
    }
    
    setIsOpen(false)
    console.log('💾 Dialog closed after save')
  }

  const getAvailableAssets = () => {
    return availableAssets.filter(asset => 
      !linkedAssets.some(la => la.assetId === asset.id)
    )
  }

  return (
    <>
      <div className={`${className}`}>
        <div 
          className="min-h-[40px] p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => {
            console.log('🔘 Cell clicked!')
            handleOpen()
          }}
        >
          {linkedAssets.length === 0 ? (
            <div className="text-gray-500 text-sm">
              Click to earmark goals
            </div>
          ) : (
            <div className="space-y-2">
              {linkedAssets.map((linkedAsset, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                  <Badge variant="outline" className="text-xs">
                    {linkedAsset.assetName}
                  </Badge>
                  <span className="text-sm font-medium">
                    {linkedAsset.percent}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Linked Assets</DialogTitle>
            <DialogDescription>
              Link assets to this goal with their contribution percentages.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Linked Assets */}
            <div>
              <h4 className="text-sm font-medium mb-2">Current Linked Assets</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {linkedAssets.map((linkedAsset, index) => (
                  <Card key={index} className="p-3">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {linkedAsset.assetName}
                          </Badge>
                          <Input
                            type="number"
                            value={linkedAsset.percent}
                            onChange={(e) => handleUpdatePercent(index, e.target.value)}
                            className="w-20 h-8"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🗑️ Delete button clicked for index:', index);
                            handleRemoveLinkedAsset(index);
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Remove linked asset"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Add New Linked Asset */}
            <div>
              <h4 className="text-sm font-medium mb-2">Add New Linked Asset</h4>
              <div className="flex items-center gap-2">
                <Select value={newAssetId} onValueChange={setNewAssetId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableAssets().map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input
                  type="number"
                  placeholder="%"
                  value={newPercent}
                  onChange={(e) => setNewPercent(e.target.value)}
                  className="w-20"
                  min="0"
                  max="100"
                  step="0.1"
                />
                
                <Button onClick={handleAddLinkedAsset} disabled={!newAssetId || !newPercent}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {Object.keys(errors).length > 0 && (
                <div className="text-sm text-red-600 mt-2">
                  {Object.values(errors).join(', ')}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                console.log('🔵 Save Changes button clicked!')
                handleSave()
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default LinkedAssetsEditor
