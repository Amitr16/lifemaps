
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
  const lifespan = parseInt(formData.lifespanYears || 85);
  const income = parseFloat(formData.currentAnnualGrossIncome || 0);
  const workTenure = parseInt(formData.workTenureYears || 0);
  const infl = parseFloat(formData.incomeGrowthRate || 0.06); // assume as inflation
  const assetYield = infl; // portfolio earnings = inflation for real-terms view

  let assets = totals.totalExistingAssets || 0;
  let chart = [];
  const endYear = Math.min(85, lifespan);
  const N = Math.max(1, endYear);

  for (let i=0;i<N;i++){
    const year = (new Date().getFullYear()) + i;
    const activeEarnings = (i < workTenure) ? income * Math.pow(1+infl, i) : 0;

    // Annualized expenses baseline
    const annualExpenses = expenses.reduce((s,e)=>{
      const amt = parseFloat(e.amount||0);
      // naive: assume entered as annual
      return s + amt;
    }, 0);

    // EMIs
    const EMI = loans.reduce((s,l)=> s + parseFloat(l.emiAmount || 0), 0);

    const portfolioEarnings = assets * assetYield;

    const closingNW = assets + activeEarnings - annualExpenses + portfolioEarnings - EMI;

    chart.push({
      year: String(year),
      netWorth: closingNW,
      assets: assets,
      liabilities: totals.totalExistingLiabilities || 0,
      cashflow: activeEarnings - annualExpenses - EMI,
    });

    // roll assets to next year (simplified real-terms roll)
    assets = closingNW;
  }
  return chart;
}
