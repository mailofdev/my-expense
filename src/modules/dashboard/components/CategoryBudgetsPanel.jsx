import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  updateFinanceSettings,
  selectCategoryBudgetPlan,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';
import {
  clampSavingsPercent,
  computeSpendablePool,
  normalizeCategoryBudgetMap,
  suggestCategoryBudgets,
  sumCategoryBudgets,
  getBudgetAllocationStatus,
  DEFAULT_SAVINGS_GOAL_PERCENT,
} from '../utils/budgetPlan';

function budgetsToDraft(budgets, categoryNames) {
  const next = {};
  categoryNames.forEach((name) => {
    const amount = Number(budgets?.[name]) || 0;
    next[name] = amount > 0 ? String(amount) : '';
  });
  return next;
}

/**
 * Set category spending limits from this month’s income (after a savings %).
 * Soft plan: Savings bank is not part of the spend pool.
 */
export default function CategoryBudgetsPanel({ embedded = false }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving, habits } = useSelector((state) => state.dashboard);
  const plan = useSelector(selectCategoryBudgetPlan);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  const namesKey = plan.categoryNames.join('|');
  const budgetsKey = plan.categoryNames
    .map((name) => `${name}:${Number(plan.budgets?.[name]) || 0}`)
    .join('|');

  const [savingsPercent, setSavingsPercent] = useState(
    String(plan.savingsPercent || DEFAULT_SAVINGS_GOAL_PERCENT)
  );
  const [draftBudgets, setDraftBudgets] = useState(() =>
    budgetsToDraft(plan.budgets, plan.categoryNames)
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSavingsPercent(String(plan.savingsPercent || DEFAULT_SAVINGS_GOAL_PERCENT));
    setDraftBudgets(budgetsToDraft(plan.budgets, plan.categoryNames));
  }, [plan.savingsPercent, namesKey, budgetsKey]);

  const livePool = useMemo(() => {
    const pct = clampSavingsPercent(savingsPercent, plan.savingsPercent);
    return computeSpendablePool(plan.income, pct);
  }, [plan.income, plan.savingsPercent, savingsPercent]);

  const allocated = useMemo(() => {
    const map = {};
    plan.categoryNames.forEach((name) => {
      map[name] = Number(draftBudgets[name]) || 0;
    });
    return sumCategoryBudgets(map);
  }, [draftBudgets, plan.categoryNames]);

  const allocation = getBudgetAllocationStatus(allocated, livePool.spendable);

  const setBudgetValue = (name, value) => {
    setDraftBudgets((prev) => ({ ...prev, [name]: value }));
    setMessage('');
  };

  const handleSuggest = () => {
    if (livePool.spendable <= 0) {
      setMessage('Add income on Money first, then suggest limits.');
      return;
    }
    const suggested = suggestCategoryBudgets(livePool.spendable, plan.categoryNames);
    setDraftBudgets(budgetsToDraft(suggested, plan.categoryNames));
    setMessage('Suggested from salary after savings. Tweak any row, then save.');
  };

  const handleClear = () => {
    setDraftBudgets(budgetsToDraft({}, plan.categoryNames));
    setMessage('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    const pct = clampSavingsPercent(savingsPercent, DEFAULT_SAVINGS_GOAL_PERCENT);
    const raw = {};
    plan.categoryNames.forEach((name) => {
      raw[name] = Number(draftBudgets[name]) || 0;
    });
    const categoryBudgets = normalizeCategoryBudgetMap(raw, plan.categoryNames);

    setMessage('');
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          categoryBudgets,
          habits: {
            ...(habits || {}),
            savingsGoalPercent: pct,
          },
        },
      })
    ).then((result) => {
      if (!result.error) {
        setSavingsPercent(String(pct));
        setMessage('Saved. You’ll see warnings when a category nears its limit.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not save.');
      }
    });
  };

  const body = (
    <form onSubmit={handleSave} className="space-y-4">
      <p className="m-0 text-sm leading-relaxed text-muted">
        Limits use this month’s income, not every bank balance. The savings % stays out of
        spending so your Savings account stays protected.
      </p>

      <div className="rounded-sm border border-edge bg-surface-2/50 px-3 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="m-0 text-xs text-muted">Income · {monthLabel}</p>
          <p className="m-0 text-sm font-semibold text-[#f0f4f2]">
            {plan.income > 0 ? formatINR(plan.income) : 'None yet'}
          </p>
        </div>

        <label className="mt-3 block">
          <span className="label">Save toward Savings</span>
          <div className="flex items-center gap-2">
            <input
              className="input max-w-[6.5rem]"
              type="number"
              min="0"
              max="80"
              step="1"
              value={savingsPercent}
              onChange={(e) => {
                setSavingsPercent(e.target.value);
                setMessage('');
              }}
              aria-label="Savings percent"
            />
            <span className="text-sm text-muted">%</span>
            <span className="ml-auto text-xs text-muted">
              {formatINR(livePool.savingsTarget)}
            </span>
          </div>
        </label>

        <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-edge/60 pt-3">
          <p className="m-0 text-xs text-muted">Left to budget</p>
          <p className="m-0 text-base font-semibold text-primary">
            {formatINR(livePool.spendable)}
          </p>
        </div>
      </div>

      {plan.income <= 0 && (
        <p className="m-0 rounded-sm border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-yellow-100">
          Add salary/income on the Money tab first. Then set category limits here.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-outline btn-sm"
          onClick={handleSuggest}
          disabled={livePool.spendable <= 0}
        >
          Suggest from salary
        </button>
        <button type="button" className="btn-outline btn-sm" onClick={handleClear}>
          Clear limits
        </button>
      </div>

      <ul className="m-0 list-none space-y-2 p-0">
        {plan.categoryNames.map((name) => (
          <li key={name} className="flex items-center gap-2">
            <label className="min-w-0 flex-1 text-sm text-[#f0f4f2]" htmlFor={`budget-${name}`}>
              {name}
            </label>
            <input
              id={`budget-${name}`}
              className="input max-w-[8rem] text-right"
              type="number"
              min="0"
              step="1"
              placeholder="No limit"
              value={draftBudgets[name] ?? ''}
              onChange={(e) => setBudgetValue(name, e.target.value)}
              aria-label={`${name} limit`}
            />
          </li>
        ))}
      </ul>

      <div
        className={`rounded-sm border px-3 py-2 text-xs ${
          allocation.overAllocated
            ? 'border-danger/40 bg-danger/10 text-red-200'
            : 'border-edge bg-surface-2 text-muted'
        }`}
      >
        {allocation.hasSpendable ? (
          <>
            Limits total {formatINR(allocation.allocated)} of {formatINR(allocation.spendable)}{' '}
            spendable
            {allocation.overAllocated
              ? ` · ${formatINR(Math.abs(allocation.remaining))} over`
              : allocation.remaining > 0
                ? ` · ${formatINR(allocation.remaining)} unassigned`
                : ' · fully assigned'}
          </>
        ) : (
          'No spendable amount yet — add income to plan limits.'
        )}
      </div>

      <button type="submit" className="btn-primary btn-full" disabled={saving}>
        {saving ? 'Saving…' : 'Save budgets'}
      </button>

      {message && <p className="m-0 text-center text-xs text-muted">{message}</p>}
    </form>
  );

  if (embedded) return body;

  return (
    <section className="card">
      <h2 className="card-title">Category budgets</h2>
      {body}
    </section>
  );
}
