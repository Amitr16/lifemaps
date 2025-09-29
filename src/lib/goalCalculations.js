/**
 * Utility functions for goal funding calculations
 */

/**
 * Calculate SIP projection with proper compounding logic
 * @param {Object} params
 * @param {number} params.initial - Initial lump sum (₹)
 * @param {number} params.sipAmount - SIP contribution amount
 * @param {string} params.sipFrequency - SIP frequency (Monthly, Weekly, etc.)
 * @param {number} params.annualRate - Expected annual return (e.g. 0.10 for 10%)
 * @param {number} params.years - Total years to project
 * @param {string} params.sipExpiryDate - SIP expiry date (YYYY-MM-DD)
 * @returns {number} Total projected value
 */
const calculateSIPProjection = ({ initial, sipAmount, sipFrequency, annualRate, years, sipExpiryDate }) => {
  if (sipAmount <= 0 || !sipFrequency) {
    // No SIP, just return initial value with compound growth
    return initial * Math.pow(1 + annualRate, years);
  }

  // Convert SIP frequency to monthly contributions
  let monthlySIP = 0;
  switch (sipFrequency) {
    case 'Weekly':
      monthlySIP = sipAmount * 4.33; // ~4.33 weeks per month
      break;
    case 'Bi-weekly':
      monthlySIP = sipAmount * 2.17; // ~2.17 bi-weeks per month
      break;
    case 'Monthly':
      monthlySIP = sipAmount;
      break;
    case 'Bi-monthly':
      monthlySIP = sipAmount * 2;
      break;
    case 'Quarterly':
      monthlySIP = sipAmount / 3;
      break;
    case 'Semi-annual':
      monthlySIP = sipAmount / 6;
      break;
    case 'Annual':
      monthlySIP = sipAmount / 12;
      break;
    case 'Lumpsum':
      monthlySIP = 0; // One-time only
      break;
    default:
      monthlySIP = 0;
  }

  // Calculate SIP months (how long SIP runs)
  let sipMonths = years * 12; // Default: SIP runs for all years
  if (sipExpiryDate) {
    const expiryYear = new Date(sipExpiryDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const maxSipYears = Math.max(0, expiryYear - currentYear);
    sipMonths = Math.min(years * 12, maxSipYears * 12);
  }

  const monthlyRate = annualRate / 12;
  const totalMonths = years * 12;

  // Lump sum part (grows throughout the entire period)
  const lumpValue = initial * Math.pow(1 + monthlyRate, totalMonths);

  // SIP part (accumulate up to SIP expiry, then let it compound)
  let sipValue = 0;
  if (monthlySIP > 0 && sipMonths > 0) {
    // Calculate SIP accumulated up to expiry
    const sipAccumulated = monthlySIP * ((Math.pow(1 + monthlyRate, sipMonths) - 1) / monthlyRate);
    
    // After SIP stops, let the accumulated SIP pot continue compounding
    const remainingMonths = totalMonths - sipMonths;
    sipValue = sipAccumulated * Math.pow(1 + monthlyRate, remainingMonths);
  }

  return lumpValue + sipValue;
};

/**
 * Calculate the funded amount for a goal based on linked assets (using projected values)
 * @param {Object} goal - The goal object with linkedAssets in custom_data
 * @param {Array} assets - Array of all assets
 * @returns {Object} - { fundedAmount, percentFunded, fundingGap }
 */
export const calculateGoalFunding = (goal, assets) => {
  const targetAmount = parseFloat(goal.target_amount || goal.amount) || 0
  const targetYear = parseInt(goal.target_year || goal.targetYear) || (new Date().getFullYear() + 10)
  const linkedAssets = goal.custom_data?.linkedAssets || []
  
  if (targetAmount === 0) {
    return {
      fundedAmount: 0,
      percentFunded: 0,
      fundingGap: 0
    }
  }

  const currentYear = new Date().getFullYear()
  const yearsToTarget = Math.max(1, targetYear - currentYear)

  console.log(`🎯 Goal funding calculation:`, {
    goalId: goal.id,
    goalDescription: goal.description,
    targetAmount,
    targetYear,
    yearsToTarget,
    linkedAssetsCount: linkedAssets.length,
    linkedAssets
  })

  // Calculate funded amount from linked assets using projected values
  const fundedAmount = linkedAssets.reduce((total, linkedAsset) => {
    const asset = assets.find(a => a.id === linkedAsset.assetId)
    if (!asset) return total
    
    const currentValue = parseFloat(asset.current_value || asset.currentValue) || 0
    const percent = parseFloat(linkedAsset.percent) || 0
    
    console.log(`📊 Processing linked asset:`, {
      assetId: asset.id,
      assetName: asset.name,
      currentValue,
      percent,
      assetData: asset
    })
    
    // Get asset projection parameters
    const customData = asset.custom_data || {}
    const sipAmount = parseFloat(customData.sipAmount) || 0
    const sipFrequency = customData.sipFrequency || 'Monthly'
    const expectedReturn = parseFloat(customData.expectedReturn) || 5
    const sipExpiryDate = customData.sipExpiryDate || ''
    
    // Calculate earmarked amount first
    const earmarkedValue = currentValue * percent / 100
    
    // Calculate projected value at target year using earmarked amount
    const annualRate = expectedReturn / 100
    const projectedValue = calculateSIPProjection({
      initial: earmarkedValue,
      sipAmount: sipAmount * percent / 100, // Only the earmarked portion of SIP
      sipFrequency: sipFrequency,
      annualRate: annualRate,
      years: yearsToTarget,
      sipExpiryDate: sipExpiryDate
    })
    
    // The projected value is already the funded amount
    const assetContribution = projectedValue
    
    console.log(`📊 Asset ${asset.name} projection:`, {
      currentValue,
      projectedValue,
      percent,
      contribution: assetContribution,
      yearsToTarget
    })
    
    return total + assetContribution
  }, 0)

  const percentFunded = (fundedAmount / targetAmount) * 100
  const fundingGap = targetAmount - fundedAmount

  console.log(`🎯 Goal ${goal.description} funding:`, {
    targetAmount,
    fundedAmount,
    percentFunded,
    fundingGap,
    yearsToTarget
  })

  return {
    fundedAmount,
    percentFunded: Math.round(percentFunded * 100) / 100, // Round to 2 decimal places
    fundingGap
  }
}

/**
 * Calculate the total earmarked amount for an asset across all goals
 * @param {Object} asset - The asset object with goalEarmarks in custom_data
 * @param {Array} goals - Array of all goals
 * @returns {Object} - { totalEarmarked, unallocatedValue, totalAllocationPercent }
 */
export const calculateAssetEarmarking = (asset, goals) => {
  const assetValue = parseFloat(asset.current_value) || 0
  const goalEarmarks = asset.custom_data?.goalEarmarks || []
  
  const totalAllocationPercent = goalEarmarks.reduce((total, earmark) => {
    return total + (parseFloat(earmark.percent) || 0)
  }, 0)

  const totalEarmarked = assetValue * totalAllocationPercent / 100
  const unallocatedValue = assetValue - totalEarmarked

  return {
    totalEarmarked,
    unallocatedValue,
    totalAllocationPercent
  }
}

/**
 * Format currency for display
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount) => {
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

/**
 * Sync earmarking data between assets and goals
 * This ensures both sides stay in sync when changes are made
 * @param {Array} assets - Array of all assets
 * @param {Array} goals - Array of all goals
 * @returns {Object} - { updatedAssets, updatedGoals }
 */
export const syncEarmarkingData = (assets, goals) => {
  const updatedAssets = [...assets]
  const updatedGoals = [...goals]

  // Update goal linkedAssets based on asset goalEarmarks
  goals.forEach((goal, goalIndex) => {
    const linkedAssets = []
    
    assets.forEach(asset => {
      const goalEarmarks = asset.custom_data?.goalEarmarks || []
      const earmark = goalEarmarks.find(e => e.goalId === goal.id)
      
      if (earmark) {
        linkedAssets.push({
          assetId: asset.id,
          assetName: asset.name,
          percent: earmark.percent
        })
      }
    })
    
    updatedGoals[goalIndex] = {
      ...goal,
      custom_data: {
        ...goal.custom_data,
        linkedAssets
      }
    }
  })

  // Update asset goalEarmarks based on goal linkedAssets
  assets.forEach((asset, assetIndex) => {
    const goalEarmarks = []
    
    goals.forEach(goal => {
      const linkedAssets = goal.custom_data?.linkedAssets || []
      const linkedAsset = linkedAssets.find(la => la.assetId === asset.id)
      
      if (linkedAsset) {
        goalEarmarks.push({
          goalId: goal.id,
          goalName: goal.description || goal.name || `Goal ${goal.id}`,
          percent: linkedAsset.percent
        })
      }
    })
    
    updatedAssets[assetIndex] = {
      ...asset,
      custom_data: {
        ...asset.custom_data,
        goalEarmarks
      }
    }
  })

  return { updatedAssets, updatedGoals }
}

/**
 * Validate earmarking data
 * @param {Array} assets - Array of all assets
 * @param {Array} goals - Array of all goals
 * @returns {Object} - { isValid, errors }
 */
export const validateEarmarkingData = (assets, goals) => {
  const errors = []
  
  // Check that each asset's total earmarking doesn't exceed 100%
  assets.forEach(asset => {
    const goalEarmarks = asset.custom_data?.goalEarmarks || []
    const totalPercent = goalEarmarks.reduce((total, earmark) => {
      return total + (parseFloat(earmark.percent) || 0)
    }, 0)
    
    if (totalPercent > 100) {
      errors.push(`Asset "${asset.name}" has ${totalPercent.toFixed(1)}% earmarked (exceeds 100%)`)
    }
  })
  
  // Check for orphaned references
  assets.forEach(asset => {
    const goalEarmarks = asset.custom_data?.goalEarmarks || []
    goalEarmarks.forEach(earmark => {
      const goalExists = goals.some(g => g.id === earmark.goalId)
      if (!goalExists) {
        errors.push(`Asset "${asset.name}" references non-existent goal "${earmark.goalName}"`)
      }
    })
  })
  
  goals.forEach(goal => {
    const linkedAssets = goal.custom_data?.linkedAssets || []
    linkedAssets.forEach(linkedAsset => {
      const assetExists = assets.some(a => a.id === linkedAsset.assetId)
      if (!assetExists) {
        errors.push(`Goal "${goal.name}" references non-existent asset "${linkedAsset.assetName}"`)
      }
    })
  })
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
