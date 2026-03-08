import React, { useEffect, useState } from 'react';
import { LineChart, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLifeSheetStore } from '@/store/enhanced-store';

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

export default function GrowthAssumptionsPage() {
  const { lifeSheet, setMainInputs } = useLifeSheetStore();
  const [values, setValues] = useState(DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('quickCalcAssumptions') || '{}');
      setValues(prev => ({
        ...prev,
        assetGrowthRate: stored.assetGrowthRate ?? prev.assetGrowthRate,
        incomeGrowthRate: stored.incomeGrowthRate ?? prev.incomeGrowthRate,
        expenseInflationRate: stored.inflationRate ?? prev.expenseInflationRate,
        lifespanYears: stored.lifespanYears ?? (lifeSheet?.lifespanYears || prev.lifespanYears),
        assetEquityGrowthRate: stored.assetEquityGrowthRate ?? prev.assetEquityGrowthRate,
        assetDebtGrowthRate: stored.assetDebtGrowthRate ?? prev.assetDebtGrowthRate
      }));
    } catch (error) {
      console.warn('Failed to load growth assumptions from localStorage:', error);
    }
  }, [lifeSheet]);

  const handleSave = () => {
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
      
      // Dispatch custom event to notify other components (like main page) of the update
      window.dispatchEvent(new Event('quickCalcAssumptionsUpdated'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="lifemap-page-header">
        <div>
          <h1 className="lifemap-page-title">Growth Assumptions</h1>
          <p className="lifemap-page-subtitle">Modify your Growth Assumption Rates</p>
        </div>
      </div>

      <div className="lifemap-panel">
        <div className="lifemap-panel-header">
          <div className="lifemap-panel-title">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
              <LineChart className="h-4 w-4" />
            </span>
            Modify your Growth Assumption Rates
          </div>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <div className="p-6">
          <div className="text-sm font-semibold text-slate-700 mb-4">Growth Rate Assumptions</div>
          <div className="space-y-3">
            {[
              { label: 'Asset Growth Rate', value: toPercent(values.assetGrowthRate), onChange: (v) => setValues(prev => ({ ...prev, assetGrowthRate: fromPercent(v) })), suffix: '%' },
              { label: 'Income Growth Rate', value: toPercent(values.incomeGrowthRate), onChange: (v) => setValues(prev => ({ ...prev, incomeGrowthRate: fromPercent(v) })), suffix: '%' },
              { label: 'Expense Inflation Rate', value: toPercent(values.expenseInflationRate), onChange: (v) => setValues(prev => ({ ...prev, expenseInflationRate: fromPercent(v) })), suffix: '%' },
              { label: 'Equity Growth Rate', value: toPercent(values.assetEquityGrowthRate), onChange: (v) => setValues(prev => ({ ...prev, assetEquityGrowthRate: fromPercent(v) })), suffix: '%' },
              { label: 'Debt Growth Rate', value: toPercent(values.assetDebtGrowthRate), onChange: (v) => setValues(prev => ({ ...prev, assetDebtGrowthRate: fromPercent(v) })), suffix: '%' },
              { label: 'Life Expectancy', value: values.lifespanYears, onChange: (v) => setValues(prev => ({ ...prev, lifespanYears: parseInt(v || 85) })), suffix: 'years' }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">{item.label}</span>
                <div className="flex items-center gap-2">
                  <Input
                    value={item.value}
                    onChange={(e) => item.onChange(e.target.value)}
                    className="w-20 text-right"
                  />
                  <span className="text-sm text-slate-500">{item.suffix}</span>
                  <Pencil className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

