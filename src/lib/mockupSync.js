import ApiService from '../services/api'

const PAGES = {
  fp: '/lifemap/fp-calculator.html',
  assets: '/lifemap/assets.html',
  work: '/lifemap/work-assets.html',
  goals: '/lifemap/goals.html',
  loans: '/lifemap/loans.html',
  expenses: '/lifemap/expenses.html',
}

export function mockupSrc(page) {
  return PAGES[page] || PAGES.fp
}

const asList = (data, ...keys) => {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key]
  }
  return []
}

const num = (v, fallback = 0) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

const thisYear = () => new Date().getFullYear()

const realId = (id) => id != null && !String(id).startsWith('temp_')

const FREQ_PER_YEAR = {
  Weekly: 52,
  Fortnightly: 26,
  Monthly: 12,
  Quarterly: 4,
  'Semi-Annually': 2,
  'Half-yearly': 2,
  Annually: 1,
  Yearly: 1,
}

const asPct = (v, fallback = 0) => {
  const n = num(v, fallback)
  if (!Number.isFinite(n)) return fallback
  return n > 0 && n <= 1 ? n * 100 : n
}

const asRate = (v, fallback = 0) => {
  const n = num(v, fallback)
  if (!Number.isFinite(n)) return fallback
  return n > 1 ? n / 100 : n
}

const yearOf = (value) => {
  if (!value) return ''
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getFullYear()
  const text = String(value)
  const match = text.match(/^(\d{4})/)
  return match ? Number(match[1]) : ''
}

function readAssumptions() {
  try {
    return JSON.parse(localStorage.getItem('quickCalcAssumptions') || '{}')
  } catch {
    return {}
  }
}

function writeAssumptions(next) {
  const prev = readAssumptions()
  localStorage.setItem('quickCalcAssumptions', JSON.stringify({ ...prev, ...next }))
}

function createdId(created) {
  if (!created || typeof created !== 'object') return null
  return (
    created.id ||
    created.asset?.id ||
    created.goal?.id ||
    created.expense?.id ||
    created.loan?.id ||
    created.plannedLoan?.id ||
    null
  )
}

function profileAssumptions(profile, local = readAssumptions()) {
  return {
    inflationRate: asRate(profile?.inflation_rate ?? local.inflationRate, 0.06),
    assetGrowthRate: asRate(profile?.asset_growth_rate ?? local.assetGrowthRate, 0.11),
    incomeGrowthRate: asRate(profile?.income_growth_rate ?? local.incomeGrowthRate, 0.08),
    equityGrowthRate: asRate(profile?.equity_growth_rate ?? local.assetEquityGrowthRate, 0.15),
    debtGrowthRate: asRate(profile?.debt_growth_rate ?? local.assetDebtGrowthRate, 0.07),
    lifespanYears: num(profile?.lifespan_years ?? local.lifespanYears, 85),
    age: num(profile?.age ?? local.age, 32),
  }
}

async function upsertProfile(userId, payload) {
  const profileRes = await ApiService.getFinancialProfile(userId).catch(() => null)
  const profile = profileRes?.profile
  if (profile?.id) return ApiService.updateFinancialProfile(profile.id, payload)
  return ApiService.createFinancialProfile(payload)
}

export async function loadMockupState(page, userId) {
  const profileRes = await ApiService.getFinancialProfile(userId).catch(() => null)
  const profile = profileRes?.profile || null
  const assumptions = profileAssumptions(profile)
  writeAssumptions(assumptions)
  const age = assumptions.age

  if (page === 'fp') {
    const [assetsRes, loansRes, goalsRes, expensesRes] = await Promise.all([
      ApiService.getFinancialAssets(userId).catch(() => ({})),
      ApiService.getFinancialLoans(userId).catch(() => ({})),
      ApiService.getFinancialGoals(userId).catch(() => ({})),
      ApiService.getFinancialExpenses(userId).catch(() => ({})),
    ])
    const assets = asList(assetsRes, 'assets')
    const finAssets = assets
      .filter((a) => (a.tag || '') !== 'Personal')
      .reduce((s, a) => s + num(a.current_value), 0)
    const personalAssets = assets
      .filter((a) => (a.tag || '') === 'Personal')
      .reduce((s, a) => s + num(a.current_value), 0)

    return {
      S: {
        age: age || 30,
        salary: num(profile?.current_annual_gross_income),
        gSal: asPct(assumptions.incomeGrowthRate, 8),
        workTill: age && profile?.work_tenure_years ? age + num(profile.work_tenure_years) : num(profile?.work_tenure_years, 60),
        finAssets: finAssets || num(profile?.total_asset_gross_market_value),
        personalAssets: personalAssets || num(profile?.personal_asset_value),
        loans: asList(loansRes, 'loans').map((l) => ({
          id: l.id,
          n: l.loanName || l.name || l.type || 'Loan',
          v: num(l.principal_outstanding ?? l.amount),
          emi: num(l.emi),
          saved: true,
        })),
        goals: asList(goalsRes, 'goals').map((g) => {
          const targetYear = num(g.target_year ?? g.targetYear, thisYear() + 5)
          return {
            id: g.id,
            n: g.description || g.name || '',
            v: num(g.target_amount ?? g.amount),
            yrs: Math.max(0, targetYear - thisYear()),
            saved: true,
          }
        }),
        exp: asList(expensesRes, 'expenses').map((e) => {
          const freq = e.frequency || 'Monthly'
          const amount = num(e.amount)
          return {
            id: e.id,
            n: e.description || e.category || 'Expense',
            v: amount * (FREQ_PER_YEAR[freq] || 12),
            saved: true,
          }
        }),
        gRet: asPct(assumptions.assetGrowthRate, 11),
        gInf: asPct(assumptions.inflationRate, 6),
        lifeTo: assumptions.lifespanYears || 85,
      },
    }
  }

  if (page === 'assets') {
    const res = await ApiService.getFinancialAssets(userId).catch(() => ({}))
    const ROWS = asList(res, 'assets').map((a) => {
      const cd = a.custom_data || {}
      return {
        id: a.id,
        name: a.name || '',
        cat: a.category || cd.cat || cd.subType || 'Other',
        tag: a.tag || 'Investment',
        val: num(a.current_value),
        sip: num(a.sip_amount ?? cd.sipAmount),
        freq: a.sip_frequency || cd.sipFrequency || 'Monthly',
        exp: a.sip_expiry_date || cd.sipExpiryDate || '',
        ret: asPct(a.expected_return ?? cd.expectedReturn, 6),
        notes: a.notes || cd.notes || '',
        saved: true,
      }
    })
    return { ROWS }
  }

  if (page === 'work') {
    const res = await ApiService.getWorkAssets(userId).catch(() => [])
    const list = asList(res, 'workAssets', 'assets', 'data')
    const colors = [
      '#2f6fd0', '#0d8a78', '#e9a23b', '#c94f70', '#7b61c9',
      '#2a9dce', '#d65a31', '#5a9e3d', '#b35c9c', '#8c6d31',
    ]
    const ROWS = list.map((r, i) => ({
      id: r.id,
      c: r.color || colors[i % colors.length],
      name: r.stream || r.name || '',
      amt: num(r.amount),
      g: asPct(r.growthRate, 5),
      end: num(r.endAge, 65),
      notes: r.notes || '',
      saved: true,
    }))
    return { ROWS, AGE: age || 32 }
  }

  if (page === 'goals') {
    const res = await ApiService.getFinancialGoals(userId).catch(() => ({}))
    const lm = (g) => g.custom_data?.lifemap || {}
    const ROWS = asList(res, 'goals').map((g) => {
      const extra = lm(g)
      const targetYear = num(g.target_year ?? g.targetYear, thisYear() + 10)
      const at = num(g.target_age, extra.at || (age ? age + Math.max(0, targetYear - thisYear()) : 40))
      return {
        id: g.id,
        name: g.description || g.name || '',
        cat: g.category || extra.cat || 'Other',
        flex: g.flexibility || extra.flex || 'Committed',
        cost: num(g.target_amount ?? g.amount),
        at,
        span: num(g.span_years ?? extra.span, 1),
        inf: asPct(g.inflation_pct ?? extra.inf, 6),
        notes: g.notes || extra.notes || '',
        saved: true,
      }
    })
    return { ROWS, AGE: age || 32, RET: asPct(assumptions.assetGrowthRate, 11) }
  }

  if (page === 'loans') {
    const [res, plannedRes] = await Promise.all([
      ApiService.getFinancialLoans(userId).catch(() => ({})),
      ApiService.getPlannedLoans(userId).catch(() => ({})),
    ])
    const ROWS = asList(res, 'loans').map((l) => ({
      id: l.id,
      prov: l.lender || l.provider || '',
      name: l.loanName || l.name || '',
      cat: l.type || l.cat || 'Other',
      bal: num(l.principal_outstanding ?? l.amount),
      rate: num(l.rate ?? l.interestRate),
      emi: num(l.emi),
      freq: l.frequency || l.freq || 'Monthly',
      notes: l.notes || '',
      end: l.loanExpiry || yearOf(l.end_date) || '',
      saved: true,
    }))
    const PLAN = asList(plannedRes, 'plannedLoans', 'loans').map((l) => ({
      id: l.id,
      prov: l.lender || '',
      name: l.name || '',
      cat: l.type || 'Other',
      bal: num(l.principal),
      rate: num(l.rate),
      emi: num(l.emi),
      freq: l.frequency || 'Monthly',
      start: num(l.start_year, thisYear() + 1),
      notes: l.notes || '',
      saved: true,
    }))
    return { ROWS, PLAN }
  }

  if (page === 'expenses') {
    const res = await ApiService.getFinancialExpenses(userId).catch(() => ({}))
    const life = assumptions.lifespanYears || 90
    const ROWS = asList(res, 'expenses').map((e) => {
      const freq = e.frequency === 'Semi-Annually' ? 'Half-yearly' : (e.frequency === 'Yearly' ? 'Annually' : (e.frequency || 'Monthly'))
      return {
        id: e.id,
        cat: e.category || 'Other',
        sub: e.description || e.subcategory || '',
        type: e.need_type || e.tag_for || e.type || 'Need',
        amt: num(e.amount),
        freq,
        inf: asPct(e.personal_inflation, 6),
        from: num(e.start_age, age || 32),
        to: num(e.end_age, life || 90),
        src: e.payment_from || '',
        notes: e.notes || '',
        saved: true,
      }
    })
    return { ROWS, AGE: age || 32, LIFE: life || 90, GINF: asPct(assumptions.inflationRate, 6) }
  }

  return null
}

async function syncCollection({ existing, next, create, update, remove, payload, keep }) {
  const current = existing.filter((row) => realId(row.id))
  const incoming = next.filter((row) => row && (row.name || row.n || row.sub || row.prov || row.cat))
  const incomingIds = new Set(incoming.filter((row) => realId(row.id)).map((row) => String(row.id)))

  for (const row of current) {
    if (!incomingIds.has(String(row.id))) {
      await remove(row.id).catch(() => {})
    }
  }

  for (const row of incoming) {
    const prior = current.find((item) => String(item.id) === String(row.id))
    const body = payload(row, prior)
    if (realId(row.id)) {
      await update(row.id, body).catch(() => {})
    } else {
      const created = await create(body).catch(() => null)
      const id = createdId(created)
      if (id) row.id = id
    }
  }
  return keep ? incoming : undefined
}

export async function saveMockupState(page, userId, state) {
  if (!userId || !state) return

  if (page === 'fp' && state.S) {
    const S = state.S
    const workTenure = Math.max(0, num(S.workTill) - num(S.age))
    const payload = {
      age: num(S.age),
      current_annual_gross_income: num(S.salary),
      work_tenure_years: workTenure,
      total_asset_gross_market_value: num(S.finAssets) + num(S.personalAssets),
      personal_asset_value: num(S.personalAssets),
      total_loan_outstanding_value: (S.loans || []).reduce((s, l) => s + num(l.v), 0),
      lifespan_years: num(S.lifeTo, 85),
      income_growth_rate: asRate(S.gSal, 0.08),
      asset_growth_rate: asRate(S.gRet, 0.11),
      inflation_rate: asRate(S.gInf, 0.06),
    }
    writeAssumptions({
      inflationRate: payload.inflation_rate,
      assetGrowthRate: payload.asset_growth_rate,
      incomeGrowthRate: payload.income_growth_rate,
      lifespanYears: payload.lifespan_years,
      age: payload.age,
    })
    await upsertProfile(userId, payload)

    const [loansRes, goalsRes, expensesRes] = await Promise.all([
      ApiService.getFinancialLoans(userId).catch(() => ({})),
      ApiService.getFinancialGoals(userId).catch(() => ({})),
      ApiService.getFinancialExpenses(userId).catch(() => ({})),
    ])

    await syncCollection({
      existing: asList(loansRes, 'loans'),
      next: S.loans || [],
      create: (body) => ApiService.createFinancialLoan(body),
      update: (id, body) => ApiService.updateFinancialLoan(id, body),
      remove: (id) => ApiService.deleteFinancialLoan(id),
      payload: (row, prior) => ({
        name: row.n || 'Loan',
        lender: prior?.lender || prior?.provider || row.n || 'Lender',
        type: prior?.type || 'Other',
        principal_outstanding: num(row.v),
        emi: num(row.emi),
        rate: num(prior?.rate ?? prior?.interestRate, 0),
        frequency: prior?.frequency || 'Monthly',
        notes: prior?.notes || '',
      }),
    })

    await syncCollection({
      existing: asList(goalsRes, 'goals'),
      next: S.goals || [],
      create: (body) => ApiService.createFinancialGoal(body),
      update: (id, body) => ApiService.updateFinancialGoal(id, body),
      remove: (id) => ApiService.deleteFinancialGoal(id),
      payload: (row, prior) => ({
        name: row.n || 'Goal',
        description: row.n || 'Goal',
        target_amount: num(row.v),
        target_year: thisYear() + Math.max(0, num(row.yrs, 5)),
        category: prior?.category || 'Other',
        flexibility: prior?.flexibility || 'Committed',
        span_years: prior?.span_years ?? 1,
        inflation_pct: prior?.inflation_pct ?? 6,
        notes: prior?.notes || '',
      }),
    })

    await syncCollection({
      existing: asList(expensesRes, 'expenses'),
      next: S.exp || [],
      create: (body) => ApiService.createFinancialExpense(body),
      update: (id, body) => ApiService.updateFinancialExpense(id, body),
      remove: (id) => ApiService.deleteFinancialExpense(id),
      payload: (row, prior) => {
        const freq = prior?.frequency || 'Annually'
        const periods = FREQ_PER_YEAR[freq] || 1
        return {
          description: row.n || 'Expense',
          category: prior?.category || 'Other',
          amount: num(row.v) / periods,
          frequency: freq,
          tag_for: prior?.need_type || prior?.tag_for || 'Need',
          need_type: prior?.need_type || prior?.tag_for || 'Need',
          personal_inflation: prior?.personal_inflation ?? 0.06,
          start_age: prior?.start_age,
          end_age: prior?.end_age,
          notes: prior?.notes || '',
        }
      },
    })
    return
  }

  if (page === 'assets') {
    const res = await ApiService.getFinancialAssets(userId).catch(() => ({}))
    await syncCollection({
      existing: asList(res, 'assets'),
      next: state.ROWS || [],
      create: (body) => ApiService.createFinancialAsset(body),
      update: (id, body) => ApiService.updateFinancialAsset(id, body),
      remove: (id) => ApiService.deleteFinancialAsset(id),
      payload: (row) => ({
        name: row.name || 'Asset',
        tag: row.tag || 'Investment',
        current_value: num(row.val),
        category: row.cat || 'Other',
        sip_amount: num(row.sip),
        sip_frequency: row.freq || 'Monthly',
        sip_expiry_date: row.exp || '',
        expected_return: num(row.ret),
        notes: row.notes || '',
      }),
    })
    return
  }

  if (page === 'work') {
    const res = await ApiService.getWorkAssets(userId).catch(() => [])
    await syncCollection({
      existing: asList(res, 'workAssets', 'assets', 'data'),
      next: (state.ROWS || []).map((row) => ({ ...row, name: row.name })),
      create: (body) => ApiService.createWorkAsset(body),
      update: (id, body) => ApiService.updateWorkAsset(id, body),
      remove: (id) => ApiService.deleteWorkAsset(id),
      payload: (row) => ({
        stream: row.name || 'Income stream',
        amount: num(row.amt),
        growthRate: num(row.g, 5),
        endAge: num(row.end, 65),
        notes: row.notes || '',
        color: row.c || null,
      }),
    })
    if (state.AGE) {
      await upsertProfile(userId, { age: num(state.AGE) }).catch(() => {})
    }
    return
  }

  if (page === 'goals') {
    const res = await ApiService.getFinancialGoals(userId).catch(() => ({}))
    const age = num(state.AGE, 32)
    await syncCollection({
      existing: asList(res, 'goals'),
      next: state.ROWS || [],
      create: (body) => ApiService.createFinancialGoal(body),
      update: (id, body) => ApiService.updateFinancialGoal(id, body),
      remove: (id) => ApiService.deleteFinancialGoal(id),
      payload: (row) => ({
        name: row.name || 'Goal',
        description: row.name || 'Goal',
        target_amount: num(row.cost),
        target_year: thisYear() + Math.max(0, num(row.at, age) - age),
        target_age: num(row.at),
        category: row.cat || 'Other',
        flexibility: row.flex || 'Committed',
        span_years: num(row.span, 1),
        inflation_pct: num(row.inf, 6),
        notes: row.notes || '',
      }),
    })
    const assetGrowthRate = asRate(state.RET, 0.11)
    writeAssumptions({ assetGrowthRate, age })
    await upsertProfile(userId, { age, asset_growth_rate: assetGrowthRate }).catch(() => {})
    return
  }

  if (page === 'loans') {
    const [res, plannedRes] = await Promise.all([
      ApiService.getFinancialLoans(userId).catch(() => ({})),
      ApiService.getPlannedLoans(userId).catch(() => ({})),
    ])
    await syncCollection({
      existing: asList(res, 'loans'),
      next: state.ROWS || [],
      create: (body) => ApiService.createFinancialLoan(body),
      update: (id, body) => ApiService.updateFinancialLoan(id, body),
      remove: (id) => ApiService.deleteFinancialLoan(id),
      payload: (row) => ({
        lender: row.prov || 'Lender',
        name: row.name || '',
        type: row.cat || 'Other',
        principal_outstanding: num(row.bal),
        rate: num(row.rate),
        emi: num(row.emi),
        frequency: row.freq || 'Monthly',
        notes: row.notes || '',
        end_date: row.end ? `${num(row.end)}-12-31` : undefined,
      }),
    })
    await syncCollection({
      existing: asList(plannedRes, 'plannedLoans', 'loans'),
      next: state.PLAN || [],
      create: (body) => ApiService.createPlannedLoan(body),
      update: (id, body) => ApiService.updatePlannedLoan(id, body),
      remove: (id) => ApiService.deletePlannedLoan(id),
      payload: (row) => ({
        lender: row.prov || '',
        name: row.name || '',
        type: row.cat || 'Other',
        principal: num(row.bal),
        rate: num(row.rate),
        emi: num(row.emi),
        frequency: row.freq || 'Monthly',
        start_year: num(row.start, thisYear() + 1),
        notes: row.notes || '',
      }),
    })
    return
  }

  if (page === 'expenses') {
    const res = await ApiService.getFinancialExpenses(userId).catch(() => ({}))
    await syncCollection({
      existing: asList(res, 'expenses'),
      next: state.ROWS || [],
      create: (body) => ApiService.createFinancialExpense(body),
      update: (id, body) => ApiService.updateFinancialExpense(id, body),
      remove: (id) => ApiService.deleteFinancialExpense(id),
      payload: (row) => ({
        description: row.sub || row.cat || 'Expense',
        amount: num(row.amt),
        frequency: row.freq === 'Half-yearly' ? 'Half-yearly' : (row.freq || 'Monthly'),
        category: row.cat || 'Other',
        tag_for: row.type || 'Need',
        need_type: row.type || 'Need',
        payment_from: row.src || '',
        personal_inflation: asRate(row.inf, 0.06),
        notes: row.notes || '',
        start_age: num(row.from),
        end_age: num(row.to),
      }),
    })
    const inflationRate = asRate(state.GINF, 0.06)
    const lifespanYears = num(state.LIFE, 90)
    const age = num(state.AGE, 32)
    writeAssumptions({ inflationRate, lifespanYears, age })
    await upsertProfile(userId, {
      inflation_rate: inflationRate,
      lifespan_years: lifespanYears,
      age,
    }).catch(() => {})
  }
}
