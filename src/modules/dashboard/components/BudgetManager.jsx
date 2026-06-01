import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  updateFinanceSettings,
  selectTotalSpent,
  selectBudgetRemaining,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';
import { CATEGORIES } from '../../../core/constants/finance';

export default function BudgetManager() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { monthlyBudget, monthlyIncome, categoryBudgets, saving } = useSelector(
    (state) => state.dashboard
  );
  const totalSpent = useSelector(selectTotalSpent);
  const remaining = useSelector(selectBudgetRemaining);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  const [budget, setBudget] = useState(monthlyBudget || '');
  const [income, setIncome] = useState(monthlyIncome || '');
  const [categoryLimits, setCategoryLimits] = useState(categoryBudgets || {});

  useEffect(() => {
    setBudget(monthlyBudget || '');
    setIncome(monthlyIncome || '');
    setCategoryLimits(categoryBudgets || {});
  }, [monthlyBudget, monthlyIncome, categoryBudgets]);

  const percent =
    monthlyBudget > 0 ? Math.min(100, Math.round((totalSpent / monthlyBudget) * 100)) : 0;

  const handleSave = () => {
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          monthlyBudget: Number(budget) || 0,
          monthlyIncome: Number(income) || 0,
          categoryBudgets: Object.fromEntries(
            Object.entries(categoryLimits).map(([k, v]) => [k, Number(v) || 0])
          ),
        },
      })
    );
  };

  return (
    <div className="feature-panel">
      <section className="card">
        <h3 className="card-title">Budget — {monthLabel}</h3>
        <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              remaining < 0 ? 'bg-danger' : 'bg-gradient-to-r from-primary to-accent'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mb-5 flex justify-between text-sm text-muted">
          <span>Spent: {formatINR(totalSpent)}</span>
          <span className={remaining < 0 ? 'text-danger' : ''}>
            {remaining < 0 ? 'Over by' : 'Left'}: {formatINR(Math.abs(remaining))}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <label className="label">
            Monthly income (₹)
            <input
              className="input mt-1"
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="e.g. 75000"
            />
          </label>
          <label className="label">
            Monthly budget (₹)
            <input
              className="input mt-1"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 50000"
            />
          </label>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save budget settings'}
          </button>
        </div>
      </section>

      <section className="card">
        <h3 className="card-title">Category-wise Limits</h3>
        <p className="card-desc">Set limits for Food, Travel, etc.</p>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <label key={cat} className="label">
              {cat}
              <input
                className="input mt-1"
                type="number"
                placeholder="₹ limit"
                value={categoryLimits[cat] ?? ''}
                onChange={(e) =>
                  setCategoryLimits((prev) => ({ ...prev, [cat]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>
        <button type="button" className="btn-outline btn-full" onClick={handleSave} disabled={saving}>
          Save category limits
        </button>
      </section>
    </div>
  );
}
