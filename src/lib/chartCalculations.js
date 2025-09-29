/**
 * Chart calculation utilities for Goals, Loans, and Expenses
 * Event-driven calculations that integrate with the existing store system
 */

// Import SIP projection function from goalCalculations
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

  // Calculate monthly rate
  const monthlyRate = annualRate / 12;

  // Calculate total months
  const totalMonths = years * 12;

  // Calculate SIP expiry in months from now
  let sipExpiryMonths = totalMonths; // Default: SIP runs for full duration
  if (sipExpiryDate) {
    const expiryDate = new Date(sipExpiryDate);
    const now = new Date();
    const monthsDiff = (expiryDate.getFullYear() - now.getFullYear()) * 12 + (expiryDate.getMonth() - now.getMonth());
    sipExpiryMonths = Math.max(0, Math.min(monthsDiff, totalMonths));
  }

  // Calculate future value of initial amount
  const initialFV = initial * Math.pow(1 + annualRate, years);

  // Calculate future value of SIP contributions
  let sipFV = 0;
  if (monthlySIP > 0 && sipExpiryMonths > 0) {
    // Future value of annuity formula: FV = PMT * [((1 + r)^n - 1) / r]
    sipFV = monthlySIP * ((Math.pow(1 + monthlyRate, sipExpiryMonths) - 1) / monthlyRate);
    
    // If SIP expires before target year, grow the SIP amount for remaining years
    if (sipExpiryMonths < totalMonths) {
      const remainingYears = (totalMonths - sipExpiryMonths) / 12;
      sipFV *= Math.pow(1 + annualRate, remainingYears);
    }
  }

  return initialFV + sipFV;
};

/**
 * GOALS CALCULATIONS
 */

/**
 * Calculate progress to each goal (for donut/bullet charts)
 * @param {Array} goals - Array of goal objects
 * @param {Array} assets - Array of asset objects with earmarking data
 * @param {number} currentYear - Current year
 * @returns {Array} Goals progress data
 */
export const calculateGoalsProgress = (goals, assets, currentYear = new Date().getFullYear()) => {
  console.log('🎯 calculateGoalsProgress called with:', { goals: goals.length, assets: assets.length, currentYear });
  return goals.map(goal => {
    // Handle both field name variations (name/target_amount vs description/amount)
    const target = parseFloat(goal.target_amount || goal.amount) || 0;
    const targetYear = parseInt(goal.target_year || goal.targetYear) || currentYear + 10;
    const yearsToGoal = Math.max(1, targetYear - currentYear);
    
    // Calculate funded amount from linked assets
    const linkedAssets = goal.custom_data?.linkedAssets || [];
    let funded = 0;
    
    linkedAssets.forEach(linkedAsset => {
      const asset = assets.find(a => a.id === linkedAsset.assetId);
      if (asset) {
        const assetValue = parseFloat(asset.current_value) || 0;
        const percentage = parseFloat(linkedAsset.percent) || 0;
        
        // Use EXACT same SIP FV calculation as goalCalculations.js
        const customData = asset.custom_data || {};
        const sipAmount = parseFloat(customData.sipAmount) || 0;
        const sipFrequency = customData.sipFrequency || 'Monthly';
        const expectedReturn = parseFloat(customData.expectedReturn) || 5;
        const sipExpiryDate = customData.sipExpiryDate || '';
        
        // Calculate earmarked amount first (same as goalCalculations.js)
        const earmarkedValue = assetValue * (percentage / 100);
        
        // Calculate projected value at target year using earmarked amount (same as goalCalculations.js)
        const annualRate = expectedReturn / 100;
        const sipProjection = calculateSIPProjection({
          initial: earmarkedValue,
          sipAmount: sipAmount * percentage / 100, // Only the earmarked portion of SIP
          sipFrequency: sipFrequency,
          annualRate: annualRate,
          years: yearsToGoal,
          sipExpiryDate: sipExpiryDate
        });
        
        console.log('🎯 SIP Projection Result:', {
          earmarkedValue,
          sipProjection,
          totalFunded: funded + sipProjection
        });
        
        funded += sipProjection;
      }
    });
    
    const gap = Math.max(0, target - funded);
    const percentFunded = target > 0 ? (funded / target) * 100 : 0;
    
    return {
      name: goal.name || goal.description || `Goal ${goal.id}`,
      target,
      funded,
      gap,
      percentFunded: Math.min(100, percentFunded),
      yearsToGoal,
      targetYear
    };
  });
};

/**
 * Calculate funding need over time (for stacked area chart)
 * @param {Array} goals - Array of goal objects
 * @param {Array} assets - Array of asset objects
 * @param {number} currentYear - Current year
 * @param {number} projectionYears - Years to project
 * @returns {Array} Annual funding requirements
 */
export const calculateGoalsFundingNeed = (goals, assets, currentYear = new Date().getFullYear()) => {
  console.log('🎯 calculateGoalsFundingNeed called with:', { goals: goals.length, assets: assets.length, currentYear });
  
  if (!goals.length) return [];
  
  // Find the farthest target year
  const endYear = Math.max(...goals.map(g => parseInt(g.target_year || g.targetYear) || currentYear + 10));
  console.log('🎯 End year:', endYear);
  
  const years = [];
  
  // Generate year-by-year data from current year to end year
  for (let year = currentYear; year <= endYear; year++) {
    const yearData = { year };
    let requiredTotal = 0;
    
    // Initialize all goal contributions to 0 for this year
    goals.forEach(goal => {
      const goalName = goal.name || goal.description || `Goal ${goal.id}`;
      const goalKey = goalName.replace(/[^a-zA-Z0-9]/g, '_');
      yearData[goalKey] = 0;
    });
    
    // Calculate contribution for each goal
    goals.forEach(goal => {
      const targetYear = parseInt(goal.target_year || goal.targetYear) || currentYear + 10;
      const targetAmountFV = parseFloat(goal.target_amount || goal.amount) || 0;
      
      console.log(`🎯 Processing goal ${goal.name || goal.description}:`, {
        targetYear,
        targetAmountFV,
        currentYear,
        year
      });
      
      // Only calculate if this year is before the target year
      if (year < targetYear) {
        const n = Math.max(0, targetYear - year); // Years left from current iteration year to target year
        const contribReturn = 0.06; // Default 6% return on contributions
        
        console.log(`🎯 Years left (n): ${n}, contribReturn: ${contribReturn}`);
        
        // Calculate future value of linked assets using SIP projection (matching table calculation)
        const linkedAssets = goal.custom_data?.linkedAssets || [];
        let fvLinked = 0;
        
        linkedAssets.forEach(linkedAsset => {
          const asset = assets.find(a => a.id === linkedAsset.assetId);
          if (asset) {
            const currentValue = parseFloat(asset.current_value) || 0;
            const percentage = parseFloat(linkedAsset.percent) || 0;
            
            // Get asset projection parameters (same as table calculation)
            const customData = asset.custom_data || {};
            const sipAmount = parseFloat(customData.sipAmount) || 0;
            const sipFrequency = customData.sipFrequency || 'Monthly';
            const expectedReturn = parseFloat(customData.expectedReturn) || 5;
            const sipExpiryDate = customData.sipExpiryDate || '';
            
            // Calculate projected value using SIP projection
            const annualRate = expectedReturn / 100;
            const projectedValue = calculateSIPProjection({
              initial: currentValue,
              sipAmount: sipAmount,
              sipFrequency: sipFrequency,
              annualRate: annualRate,
              years: n,
              sipExpiryDate: sipExpiryDate
            });
            
            // Calculate funded amount based on projected value
            const assetContribution = projectedValue * (percentage / 100);
            fvLinked += assetContribution;
            
            console.log(`🎯 Linked asset ${asset.name} (SIP projection):`, {
              currentValue,
              percentage,
              projectedValue,
              assetContribution,
              expectedReturn,
              sipAmount,
              n,
              runningTotal: fvLinked
            });
          }
        });
        
        // Calculate funding gap at target (in future ₹)
        const gap = Math.max(0, targetAmountFV - fvLinked);
        
        console.log(`🎯 Funding gap: ${targetAmountFV} - ${fvLinked} = ${gap}`);
        
        // Calculate annual contribution needed (ordinary annuity formula)
        let annualContribution = 0;
        if (n > 0) {
          if (contribReturn > 0) {
            // P = G × r / ((1 + r)^n - 1)
            annualContribution = (gap * contribReturn) / (Math.pow(1 + contribReturn, n) - 1);
          } else {
            // P = G / n
            annualContribution = gap / n;
          }
        } else if (n === 0) {
          // Lump sum this year
          annualContribution = gap;
        }
        
        console.log(`🎯 Annual contribution for ${goal.name || goal.description}: ${annualContribution}`);
        
        // Add to this year's data
        const goalName = goal.name || goal.description || `Goal ${goal.id}`;
        const goalKey = goalName.replace(/[^a-zA-Z0-9]/g, '_');
        yearData[goalKey] = annualContribution;
        requiredTotal += annualContribution;
      }
    });
    
    yearData.requiredTotal = requiredTotal;
    years.push(yearData);
    
    console.log(`🎯 Year ${year} data:`, yearData);
  }
  
  console.log('🎯 Final funding need data:', years);
  return years;
};

/**
 * LOANS CALCULATIONS
 */

/**
 * Calculate annual EMI outflow by loan
 * @param {Array} loans - Array of loan objects
 * @param {number} currentYear - Current year
 * @returns {Array} Annual EMI outflow data
 */
export const calculateAnnualLoanOutflow = (loans, currentYear = new Date().getFullYear()) => {
  console.log('🏦 calculateAnnualLoanOutflow called with:', { loans: loans.length, currentYear });
  
  if (!loans.length) return [];
  
  // Debug: Log all loan fields to see what's available
  console.log('🏦 Sample loan data:', loans[0]);
  
  // Find the latest loan expiry year
  const latestExpiryYear = Math.max(...loans.map(loan => {
    // Try multiple possible field names for expiry year
    const expiryYear = parseInt(
      loan.loanExpiry ||
      loan.expiry_year || 
      loan.expiryYear || 
      loan.loan_expiry || 
      loan.expiry || 
      loan.end_year ||
      loan.expiry_date ||
      loan.end_date
    ) || currentYear + 10;
    console.log(`🏦 Loan ${loan.lender || loan.name} expiry year:`, expiryYear, 'from fields:', {
      expiry_year: loan.expiry_year,
      expiryYear: loan.expiryYear,
      loan_expiry: loan.loan_expiry,
      expiry: loan.expiry,
      end_year: loan.end_year,
      expiry_date: loan.expiry_date,
      end_date: loan.end_date
    });
    return expiryYear;
  }));
  
  console.log('🏦 Latest expiry year:', latestExpiryYear);
  
  const years = [];
  
  // Generate year-by-year data from current year to latest expiry
  for (let year = currentYear; year <= latestExpiryYear; year++) {
    const yearData = { year };
    let totalOutflow = 0;
    
    // Initialize all loan outflows to 0 for this year
    loans.forEach(loan => {
      const loanName = loan.lender || loan.name || `Loan ${loan.id}`;
      const loanKey = loanName.replace(/[^a-zA-Z0-9]/g, '_');
      yearData[loanKey] = 0;
    });
    
    // Calculate outflow for each loan
    loans.forEach(loan => {
      const loanName = loan.lender || loan.name || `Loan ${loan.id}`;
      const loanKey = loanName.replace(/[^a-zA-Z0-9]/g, '_');
      const emi = parseFloat(loan.emi || loan.monthly_payment) || 0;
      const expiryYear = parseInt(
        loan.loanExpiry ||
        loan.expiry_year || 
        loan.expiryYear || 
        loan.loan_expiry || 
        loan.expiry || 
        loan.end_year
      ) || currentYear + 10;
      
      // Calculate payments per year based on frequency
      let paymentsPerYear = 12; // Default monthly
      const frequency = (loan.frequency || 'Monthly').toLowerCase();
      switch (frequency) {
        case 'monthly':
          paymentsPerYear = 12;
          break;
        case 'quarterly':
          paymentsPerYear = 4;
          break;
        case 'yearly':
        case 'annual':
          paymentsPerYear = 1;
          break;
        default:
          paymentsPerYear = 12;
      }
      
      // Calculate annual outflow for this year
      const annualOutflow = (year <= expiryYear) ? emi * paymentsPerYear : 0;
      
      yearData[loanKey] = annualOutflow;
      totalOutflow += annualOutflow;
      
      console.log(`🏦 Loan ${loanName} in ${year}:`, {
        emi,
        frequency,
        paymentsPerYear,
        expiryYear,
        annualOutflow
      });
    });
    
    yearData.total = totalOutflow;
    years.push(yearData);
    
    console.log(`🏦 Year ${year} data:`, yearData);
  }
  
  console.log('🏦 Final annual loan outflow data:', years);
  return years;
};

/**
 * Calculate loan amortization schedule
 * @param {Object} loan - Loan object
 * @param {number} currentYear - Current year
 * @returns {Array} Monthly amortization schedule
 */
export const calculateLoanAmortization = (loan, currentYear = new Date().getFullYear()) => {
  const principal = parseFloat(loan.principal_outstanding) || parseFloat(loan.amount) || 0;
  const annualRate = parseFloat(loan.rate) || 0;
  const monthlyRate = annualRate / 12 / 100;
  const emi = parseFloat(loan.emi) || 0;
  const endYear = parseInt(loan.end_date?.split('-')[0]) || currentYear + 10;
  
  if (principal <= 0 || monthlyRate <= 0 || emi <= 0) {
    return [];
  }
  
  const schedule = [];
  let balance = principal;
  let currentDate = new Date(currentYear, 0, 1);
  
  while (balance > 0.01 && currentDate.getFullYear() <= endYear) {
    const interest = balance * monthlyRate;
    const principalPayment = Math.min(emi - interest, balance);
    const newBalance = balance - principalPayment;
    
    schedule.push({
      period: currentDate.toISOString().slice(0, 7), // YYYY-MM
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      interestPaid: interest,
      principalPaid: principalPayment,
      balance: newBalance,
      emi
    });
    
    balance = newBalance;
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return schedule;
};

/**
 * Aggregate monthly schedule to annual data
 * @param {Array} monthlySchedule - Monthly amortization data
 * @returns {Array} Annual aggregated data
 */
export const aggregateToAnnual = (monthlySchedule) => {
  const annualData = {};
  
  monthlySchedule.forEach(month => {
    const year = month.year;
    if (!annualData[year]) {
      annualData[year] = {
        year,
        interestPaid: 0,
        principalPaid: 0,
        balance: month.balance
      };
    }
    
    annualData[year].interestPaid += month.interestPaid;
    annualData[year].principalPaid += month.principalPaid;
  });
  
  return Object.values(annualData).sort((a, b) => a.year - b.year);
};

/**
 * Calculate EMI scenarios (base vs extra payment)
 * @param {Object} loan - Loan object
 * @param {number} extraPayment - Extra monthly payment
 * @param {number} currentYear - Current year
 * @returns {Object} Comparison data
 */
export const calculateEMIScenarios = (loan, extraPayment = 0, currentYear = new Date().getFullYear()) => {
  const baseSchedule = calculateLoanAmortization(loan, currentYear);
  
  if (extraPayment <= 0) {
    return {
      base: baseSchedule,
      extra: baseSchedule,
      summary: {
        base: {
          totalInterest: baseSchedule.reduce((sum, month) => sum + month.interestPaid, 0),
          payoffDate: baseSchedule[baseSchedule.length - 1]?.period
        },
        extra: {
          totalInterest: baseSchedule.reduce((sum, month) => sum + month.interestPaid, 0),
          payoffDate: baseSchedule[baseSchedule.length - 1]?.period
        }
      }
    };
  }
  
  // Calculate with extra payment
  const principal = parseFloat(loan.principal_outstanding) || parseFloat(loan.amount) || 0;
  const annualRate = parseFloat(loan.rate) || 0;
  const monthlyRate = annualRate / 12 / 100;
  const emi = parseFloat(loan.emi) || 0;
  const totalPayment = emi + extraPayment;
  
  const extraSchedule = [];
  let balance = principal;
  let currentDate = new Date(currentYear, 0, 1);
  
  while (balance > 0.01) {
    const interest = balance * monthlyRate;
    const principalPayment = Math.min(totalPayment - interest, balance);
    const newBalance = balance - principalPayment;
    
    extraSchedule.push({
      period: currentDate.toISOString().slice(0, 7),
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      interestPaid: interest,
      principalPaid: principalPayment,
      balance: newBalance,
      emi: totalPayment
    });
    
    balance = newBalance;
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return {
    base: baseSchedule,
    extra: extraSchedule,
    summary: {
      base: {
        totalInterest: baseSchedule.reduce((sum, month) => sum + month.interestPaid, 0),
        payoffDate: baseSchedule[baseSchedule.length - 1]?.period
      },
      extra: {
        totalInterest: extraSchedule.reduce((sum, month) => sum + month.interestPaid, 0),
        payoffDate: extraSchedule[extraSchedule.length - 1]?.period,
        interestSaved: baseSchedule.reduce((sum, month) => sum + month.interestPaid, 0) - 
                     extraSchedule.reduce((sum, month) => sum + month.interestPaid, 0)
      }
    }
  };
};

/**
 * EXPENSES CALCULATIONS
 */

/**
 * Convert expense amount to annual based on frequency
 * @param {number} amount - Expense amount
 * @param {string} frequency - Frequency (Monthly, Quarterly, Annually, etc.)
 * @returns {number} Annual amount
 */
const toAnnual = (amount, frequency) => {
  const freq = (frequency || '').toLowerCase();
  switch (freq) {
    case 'monthly': return amount * 12;
    case 'quarterly': return amount * 4;
    case 'annually': return amount;
    case 'weekly': return amount * 52;
    case 'daily': return amount * 365;
    default: return amount * 12; // Default to monthly
  }
};

/**
 * Calculate expense projections by category over time
 * @param {Array} expenses - Array of expense objects
 * @param {number} currentYear - Current year
 * @param {number} projectionYears - Years to project
 * @returns {Array} Annual expense projections by category
 */
export const calculateExpenseProjections = (expenses, currentYear = new Date().getFullYear(), projectionYears = 10) => {
  const categories = {};
  
  // Group expenses by category
  expenses.forEach(expense => {
    const category = expense.category || 'Other';
    const amount = parseFloat(expense.amount) || 0;
    const frequency = expense.frequency || 'Monthly';
    // Handle inflation rate - if it's already a decimal (0.06), use as is; if it's a percentage (6), convert to decimal
    let inflation = parseFloat(expense.inflation || expense.personal_inflation) || 0.06;
    const originalInflation = inflation;
    if (inflation > 1) {
      inflation = inflation / 100; // Convert percentage to decimal
    }
    
    console.log(`💰 Expense ${expense.category} inflation:`, {
      original: originalInflation,
      processed: inflation,
      field: expense.inflation || expense.personal_inflation
    });
    
    if (!categories[category]) {
      categories[category] = {
        annualBase: 0,
        inflation: 0,
        expenses: []
      };
    }
    
    const annualAmount = toAnnual(amount, frequency);
    categories[category].annualBase += annualAmount;
    categories[category].inflation = Math.max(categories[category].inflation, inflation);
    categories[category].expenses.push(expense);
  });
  
  // Generate year-by-year projections
  const years = [];
  for (let year = currentYear; year <= currentYear + projectionYears; year++) {
    const yearData = { year };
    let total = 0;
    
    Object.entries(categories).forEach(([category, data]) => {
      const yearIndex = year - currentYear;
      const projectedAmount = data.annualBase * Math.pow(1 + data.inflation, yearIndex);
      yearData[category] = projectedAmount;
      total += projectedAmount;
    });
    
    yearData.total = total;
    years.push(yearData);
  }
  
  return years;
};

/**
 * Calculate Needs/Wants/Savings breakdown
 * @param {Array} expenses - Array of expense objects
 * @param {number} monthlyIncome - Monthly income
 * @returns {Object} NWS breakdown
 */
export const calculateNeedsWantsSavings = (expenses, monthlyIncome = 0) => {
  let needs = 0;
  let wants = 0;
  let savings = 0;
  
  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount) || 0;
    const frequency = expense.frequency || 'Monthly';
    const annualAmount = toAnnual(amount, frequency);
    const monthlyAmount = annualAmount / 12;
    
    const category = (expense.category || '').toLowerCase();
    const subcategory = (expense.subcategory || '').toLowerCase();
    
    // Simple categorization - can be enhanced
    if (category.includes('housing') || category.includes('rent') || 
        category.includes('food') || category.includes('groceries') ||
        category.includes('transport') || category.includes('utilities') ||
        subcategory.includes('essential') || subcategory.includes('need')) {
      needs += monthlyAmount;
    } else if (category.includes('entertainment') || category.includes('dining') ||
               category.includes('shopping') || category.includes('hobbies') ||
               subcategory.includes('want') || subcategory.includes('luxury')) {
      wants += monthlyAmount;
    } else {
      // Default to needs for uncategorized
      needs += monthlyAmount;
    }
  });
  
  const totalExpenses = needs + wants;
  savings = Math.max(0, monthlyIncome - totalExpenses);
  
  return {
    needs,
    wants,
    savings,
    totalExpenses,
    monthlyIncome,
    needsPercent: monthlyIncome > 0 ? (needs / monthlyIncome) * 100 : 0,
    wantsPercent: monthlyIncome > 0 ? (wants / monthlyIncome) * 100 : 0,
    savingsPercent: monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0
  };
};

/**
 * UTILITY FUNCTIONS
 */

/**
 * Debounce function for heavy calculations
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 150) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Run calculation in requestIdleCallback if available
 * @param {Function} func - Function to run
 * @param {Array} args - Arguments to pass
 */
export const runInIdleCallback = (func, args = []) => {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => func(...args));
  } else {
    setTimeout(() => func(...args), 0);
  }
};
