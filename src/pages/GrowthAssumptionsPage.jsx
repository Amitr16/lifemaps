import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import { useLifeSheetStore } from '@/store/enhanced-store';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/api';
import { toast } from 'sonner';

const DEFAULTS = {
  assetGrowthRate: 0.06,
  incomeGrowthRate: 0.06,
  expenseInflationRate: 0.06,
  lifespanYears: 85,
  assetEquityGrowthRate: 0.15,
  assetDebtGrowthRate: 0.07
};

const toPercent = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  return (parseFloat(value) * 100).toFixed(1);
};

const fromPercent = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed / 100 : '';
};

const asRate = (value, fallback) => {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  return n > 1 ? n / 100 : n;
};

export default function GrowthAssumptionsPage() {
  const { lifeSheet, setMainInputs } = useLifeSheetStore();
  const { user, isAuthenticated } = useAuth();
  const [values, setValues] = useState(DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let next = { ...DEFAULTS };
      try {
        const stored = JSON.parse(localStorage.getItem('quickCalcAssumptions') || '{}');
        next = {
          ...next,
          assetGrowthRate: stored.assetGrowthRate ?? next.assetGrowthRate,
          incomeGrowthRate: stored.incomeGrowthRate ?? next.incomeGrowthRate,
          expenseInflationRate: stored.inflationRate ?? next.expenseInflationRate,
          lifespanYears: stored.lifespanYears ?? (lifeSheet?.lifespanYears || next.lifespanYears),
          assetEquityGrowthRate: stored.assetEquityGrowthRate ?? next.assetEquityGrowthRate,
          assetDebtGrowthRate: stored.assetDebtGrowthRate ?? next.assetDebtGrowthRate
        };
      } catch (error) {
        console.warn('Failed to load growth assumptions from localStorage:', error);
      }
      if (isAuthenticated && user?.id) {
        try {
          const res = await ApiService.getFinancialProfile(user.id);
          const profile = res?.profile;
          if (profile) {
            next = {
              ...next,
              assetGrowthRate: asRate(profile.asset_growth_rate, next.assetGrowthRate),
              incomeGrowthRate: asRate(profile.income_growth_rate, next.incomeGrowthRate),
              expenseInflationRate: asRate(profile.inflation_rate, next.expenseInflationRate),
              lifespanYears: profile.lifespan_years ?? next.lifespanYears,
              assetEquityGrowthRate: asRate(profile.equity_growth_rate, next.assetEquityGrowthRate),
              assetDebtGrowthRate: asRate(profile.debt_growth_rate, next.assetDebtGrowthRate)
            };
          }
        } catch (error) {
          console.warn('Failed to load growth assumptions from profile:', error);
        }
      }
      if (!cancelled) setValues(next);
    };
    load();
    return () => { cancelled = true; };
  }, [lifeSheet, isAuthenticated, user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        inflationRate: values.expenseInflationRate,
        assetGrowthRate: values.assetGrowthRate,
        incomeGrowthRate: values.incomeGrowthRate,
        lifespanYears: values.lifespanYears,
        assetEquityGrowthRate: values.assetEquityGrowthRate,
        assetDebtGrowthRate: values.assetDebtGrowthRate
      };
      localStorage.setItem('quickCalcAssumptions', JSON.stringify(payload));
      setMainInputs({
        g_income: values.incomeGrowthRate,
        r_assets: values.assetGrowthRate
      }, { origin: 'user' });
      window.dispatchEvent(new Event('quickCalcAssumptionsUpdated'));

      if (isAuthenticated && user?.id) {
        const res = await ApiService.getFinancialProfile(user.id).catch(() => null);
        const body = {
          asset_growth_rate: values.assetGrowthRate,
          income_growth_rate: values.incomeGrowthRate,
          inflation_rate: values.expenseInflationRate,
          equity_growth_rate: values.assetEquityGrowthRate,
          debt_growth_rate: values.assetDebtGrowthRate,
          lifespan_years: values.lifespanYears
        };
        if (res?.profile?.id) await ApiService.updateFinancialProfile(res.profile.id, body);
        else await ApiService.createFinancialProfile({ age: 30, ...body });
        toast.success('Assumptions saved');
      }
    } catch (error) {
      console.error('Failed to save growth assumptions', error);
      toast.error(error.message || 'Could not save assumptions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="lm-body">
      <div id="sec-register">
        <PageHeader
          title="Growth assumptions"
          description="These rates are the long-run starting points LifeMap uses when a holding, income stream or expense does not have its own figure. Change them here and every projection redraws."
        />

        <div className="lm-card">
          <div className="lm-reghead">
            <h3>Long-run starting rates</h3>
            <div className="r">
              <button type="button" className="lm-ghost primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save assumptions'}
              </button>
            </div>
          </div>
          <div className="lm-assumes">
            {[
              { label: 'Asset growth rate', value: toPercent(values.assetGrowthRate), onChange: (v) => setValues(prev => ({ ...prev, assetGrowthRate: fromPercent(v) })), suffix: '%' },
              { label: 'Income growth rate', value: toPercent(values.incomeGrowthRate), onChange: (v) => setValues(prev => ({ ...prev, incomeGrowthRate: fromPercent(v) })), suffix: '%' },
              { label: 'Expense inflation', value: toPercent(values.expenseInflationRate), onChange: (v) => setValues(prev => ({ ...prev, expenseInflationRate: fromPercent(v) })), suffix: '%' },
              { label: 'Equity growth rate', value: toPercent(values.assetEquityGrowthRate), onChange: (v) => setValues(prev => ({ ...prev, assetEquityGrowthRate: fromPercent(v) })), suffix: '%' },
              { label: 'Debt growth rate', value: toPercent(values.assetDebtGrowthRate), onChange: (v) => setValues(prev => ({ ...prev, assetDebtGrowthRate: fromPercent(v) })), suffix: '%' },
              { label: 'Life expectancy', value: values.lifespanYears, onChange: (v) => setValues(prev => ({ ...prev, lifespanYears: parseInt(v || 85) })), suffix: 'years' }
            ].map((item) => (
              <div key={item.label} className="lm-arow">
                <span className="lab">{item.label}</span>
                <div className="ctrl">
                  <input
                    className="lm-inp"
                    value={item.value}
                    onChange={(e) => item.onChange(e.target.value)}
                  />
                  <span className="sfx">{item.suffix}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="lm-note" style={{ textAlign: 'left' }}>
            A row on Assets, Work Assets, Goals or Expenses can override these. Signed-in saves live on your profile so every page uses the same rates.
          </div>
        </div>
      </div>
    </div>
  );
}

