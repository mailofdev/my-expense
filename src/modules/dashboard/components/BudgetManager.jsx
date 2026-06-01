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
  const {
    monthlyBudget,
    monthlyIncome,
    categoryBudgets,
    saving,
  } = useSelector((state) => state.dashboard);
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
        <h3>Budget — {monthLabel}</h3>
        <div className="budget-bar">
          <div
            className={`budget-bar__fill ${remaining < 0 ? 'budget-bar__fill--over' : ''}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="budget-bar__labels">
          <span>Spent: {formatINR(totalSpent)}</span>
          <span className={remaining < 0 ? 'text-danger' : ''}>
            {remaining < 0 ? 'Over by' : 'Left'}: {formatINR(Math.abs(remaining))}
          </span>
        </div>

        <div className="settings-form">
          <label>
            Monthly income (₹)
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="e.g. 75000"
            />
          </label>
          <label>
            Monthly budget (₹)
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 50000"
            />
          </label>
          <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save budget settings'}
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Category-wise Limits</h3>
        <p className="card__desc">Set limits for Food, Travel, etc. (Indian spending style)</p>
        <div className="category-limits">
          {CATEGORIES.map((cat) => (
            <label key={cat}>
              {cat}
              <input
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
        <button type="button" className="btn btn--outline btn--full" onClick={handleSave} disabled={saving}>
          Save category limits
        </button>
      </section>
    </div>
  );
}
