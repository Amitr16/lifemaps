# Double Discounting Check

## Current Flow Analysis

### Detailed Calculations (from detailed pages):
1. **ExpensesPage**: Projects forward with inflation → `annualAmount * (1 + inflationRate)^yearOffset` → **NOMINAL**
2. **WorkAssetsPage**: Projects forward with growth → `annualAmount * (1 + growthRate)^yearsFromStart` → **NOMINAL**
3. **AssetsPage**: Projects forward with growth → `calculateSIPProjection()` → **NOMINAL**

### buildInputs() function:
- Returns NOMINAL (unadjusted) values
- Portfolio: projected forward (nominal)
- Income: projected forward (nominal)
- Expenses: projected forward (nominal)
- EMI: constant or projected (nominal)

### simulate() function:
- Takes NOMINAL values from buildInputs()
- Discounts by inflation: `value / (1 + inflation)^yearOffset`
- **CORRECT** - single discounting

### Table Calculation (calculateDetailedValues):
- Line 270: `assetsUnadjusted / Math.pow(1 + inflation, workTenure)`
- This discounts the final year's assets once - **CORRECT** for table (single value)

### Table Calculation (Quick Calculator):
- Lines 285-289: Discounts EACH YEAR during projection
- `projectedEquity *= (1 + equityGrowth); projectedEquity /= (1 + inflation);`
- After workTenure years: `assets * ((1 + growth) / (1 + inflation))^workTenure`
- This is **CORRECT** - it's equivalent to projecting then discounting

## Conclusion:
✅ **NO DOUBLE DISCOUNTING** - The logic is correct:
1. Detailed pages project forward (nominal) → simulate() discounts once
2. Quick calculator projects forward (nominal) → simulate() discounts once
3. Table calculations discount appropriately for single-value display

