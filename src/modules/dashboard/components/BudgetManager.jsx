import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  updateFinanceSettings,
  selectTotalSpent,
  selectBudgetRemaining,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';
import DisclosureToggle from '../../../shared/components/DisclosureToggle';

export default function BudgetManager() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { monthlyBudget, monthlyIncome, categoryBudgets, categories, saving } = useSelector(
    (state) => state.dashboard
  );
  const totalSpent = useSelector(selectTotalSpent);
  const remaining = useSelector(selectBudgetRemaining);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  const [budget, setBudget] = useState(monthlyBudget || '');
  const [income, setIncome] = useState(monthlyIncome || '');
  const [categoryLimits, setCategoryLimits] = useState(categoryBudgets || {});
  const [showCategories, setShowCategories] = useState(false);

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
        <p className="section-label m-0">{monthLabel}</p>
        {monthlyBudget > 0 ? (
          <>
            <div className="mb-3 mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-all ${
                  remaining < 0 ? 'bg-danger' : 'bg-primary'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Spent {formatINR(totalSpent)}</span>
              <span className={remaining < 0 ? 'text-danger' : 'font-medium'}>
                {remaining < 0 ? 'Over' : 'Left'} {formatINR(Math.abs(remaining))}
              </span>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Set a monthly budget below to track spending.</p>
        )}

        <div className="mt-6 space-y-3">
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
          <button type="button" className="btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </section>

      <section className="card">
        <DisclosureToggle
          open={showCategories}
          onToggle={() => setShowCategories((v) => !v)}
          title="Category limits"
          hintClosed="Tap to set optional limits per category"
          controlsId="category-limits-panel"
        />
        {showCategories && (
          <div
            id="category-limits-panel"
            className="mt-3 space-y-3 rounded-sm border border-edge/60 bg-surface-2/40 p-3"
          >
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <label key={cat} className="label">
                  {cat}
                  <input
                    className="input mt-1"
                    type="number"
                    placeholder="₹"
                    value={categoryLimits[cat] ?? ''}
                    onChange={(e) =>
                      setCategoryLimits((prev) => ({ ...prev, [cat]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <button type="button" className="btn-outline btn-full" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save limits'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
