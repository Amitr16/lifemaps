import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

// Enhanced store with complex data relationships
export const useLifeSheetStore = create(
  subscribeWithSelector(
    immer((set, get) => ({
      // Core Life Sheet Data
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
        graphDockVisible: true,
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

      // Calculation engine
      recalculateAll: () => set((state) => {
        const calculations = get().calculateProjections()
        state.chartData = calculations.chartData
        state.lifeSheet.totalExistingAssets = calculations.totalAssets
        state.lifeSheet.totalExistingLiabilities = calculations.totalLiabilities
        state.lifeSheet.totalHumanCapital = calculations.totalHumanCapital
        state.lifeSheet.totalFutureExpense = calculations.totalFutureExpense
        state.lifeSheet.cumulativeFinancialGoal = calculations.totalGoals
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

