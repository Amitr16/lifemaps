
// Shared calculation utilities for Life Sheet
export function computeTotals({assets=[], expenses=[], goals=[], loans=[], formData={}}) {
  const age = parseInt(formData.age || 0);
  const currentIncome = parseFloat(formData.currentAnnualGrossIncome || 0);
  const workTenure = parseInt(formData.workTenureYears || 0);
  const assetsSum = assets.reduce((s,a)=>s + (parseFloat(a.currentValue||a.amount||0)), 0);
  const liabilities = loans.reduce((s,l)=>s + (parseFloat(l.principalOutstanding||l.amount||0)), 0);
  const lifespan = parseInt(formData.lifespanYears || 85);
  const incomeGrowthRate = parseFloat(formData.incomeGrowthRate || 0.06);
  const remainingLife = Math.max(0, lifespan - age);

  const totalHumanCapital = currentIncome * workTenure;
  const totalFutureExpenses = expenses.reduce((total, e)=>{
    const amt = parseFloat(e.amount || 0);
    return total + (amt * remainingLife);
  }, 0);
  const totalFinancialGoals = goals.reduce((total,g)=> total + parseFloat(g.amount||0), 0);

  const currentNetworth = assetsSum - liabilities;
  const surplusDeficit = (assetsSum + totalHumanCapital) - (liabilities + totalFutureExpenses + totalFinancialGoals);

  return {
    totalExistingAssets: assetsSum,
    totalHumanCapital,
    totalExistingLiabilities: liabilities,
    totalFutureExpenses,
    totalFinancialGoals,
    currentNetworth,
    surplusDeficit,
  };
}

export function buildChartSeries({formData={}, totals={}, years=40, loans=[], expenses=[], goals=[]}){
  const age = parseInt(formData.age || 0);
  const income = parseFloat(formData.currentAnnualGrossIncome || 0);
  const workTenure = parseInt(formData.workTenureYears || 0);
  const incomeGrowth = parseFloat(formData.incomeGrowthRate || 0.06);
  const inflation = parseFloat(formData.inflationRate || 0.06);
  
  // Asset assumptions
  const assetEquitySplit = parseFloat(formData.assetEquitySplit || 0.60);
  const equityGrowth = parseFloat(formData.assetEquityGrowthRate || 0.15);
  const debtGrowth = parseFloat(formData.assetDebtGrowthRate || 0.07);
  
  // Calculate weighted average asset growth rate
  const assetGrowth = (assetEquitySplit * equityGrowth) + ((1 - assetEquitySplit) * debtGrowth);

  // Start with current net worth (Assets - Liabilities, unadjusted for inflation)
  const initialLiabilities = totals.totalExistingLiabilities || 0;
  let netWorthUnadjusted = (totals.totalExistingAssets || 0) - initialLiabilities;
  
  // Base annual expenses (sum of all expenses)
  const baseAnnualExpenses = expenses.reduce((s,e)=>{
    const amt = parseFloat(e.amount||0);
    return s + amt;
  }, 0);
  
  // Base annual EMI (sum of all loan EMIs, annualized)
  const baseAnnualEMI = loans.reduce((s,l)=> s + (parseFloat(l.emiAmount || l.emi || 0) * 12), 0);
  
  let chart = [];
  // Project until age 80
  const targetAge = 80;
  const projectionYears = Math.max(0, targetAge - age);
  const N = Math.max(1, projectionYears);

  for (let i=0;i<N;i++){
    const year = (new Date().getFullYear()) + i;
    
    // Step 1: Calculate unadjusted values (projected forward with growth rates)
    
    // Income at year t: Income at beginning projected by growth rate
    const incomeUnadjusted = (i < workTenure) 
      ? income * Math.pow(1 + incomeGrowth, i)
      : 0;
    
    // Expenses at year t: Expenses at beginning projected by inflation
    // Include EMIs as part of expenses to avoid double counting (detailed expenses already include EMIs)
    const expensesUnadjusted = baseAnnualExpenses * Math.pow(1 + inflation, i);
    const emiUnadjusted = baseAnnualEMI; // Same for all years (no projection)
    const totalExpensesUnadjusted = expensesUnadjusted + emiUnadjusted; // Combine expenses and EMIs
    
    // Net Worth at year t (unadjusted): 
    // Net Worth_t-1 (unadjusted) × (1 + Asset Growth) + Income_t - (Expenses_t + EMI_t)
    // NOTE: Financial Goals are NOT included in net worth calculation
    // Goals are only shown in the Life Sheet table (discounted), not in the chart
    netWorthUnadjusted = netWorthUnadjusted * (1 + assetGrowth) + incomeUnadjusted - totalExpensesUnadjusted;
    
    // Step 2: Discount back to today using inflation
    // Net Worth_t (adjusted for inflation) = Net Worth_t (unadjusted) / (1 + inflation)^t
    const discountFactor = Math.pow(1 + inflation, i);
    const netWorthAdjusted = netWorthUnadjusted / discountFactor;
    const incomeAdjusted = incomeUnadjusted / discountFactor;
    const expensesAdjusted = totalExpensesUnadjusted / discountFactor; // Combined expenses + EMIs, discounted

    // Calculate assets (net worth minus liabilities, but we'll use net worth as assets for simplicity)
    // In reality, assets would be net worth + liabilities, but for chart purposes, net worth is what matters
    const assetsAdjusted = netWorthAdjusted;

    chart.push({
      year: String(year),
      netWorth: netWorthAdjusted,
      assets: assetsAdjusted,
      liabilities: totals.totalExistingLiabilities || 0,
      cashflow: incomeAdjusted - expensesAdjusted, // Expenses already include EMIs
    });
  }
  return chart;
}
