import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Save, X, AlertTriangle } from 'lucide-react'

const EarmarkingInput = ({ 
  value = [], 
  onChange, 
  availableGoals = [],
  totalAllocation = 0,
  maxAllocation = 100,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [earmarks, setEarmarks] = useState([])
  const [newGoalId, setNewGoalId] = useState('')
  const [newPercent, setNewPercent] = useState('')
  const [errors, setErrors] = useState({})

  // Initialize earmarks when value changes
  useEffect(() => {
    console.log('🔄 EarmarkingInput useEffect - value changed:', { value, valueType: typeof value, valueLength: value?.length });
    console.log('🔄 EarmarkingInput earmarks data:', value);
    if (value && value.length > 0) {
      console.log('🔄 First earmark details:', value[0]);
    }
    setEarmarks(value || [])
  }, [value])

  const handleOpen = () => {
    console.log('🎯 EarmarkingInput handleOpen called:', { availableGoalsCount: availableGoals.length, availableGoals })
    setIsOpen(true)
    setEarmarks(value || [])
    setNewGoalId('')
    setNewPercent('')
    setErrors({})
  }

  const handleClose = () => {
    setIsOpen(false)
    setEarmarks(value || [])
    setNewGoalId('')
    setNewPercent('')
    setErrors({})
  }

  const handleAddEarmark = () => {
    console.log('➕ EarmarkingInput handleAddEarmark called:', { newGoalId, newPercent, availableGoalsCount: availableGoals.length })
    
    const errors = {}
    
    if (!newGoalId) errors.goal = 'Please select a goal'
    if (!newPercent || isNaN(newPercent) || parseFloat(newPercent) <= 0) {
      errors.percent = 'Please enter a valid percentage'
    }

    if (Object.keys(errors).length > 0) {
      console.log('❌ Validation errors:', errors)
      setErrors(errors)
      return
    }

    const percent = parseFloat(newPercent)
    const currentTotal = earmarks.reduce((sum, e) => sum + (e.percent || 0), 0)
    
    if (currentTotal + percent > maxAllocation) {
      setErrors({ percent: `Total allocation cannot exceed ${maxAllocation}%` })
      return
    }

    // Check for duplicates
    const isDuplicate = earmarks.some(e => e.goalId === newGoalId)

    if (isDuplicate) {
      setErrors({ goal: 'This goal is already earmarked' })
      return
    }

    const selectedGoal = availableGoals.find(g => g.id === newGoalId)
    const newEarmark = {
      goalId: newGoalId,
      goalName: selectedGoal ? (selectedGoal.name || selectedGoal.description || 'Unknown Goal') : 'Unknown Goal',
      percent: percent
    }

    const updatedEarmarks = [...earmarks, newEarmark]
    console.log('✅ Adding new earmark locally:', newEarmark, 'Updated earmarks:', updatedEarmarks)
    setEarmarks(updatedEarmarks)
    setNewGoalId('')
    setNewPercent('')
    setErrors({})
    // Don't call onChange immediately - wait for user to save
  }

  const handleRemoveEarmark = (index) => {
    const updatedEarmarks = earmarks.filter((_, i) => i !== index)
    setEarmarks(updatedEarmarks)
    console.log('🗑️ Removing earmark locally:', updatedEarmarks)
    // Don't call onChange immediately - wait for user to save
  }

  const handleUpdatePercent = (index, newPercent) => {
    const percent = parseFloat(newPercent) || 0
    const currentTotal = earmarks.reduce((sum, e, i) => 
      i === index ? sum : sum + (e.percent || 0), 0
    )
    
    if (currentTotal + percent > maxAllocation) {
      setErrors({ percent: `Total allocation cannot exceed ${maxAllocation}%` })
      return
    }

    const updatedEarmarks = earmarks.map((e, i) => 
      i === index ? { ...e, percent } : e
    )
    setEarmarks(updatedEarmarks)
    setErrors({})
    console.log('📊 Updating earmark percent locally:', updatedEarmarks)
    // Don't call onChange immediately - wait for user to save
  }

  const handleSave = () => {
    console.log('💾 EarmarkingInput handleSave called:', { earmarks, availableGoalsCount: availableGoals.length })
    onChange(earmarks)
    setIsOpen(false)
  }

  const getTotalAllocation = () => {
    return earmarks.reduce((sum, e) => sum + (e.percent || 0), 0)
  }

  const getRemainingAllocation = () => {
    return maxAllocation - getTotalAllocation()
  }

  const getAvailableGoals = () => {
    console.log('🎯 getAvailableGoals called:', { availableGoalsCount: availableGoals.length, availableGoals })
    console.log('🎯 First goal structure:', availableGoals[0])
    const filtered = availableGoals.filter(goal => 
      !earmarks.some(e => e.goalId === goal.id)
    )
    console.log('🎯 Filtered goals:', filtered)
    return filtered
  }

  return (
    <>
      <div 
        className={`min-h-[32px] p-2 border border-gray-200 rounded-md bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
        onClick={handleOpen}
      >
        {earmarks.length === 0 ? (
          <div className="text-gray-400 text-sm flex items-center justify-center h-6">
            Click to earmark
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {earmarks.map((earmark, index) => {
              console.log('🔄 Rendering earmark badge:', { earmark, index });
              return (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-800"
                >
                  {earmark.goalName || earmark.goal_name || `Goal ${earmark.goalId}`} ({earmark.percent}%)
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Goal Earmarks</DialogTitle>
            <DialogDescription>
              Allocate percentages to goals. Total allocation cannot exceed {maxAllocation}%.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Allocations */}
            <div>
              <h4 className="text-sm font-medium mb-2">Current Allocations</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {earmarks.map((earmark, index) => (
                  <Card key={index} className="p-3">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {earmark.goalName}
                          </Badge>
                          <Input
                            type="number"
                            value={earmark.percent}
                            onChange={(e) => handleUpdatePercent(index, e.target.value)}
                            className="w-20 h-8"
                            min="0"
                            max={maxAllocation}
                            step="0.1"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEarmark(index)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Add New Allocation */}
            <div>
              <h4 className="text-sm font-medium mb-2">Add New Allocation</h4>
              <div className="flex items-center gap-2">
                <Select value={newGoalId} onValueChange={setNewGoalId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableGoals().map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.name || goal.description || `Goal ${goal.id}`}
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
                  max={getRemainingAllocation()}
                  step="0.1"
                />
                
                <Button onClick={handleAddEarmark} disabled={!newGoalId || !newPercent}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {Object.keys(errors).length > 0 && (
                <div className="text-sm text-red-600 mt-2">
                  {Object.values(errors).join(', ')}
                </div>
              )}
            </div>

            {/* Allocation Summary */}
            <div className="bg-gray-50 p-3 rounded">
              <div className="flex items-center justify-between text-sm">
                <span>Total Allocated:</span>
                <span className="font-medium">{getTotalAllocation().toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Remaining:</span>
                <span className="font-medium">{getRemainingAllocation().toFixed(1)}%</span>
              </div>
              {getTotalAllocation() > maxAllocation && (
                <div className="flex items-center gap-1 text-red-600 text-sm mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Total exceeds maximum allocation</span>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={getTotalAllocation() > maxAllocation}
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

export default EarmarkingInput
