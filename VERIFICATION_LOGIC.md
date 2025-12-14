# Discounting and Projection Logic Verification

## Current Implementation Analysis

### Step 1: Unadjusted Projection (Nominal Values)

**Income:**
- Formula: `Income_t = Income_0 × (1 + incomeGrowth)^t`
- ✅ Correct: Projects income forward with growth rate

**Expenses:**
- Formula: `Expenses_t = Expenses_0 × (1 + inflation)^t`
- ✅ Correct: Projects expenses forward with inflation

**EMI:**
- Formula: `EMI_t = EMI_0` (constant)
- ✅ Correct: No projection, stays constant

**Net Worth:**
- Formula: `Net Worth_t = Net Worth_t-1 × (1 + assetGrowth) + Income_t - Expenses_t - EMI_t`
- ✅ Correct: Compound growth model

**Asset Growth:**
- Formula: `assetGrowth = (equitySplit × equityGrowth) + (debtSplit × debtGrowth)`
- ⚠️ **Potential Issue**: This assumes portfolio maintains constant split ratio
- **Alternative**: Could track equity and debt separately and rebalance, but weighted average is acceptable for simplified model

### Step 2: Discounting to Present Value

**Discount Factor:**
- Formula: `discountFactor = (1 + inflation)^t`
- ✅ Correct: Standard present value discounting formula

**Adjusted Values:**
- `Net Worth_t (adjusted) = Net Worth_t (unadjusted) / (1 + inflation)^t`
- ✅ Correct: Discounts future value to present value

## Verification Examples

### Year 0 (Current Year)
- Discount Factor = (1 + inflation)^0 = 1
- Net Worth_0 (adjusted) = Net Worth_0 (unadjusted) / 1 = Net Worth_0
- ✅ Correct: No discounting for current year

### Year 1
- Discount Factor = (1 + inflation)^1 = 1 + inflation
- Net Worth_1 (adjusted) = Net Worth_1 (unadjusted) / (1 + inflation)
- ✅ Correct: One year of discounting

### Year 5
- Discount Factor = (1 + inflation)^5
- Net Worth_5 (adjusted) = Net Worth_5 (unadjusted) / (1 + inflation)^5
- ✅ Correct: Five years of discounting

## Potential Issues & Recommendations

### 1. Initial Net Worth
**Current:** `netWorthUnadjusted = totals.totalExistingAssets || 0`
**Issue:** Should be Net Worth = Assets - Liabilities
**Recommendation:** 
```javascript
const initialLiabilities = totals.totalExistingLiabilities || 0;
let netWorthUnadjusted = totals.totalExistingAssets - initialLiabilities;
```

### 2. Asset Growth Calculation
**Current:** Weighted average assumes constant portfolio split
**Alternative:** Track equity and debt separately:
```javascript
let equityValue = initialAssets * equitySplit;
let debtValue = initialAssets * (1 - equitySplit);

// Each year:
equityValue *= (1 + equityGrowth);
debtValue *= (1 + debtGrowth);
const totalAssets = equityValue + debtValue;
```

### 3. Liabilities in Chart
**Current:** `liabilities: totals.totalExistingLiabilities || 0` (constant)
**Issue:** Liabilities might change over time (as loans are paid off)
**Note:** This is acceptable if we're only showing principal outstanding, not the changing balance

## Conclusion

✅ **Overall Logic is Correct:**
1. Project forward with growth rates (unadjusted/nominal values)
2. Discount back to present value using inflation

⚠️ **Minor Improvements:**
1. Use Net Worth (Assets - Liabilities) as starting point
2. Consider tracking equity/debt separately if portfolio rebalancing is important

✅ **The discounting formula and projection approach are mathematically sound.**

