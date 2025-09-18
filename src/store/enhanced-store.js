import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import ApiService from '../services/api'

// Helper functions for source selection
const num = (v) => (typeof v === 'number' && !Number.isNaN(v)) ? v : 0;

function hasNonEmptySeries(series) {
  console.log('[hasNonEmptySeries] Checking series:', {
    series,
    type: typeof series,
    isObject: series && typeof series === 'object',
    keys: series ? Object.keys(series) : 'none',
    firstValue: series ? series[Object.keys(series)[0]] : 'none'
  });
  
  if (!series || typeof series !== 'object') {
    console.log('[hasNonEmptySeries] Returning false - not an object');
    return false;
  }
  
  for (const k in series) {
    if (series[k] != null && !Number.isNaN(Number(series[k]))) {
      console.log('[hasNonEmptySeries] Returning true - found valid value at key:', k, 'value:', series[k]);
      return true;
    }
  }
  
  console.log('[hasNonEmptySeries] Returning false - no valid values found');
  return false;
}
import { v4 as uuidv4 } from 'uuid'

// Types for the new Net Worth system
const createTimestamp = () => Date.now();

// Enhanced store with Net Worth simulation system
// Database-driven source selection
function pickSources(state) {
  const { sourcePreferences } = state;
  
  // Check if detailed data exists and source preference is 1 (detailed)
  console.log('[pickSources] Checking assets detail:', {
    assetsPreference: sourcePreferences?.assets,
    hasDetailAssets: !!state.detail?.assets,
    portfolioSeries: state.detail?.assets?.portfolioSeries,
    portfolioSeriesType: typeof state.detail?.assets?.portfolioSeries
  });
  
  const useAssetsDetail = sourcePreferences?.assets === 1 && hasNonEmptySeries(state.detail?.assets?.portfolioSeries);
  const useIncomeDetail = sourcePreferences?.income === 1 && hasNonEmptySeries(state.detail?.workIncome?.series);
  const useExpensesDetail = sourcePreferences?.expenses === 1 && hasNonEmptySeries(state.detail?.expenses?.series);
  const useEmiDetail = sourcePreferences?.loans === 1 && hasNonEmptySeries(state.detail?.loans?.series);

  console.log('[pickSources] Debug:', {
    sourcePreferences,
    assetsPreference: sourcePreferences?.assets,
    hasPortfolioSeries: !!state.detail?.assets?.portfolioSeries,
    portfolioSeriesLength: state.detail?.assets?.portfolioSeries ? Object.keys(state.detail.assets.portfolioSeries).length : 0,
    useAssetsDetail,
    useIncomeDetail, 
    useExpensesDetail, 
    useEmiDetail
  });
  
  return { useAssetsDetail, useIncomeDetail, useExpensesDetail, useEmiDetail };
}

export const useLifeSheetStore = create(
  subscribeWithSelector(
    immer((set, get) => ({
      // Main (Quick Calculator) inputs - fallback data
      main: {
        initialAssets: 0,
        startYear: new Date().getFullYear(),
        horizonYears: 20,
        
        // Quick Calculator constants
        r_assets: 0.06,           // asset return
        g_income: 0.06,           // income growth
        i_expenses: 0.06,         // expense inflation
        workTenureYears: 35,      // W
        income0: 0,               // base income
        expenses0: 0,             // base expenses
        
        // Quick loans: annual EMI by year
        quickEmiByYear: {},
        
        lastEditedAt: createTimestamp(),
      },

      // Detail Pages - authoritative time series
      detail: {
        assets: {
          portfolioSeries: {},     // Portfolio_t by year (authoritative)
          lastEditedAt: 0,
        },
        workIncome: {
          series: {},             // Income_t by year
          lastEditedAt: 0,
        },
        expenses: {
          series: {},             // Expenses_t by year (inflation already applied)
          lastEditedAt: 0,
        },
        loans: {
          series: {},             // EMI_t by year (sum of active EMIs)
          lastEditedAt: 0,
        },
      },

      // Source preferences (0 = main page, 1 = detailed page)
      sourcePreferences: {
        assets: 0,
        income: 0,
        expenses: 0,
        loans: 0,
        goals: 0
      },

      // Derived data
      years: [],
      chartData: [],

      // Legacy data (keeping for compatibility)
      lifeSheet: {
        age: '',
        currentAnnualGrossIncome: '',
        workTenureYears: '',
        totalAssetGrossMarketValue: '',
        totalLoanOutstandingValue: '',
        lifespanYears: 85,
        incomeGrowthRate: 0.06,
        assetGrowthRate: 0.06,
      },

      // Assets with enhanced fields
      assets: [
        {
          id: 'default-1',
          name: 'Stocks Portfolio',
          tag: 'Investment',
          subType: 'Equity',
          owner: 'Self',
          currency: 'INR',
          units: 100,
          costBasis: 50000,
          currentValue: 75000,
          updatedAt: new Date().toISOString(),
          notes: 'Diversified equity portfolio'
        },
        {
          id: 'default-2',
          name: 'Mutual Funds',
          tag: 'Investment',
          subType: 'MF',
          owner: 'Self',
          currency: 'INR',
          units: 50,
          costBasis: 25000,
          currentValue: 30000,
          updatedAt: new Date().toISOString(),
          notes: 'Large cap mutual funds'
        },
        {
          id: 'default-3',
          name: 'Emergency Fund',
          tag: 'Emergency',
          subType: 'Savings',
          owner: 'Self',
          currency: 'INR',
          units: 1,
          costBasis: 100000,
          currentValue: 100000,
          updatedAt: new Date().toISOString(),
          notes: 'High yield savings account'
        }
      ],
      
      // Work Assets (Human Capital)
      workAssets: {
        currentIncome: '',
        growthRate: 0.06,
        yearsToRetirement: '',
        extraStreams: []
      },

      // Goals with relations
      goals: [],
      
      // Loans with enhanced calculations
      loans: [],
      
      // Expenses with categories
      expenses: [],
      
      // Insurance policies
      insurance: [],
      
      // Dependants and Contributors
      persons: [],
      
      // Earmarks (Asset-Goal relationships)
      earmarks: [],
      
      // Scenarios for what-if analysis
      scenarios: [],
      currentScenario: 'baseline',
      
      // Chart data
      chartData: [],
      
      // UI State
      ui: {
        graphDockVisible: false,
        graphDockPosition: 'top-right',
        selectedView: 'grid',
        filters: {},
        sorts: {},
      },

      // Actions
      updateLifeSheet: (updates) => set((state) => {
        Object.assign(state.lifeSheet, updates)
        // Trigger recalculation
        get().recalculateAll()
      }),

      // Asset actions
      addAsset: (asset) => set((state) => {
        const newAsset = {
          id: uuidv4(),
          name: '',
          tag: 'Investment',
          subType: '',
          owner: '',
          currency: 'INR',
          units: 0,
          costBasis: 0,
          currentValue: 0,
          updatedAt: new Date().toISOString(),
          notes: '',
          ...asset
        }
        state.assets.push(newAsset)
        get().recalculateAll()
      }),

      updateAsset: (id, updates) => set((state) => {
        const asset = state.assets.find(a => a.id === id)
        if (asset) {
          Object.assign(asset, updates)
          asset.updatedAt = new Date().toISOString()
          get().recalculateAll()
        }
      }),

      deleteAsset: (id) => set((state) => {
        state.assets = state.assets.filter(a => a.id !== id)
        // Remove related earmarks
        state.earmarks = state.earmarks.filter(e => e.assetId !== id)
        get().recalculateAll()
      }),

      // Goal actions
      addGoal: (goal) => set((state) => {
        const newGoal = {
          id: uuidv4(),
          name: '',
          targetAmount: 0,
          targetDate: '',
          term: 'LT', // ST/LT
          recommendedAllocation: '',
          fundingSource: 'Mix',
          onTrack: false,
          ...goal
        }
        state.goals.push(newGoal)
        get().recalculateAll()
      }),

      updateGoal: (id, updates) => set((state) => {
        const goal = state.goals.find(g => g.id === id)
        if (goal) {
          Object.assign(goal, updates)
          get().recalculateAll()
        }
      }),

      deleteGoal: (id) => set((state) => {
        state.goals = state.goals.filter(g => g.id !== id)
        // Remove related earmarks
        state.earmarks = state.earmarks.filter(e => e.goalId !== id)
        get().recalculateAll()
      }),

      // Loan actions
      addLoan: (loan) => set((state) => {
        const newLoan = {
          id: uuidv4(),
          lender: '',
          type: '',
          startDate: '',
          endDate: '',
          principalOutstanding: 0,
          rate: 0,
          emi: 0,
          emiDay: 1,
          prepayAllowed: true,
          notes: '',
          ...loan
        }
        state.loans.push(newLoan)
        get().recalculateAll()
      }),

      updateLoan: (id, updates) => set((state) => {
        const loan = state.loans.find(l => l.id === id)
        if (loan) {
          Object.assign(loan, updates)
          get().recalculateAll()
        }
      }),

      deleteLoan: (id) => set((state) => {
        state.loans = state.loans.filter(l => l.id !== id)
        get().recalculateAll()
      }),

      // Set entire arrays (for loading data from API)
      setLoans: (loansArray) => set((state) => {
        state.loans = loansArray || []
        get().recalculateAll()
      }),

      setExpenses: (expensesArray) => set((state) => {
        state.expenses = expensesArray || []
        get().recalculateAll()
      }),

      setGoals: (goalsArray) => set((state) => {
        state.goals = goalsArray || []
        get().recalculateAll()
      }),

      // Expense actions
      addExpense: (expense) => set((state) => {
        const newExpense = {
          id: uuidv4(),
          category: '',
          subcategory: '',
          frequency: 'Monthly',
          amount: 0,
          personalInflation: 0.06,
          source: '',
          notes: '',
          ...expense
        }
        state.expenses.push(newExpense)
        get().recalculateAll()
      }),

      updateExpense: (id, updates) => set((state) => {
        const expense = state.expenses.find(e => e.id === id)
        if (expense) {
          Object.assign(expense, updates)
          get().recalculateAll()
        }
      }),

      deleteExpense: (id) => set((state) => {
        state.expenses = state.expenses.filter(e => e.id !== id)
        get().recalculateAll()
      }),

      // Earmark actions (Asset-Goal relationships)
      addEarmark: (earmark) => set((state) => {
        const newEarmark = {
          id: uuidv4(),
          assetId: '',
          goalId: '',
          percentage: 0,
          ...earmark
        }
        state.earmarks.push(newEarmark)
        get().recalculateAll()
      }),

      updateEarmark: (id, updates) => set((state) => {
        const earmark = state.earmarks.find(e => e.id === id)
        if (earmark) {
          Object.assign(earmark, updates)
          get().recalculateAll()
        }
      }),

      deleteEarmark: (id) => set((state) => {
        state.earmarks = state.earmarks.filter(e => e.id !== id)
        get().recalculateAll()
      }),

      // Person actions (Dependants & Contributors)
      addPerson: (person) => set((state) => {
        const newPerson = {
          id: uuidv4(),
          name: '',
          relation: 'Child',
          birthDate: '',
          role: 'Dependant',
          expenseShare: 0,
          incomeShare: 0,
          notes: '',
          ...person
        }
        state.persons.push(newPerson)
        get().recalculateAll()
      }),

      updatePerson: (id, updates) => set((state) => {
        const person = state.persons.find(p => p.id === id)
        if (person) {
          Object.assign(person, updates)
          get().recalculateAll()
        }
      }),

      deletePerson: (id) => set((state) => {
        state.persons = state.persons.filter(p => p.id !== id)
        get().recalculateAll()
      }),

      // Net Worth System - Source Selection Logic
      pickSources: () => {
        const { main, detail } = get();
        const result = {
          useAssetsDetail: detail.assets.lastEditedAt > main.lastEditedAt,
          useIncomeDetail: detail.workIncome.lastEditedAt > main.lastEditedAt,
          useExpensesDetail: detail.expenses.lastEditedAt > main.lastEditedAt,
          useEmiDetail: detail.loans.lastEditedAt > main.lastEditedAt,
        };
        console.log('🔄 Store: pickSources result:', {
          assetsLastEdited: detail.assets.lastEditedAt,
          mainLastEdited: main.lastEditedAt,
          useAssetsDetail: result.useAssetsDetail,
          detailAssetsKeys: Object.keys(detail.assets.portfolioSeries).length
        });
        return result;
      },

      // Build inputs per component using source selection
      buildInputs: () => {
        const state = get();
        const { main, detail } = state;
        const f = pickSources(state);

        // Generate years array
        const yearsArray = [];
        for (let i = 0; i < main.horizonYears; i++) {
          yearsArray.push(main.startYear + i);
        }
        
        // Update years in store
        set((state) => { state.years = yearsArray; });
        
        console.log('🔄 Store: Generated years array:', yearsArray);

        // ---- PORTFOLIO (authoritative when Assets detail is active)
        const portfolio = {};
        console.log('🔄 Store: Source selection debug:', {
          sourcePreferences: state.sourcePreferences,
          useAssetsDetail: f.useAssetsDetail,
          hasPortfolioSeries: !!detail.assets?.portfolioSeries,
          portfolioSeriesKeys: detail.assets?.portfolioSeries ? Object.keys(detail.assets.portfolioSeries).length : 0,
          firstYearValue: detail.assets?.portfolioSeries?.[yearsArray[0]]
        });
        
        if (f.useAssetsDetail) {
          console.log('🔄 Store: Using Assets detail time series');
          for (const y of yearsArray) {
            // NOTE: keys may be strings ("2025") but JS coerces num -> string, safe:
            const v = detail.assets.portfolioSeries?.[y];
            portfolio[y] = Number(v ?? 0);
          }
          if (process.env.NODE_ENV !== 'production') {
            console.log('[calc] using ASSETS DETAIL portfolio for first 3 years ->',
              yearsArray.slice(0,3).map(y => [y, portfolio[y]]));
          }
        } else {
          console.log('🔄 Store: Using Quick Calculator portfolio');
          // Fallback: Quick Calculator portfolio only
          let A = Number(main.initialAssets) || 0;
          for (let i = 0; i < yearsArray.length; i++) {
            const y = yearsArray[i];
            const t = i + 1;

            const inc = f.useIncomeDetail
              ? Number(detail.workIncome?.series?.[y] ?? 0)
              : (t <= main.workTenureYears
                  ? Number(main.income0) * Math.pow(1 + Number(main.g_income), t - 1)
                  : 0);

            const exp = f.useExpensesDetail
              ? Number(detail.expenses?.series?.[y] ?? 0)
              : Number(main.expenses0) * Math.pow(1 + Number(main.i_expenses), t - 1);

            const e = f.useEmiDetail
              ? Number(detail.loans?.series?.[y] ?? 0)
              : Number(main.quickEmiByYear?.[y] ?? 0);

            A = A * (1 + Number(main.r_assets)) + inc - exp - e;
            portfolio[y] = A;
          }
          if (process.env.NODE_ENV !== 'production') {
            console.log('[calc] using QUICK portfolio first year ->', yearsArray[0], portfolio[yearsArray[0]]);
          }
        }

        // Income series
        const income = {};
        console.log('🔄 Store: Building income series with main.income0:', main.income0, 'main.workTenureYears:', main.workTenureYears);
        yearsArray.forEach((y, i) => {
          const t = i + 1;
          if (f.useIncomeDetail) {
            income[y] = detail.workIncome.series[y] ?? 0;
          } else {
            const calculatedIncome = (t <= main.workTenureYears)
              ? main.income0 * Math.pow(1 + main.g_income, t - 1)
              : 0;
            income[y] = calculatedIncome;
            if (y === 2025) {
              console.log('🔄 Store: Year 2025 income calculation:', {
                t,
                mainIncome0: main.income0,
                gIncome: main.g_income,
                powResult: Math.pow(1 + main.g_income, t - 1),
                calculatedIncome
              });
            }
          }
        });

        // Expenses series
        const expenses = {};
        yearsArray.forEach((y, i) => {
          const t = i + 1;
          expenses[y] = f.useExpensesDetail
            ? (detail.expenses.series[y] ?? 0)
            : main.expenses0 * Math.pow(1 + main.i_expenses, t - 1);
        });

        // EMI series
        const emi = {};
        for (const y of yearsArray) {
          emi[y] = f.useEmiDetail
            ? (detail.loans.series[y] ?? 0)
            : (main.quickEmiByYear[y] ?? 0);
        }

        return { portfolio, income, expenses, emi };
      },

      // Net Worth Simulation
      simulate: () => {
        const { main } = get();
        console.log('🔄 Store: simulate called with main:', main);
        
        const { portfolio, income, expenses, emi } = get().buildInputs();
        console.log('🔄 Store: buildInputs result:', { portfolio, income, expenses, emi });

        // Generate years array directly
        const yearsArray = [];
        for (let i = 0; i < main.horizonYears; i++) {
          yearsArray.push(main.startYear + i);
        }
        console.log('🔄 Store: Using years array:', yearsArray);

        const out = [];
        let cash = 0;

        for (const y of yearsArray) {
          // Portfolio = from Assets page (if edited) OR Quick Calculator (includes all cash flows)
          const port = portfolio[y] ?? 0;
          
          // Cash = 0 (since portfolio already includes all cash flows)
          cash = 0;
          
          // Net worth = Portfolio (since portfolio includes everything)
          const nw = port;

          out.push({
            year: y,
            portfolio: Math.round(port),
            cash: Math.round(cash),
            netWorth: Math.round(nw),
          });
        }
        
        console.log('🔄 Store: simulate result:', out);
        return out;
      },

      // New Net Worth System Setters
      setMainInputs: (patch, opts = { origin: 'user' }) => set((state) => {
        console.log('🔄 Store: setMainInputs called with patch:', patch, 'origin:', opts.origin);
        console.log('🔄 Store: Current main before update:', state.main);
        
        // shallow diff – only update changed fields
        let changed = false
        for (const k of Object.keys(patch || {})) {
          const next = patch[k]
          if (state.main[k] !== next) {
            state.main[k] = next
            changed = true
          }
        }
        if (!changed) {
          console.log('🔄 Store: No changes detected, skipping update');
          return
        }

        // Only USER edits should "win" precedence
        if (opts.origin === 'user') {
          state.main.lastEditedAt = createTimestamp()
          console.log('🔄 Store: User edit detected, updated lastEditedAt:', state.main.lastEditedAt);
        } else {
          console.log('🔄 Store: System update, preserving lastEditedAt:', state.main.lastEditedAt);
        }
        
        console.log('🔄 Store: Updated main after patch:', state.main);
        console.log('🔄 Store: Key values in updated main:', {
          income0: state.main.income0,
          workTenureYears: state.main.workTenureYears,
          initialAssets: state.main.initialAssets
        });
        // Trigger recalculation after updating main inputs (defer to next tick)
        setTimeout(() => get().recalculateAll(), 0);
      }, false, 'main/update'),

      // A helper for non-user initialization/hydration that also recomputes
      hydrateMainInputs: (patch) => set((state) => {
        console.log('🔄 Store: hydrateMainInputs called with patch:', patch);
        let changed = false
        for (const k of Object.keys(patch || {})) {
          const next = patch[k]
          if (state.main[k] !== next) {
            state.main[k] = next
            changed = true
          }
        }
        // Do NOT touch lastEditedAt here
        if (!changed) {
          console.log('🔄 Store: No changes detected in hydrate, skipping update');
          return
        }
        console.log('🔄 Store: Hydrated main inputs without touching lastEditedAt');
      }, false, 'main/hydrate') && get().recalculateAll(),

      // Source preference management
      loadSourcePreferences: async () => {
        try {
          const response = await ApiService.getSourcePreferences();
          const preferences = response.preferences || {};
          set((state) => {
            state.sourcePreferences = preferences;
            console.log('🔄 Store: Source preferences loaded from API:', preferences);
          });
        } catch (error) {
          console.error('Failed to load source preferences:', error);
          // Set default preferences if API fails
          set((state) => {
            state.sourcePreferences = {
              assets: 0,
              income: 0,
              loans: 0,
              expenses: 0,
              goals: 0
            };
          });
        }
      },

      setSourcePreferences: (preferences) => set((state) => {
        state.sourcePreferences = { ...state.sourcePreferences, ...preferences };
        console.log('🔄 Store: Source preferences updated:', state.sourcePreferences);
      }, false, 'source/preferences'),

      setSourcePreference: async (component, source) => {
        try {
          await ApiService.updateSourcePreference(component, source);
          set((state) => {
            state.sourcePreferences[component] = source;
            console.log(`🔄 Store: ${component} source set to ${source} (${source === 0 ? 'main page' : 'detailed page'})`);
          });
          get().recalculateAll();
        } catch (error) {
          console.error(`Failed to update source preference for ${component}:`, error);
        }
      },

      // Separate function to trigger recalculation after state is updated
      triggerRecalculation: () => {
        console.log('🔄 Store: triggerRecalculation called');
        get().recalculateAll();
      },

      setDetailAssets: (portfolioSeries) => set((state) => {
        console.log('🔄 Store: setDetailAssets called with portfolioSeries keys:', Object.keys(portfolioSeries).length);
        console.log('🔄 Store: Sample portfolio values:', {
          year2025: portfolioSeries[2025],
          year2030: portfolioSeries[2030],
          year2035: portfolioSeries[2035]
        });
        state.detail.assets = { portfolioSeries, lastEditedAt: createTimestamp() };
        console.log('🔄 Store: detail.assets updated with lastEditedAt:', state.detail.assets.lastEditedAt);
        console.log('🔄 Store: detail.assets.portfolioSeries stored:', state.detail.assets.portfolioSeries);
      }, false, 'detail/assets'),

      setDetailIncome: (series) => set((state) => {
        state.detail.workIncome = { series, lastEditedAt: createTimestamp() };
      }, false, 'detail/income'),

      setDetailExpenses: (series) => set((state) => {
        state.detail.expenses = { series, lastEditedAt: createTimestamp() };
      }, false, 'detail/expenses'),

      setDetailEmi: (series) => set((state) => {
        state.detail.loans = { series, lastEditedAt: createTimestamp() };
      }, false, 'detail/loans'),

      // Update chart data using new simulation
      updateChartData: () => set((state) => {
        const simulation = get().simulate();
        state.chartData = simulation;
      }),

      // Calculation engine (legacy + new)
      recalculateAll: () => set((state) => {
        console.log('✅ Store: recalculateAll called');
        
        // Update chart data with new Net Worth system
        const simulation = get().simulate();
        console.log('✅ Store: new chartData size', simulation.length);
        console.log('✅ Store: simulation sample:', simulation.slice(0, 3));
        state.chartData = simulation;
        console.log('✅ Store: chartData updated in store, length:', state.chartData.length);
        console.log('✅ Store: chartData sample after update:', state.chartData.slice(0, 3));
        
        if (process.env.NODE_ENV !== 'production') {
          const first = state.chartData?.[0];
          console.log('[recalc] first-year ->', first);
        }
        
        // Update lifeSheet values from main state for UI display
        const { main } = state;
        state.lifeSheet.totalExistingAssets = main.initialAssets || 0;
        state.lifeSheet.totalExistingLiabilities = state.loans.reduce((sum, loan) => sum + (loan.principalOutstanding || 0), 0);
        state.lifeSheet.totalHumanCapital = (main.income0 || 0) * (main.workTenureYears || 0);
        state.lifeSheet.totalFutureExpense = state.expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
        state.lifeSheet.totalGoals = state.goals.reduce((sum, goal) => sum + (goal.targetAmount || 0), 0);
        
        console.log('✅ Store: lifeSheet updated:', {
          totalExistingAssets: state.lifeSheet.totalExistingAssets,
          totalExistingLiabilities: state.lifeSheet.totalExistingLiabilities,
          totalHumanCapital: state.lifeSheet.totalHumanCapital,
          totalFutureExpense: state.lifeSheet.totalFutureExpense,
          totalGoals: state.lifeSheet.totalGoals
        });
      }),

      calculateProjections: () => {
        const state = get()
        const { lifeSheet, assets, loans, expenses, workAssets } = state
        
        // Calculate totals
        const totalAssets = assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0)
        const totalLiabilities = loans.reduce((sum, loan) => sum + (loan.principalOutstanding || 0), 0)
        const totalGoals = state.goals.reduce((sum, goal) => sum + (goal.targetAmount || 0), 0)
        
        // Life Sheet style: simple annual expenses (no frequency multiplier)
        const annualExpenses = expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0)

        // Life Sheet style: simple human capital (no compounding)
        const currentIncome = parseFloat(workAssets.currentIncome || lifeSheet.currentAnnualGrossIncome || 0)
        const workTenure = parseInt(lifeSheet.workTenureYears || 0)
        const totalHumanCapital = currentIncome * workTenure

        // Generate chart data (match Life Sheet exactly)
        const chartData = []
        const currentAge = parseInt(lifeSheet.age || 30)
        const lifespan = lifeSheet.lifespanYears || 85

        // Life Sheet treats expense amounts and EMIs as annual *as-entered*
        const simpleAnnualExpense = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
        const simpleTotalEmi = loans.reduce((sum, loan) => sum + (parseFloat(loan.emi) || 0), 0)

        let cumulativeEarnings = 0
        for (let year = 0; year <= (lifespan - currentAge); year++) {
          if (year < workTenure) {
            cumulativeEarnings += currentIncome
          }
          const assetValue =
            (parseFloat(totalAssets) || 0)
            + cumulativeEarnings
            - ((simpleAnnualExpense + simpleTotalEmi) * year)

          chartData.push({
            year: new Date().getFullYear() + year,
            age: currentAge + year,
            asset: Math.round(assetValue)
          })
        }

        return {
          totalAssets,
          totalLiabilities,
          totalHumanCapital,
          totalFutureExpense: annualExpenses,
          totalGoals,
          chartData
        }
      },

      // UI actions
      toggleGraphDock: () => set((state) => {
        state.ui.graphDockVisible = !state.ui.graphDockVisible
      }),

      setGraphDockPosition: (position) => set((state) => {
        state.ui.graphDockPosition = position
      }),

      // Data persistence
      saveToLocalStorage: () => {
        const state = get()
        const dataToSave = {
          lifeSheet: state.lifeSheet,
          assets: state.assets,
          workAssets: state.workAssets,
          goals: state.goals,
          loans: state.loans,
          expenses: state.expenses,
          insurance: state.insurance,
          persons: state.persons,
          earmarks: state.earmarks,
          scenarios: state.scenarios,
          currentScenario: state.currentScenario,
        }
        localStorage.setItem('lifeSheetData', JSON.stringify(dataToSave))
      },

      loadFromLocalStorage: () => {
        try {
          const saved = localStorage.getItem('lifeSheetData')
          if (saved) {
            const data = JSON.parse(saved)
            set((state) => {
              Object.assign(state, data)
              get().recalculateAll()
            })
          }
        } catch (error) {
          console.error('Failed to load from localStorage:', error)
        }
      },
    }))
  )
)

// Event bus for real-time updates
export class EventBus {
  constructor() {
    this.events = {}
  }

  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
    
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    }
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data))
    }
  }
}

export const eventBus = new EventBus()

// Auto-save functionality
let saveTimeout
export const autoSave = () => {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    useLifeSheetStore.getState().saveToLocalStorage()
    eventBus.emit('dataSaved', { timestamp: new Date() })
  }, 1000)
}

// Subscribe to store changes for auto-save
useLifeSheetStore.subscribe(
  (state) => state,
  () => autoSave(),
  { fireImmediately: false }
)

