import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CATEGORY_LIMIT_THRESHOLDS, normalizeHabits } from '../../../core/constants/finance';
import { formatINR } from '../../../core/utils/currency';
import {
  SALARY_GROUPS,
  buildCalculatorDraft,
  categoryBudgetsFromAmounts,
  categoryNameForLine,
  groupAmount,
  normalizeSalaryAmounts,
  salaryAmountsTotal,
  salaryPlanFromAmounts,
  suggestSalarySplit,
} from '../utils/salarySplit';
import { normalizeAllocation } from '../utils/planning';
import {
  selectFilterMonthKey,
  selectMonthAllocation,
  selectMonthWalletFunded,
  updateFinanceSettings,
} from '../store/dashboardSlice';

export default function MoneyCalculator({ startOpen = false }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving, salaryPlan, categoryBudgets, habits, monthlyAllocations, mainCategories } =
    useSelector((state) => state.dashboard);
  const monthKey = useSelector(selectFilterMonthKey);
  const monthIncome = useSelector(selectMonthWalletFunded);
  const allocation = useSelector(selectMonthAllocation);
  const normalizedHabits = normalizeHabits(habits);
  const [open, setOpen] = useState(startOpen);
  const [salary, setSalary] = useState('');
  const [amounts, setAmounts] = useState(() => normalizeSalaryAmounts(null));
  const [fromIncome, setFromIncome] = useState(false);
  const [thresholds, setThresholds] = useState(normalizedHabits.limitThresholds);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const draft = buildCalculatorDraft({
      salaryPlan,
      categoryBudgets,
      mainCategories,
      monthIncome,
      allocation,
    });
    setSalary(draft.salary ? String(draft.salary) : '');
    setAmounts(draft.amounts);
    setFromIncome(draft.fromIncome);
  }, [salaryPlan, categoryBudgets, mainCategories, monthIncome, allocation]);

  const salaryNumber = Math.max(0, Math.round(Number(salary) || 0));
  const assigned = salaryAmountsTotal(amounts);
  const remaining = salaryNumber - assigned;

  const applySuggestion = () => {
    if (salaryNumber <= 0) {
      setMessage('Enter a monthly salary first.');
      return;
    }
    setAmounts(suggestSalarySplit(salaryNumber));
    setFromIncome(false);
    setMessage('Suggested split is ready. Save it to use these amounts.');
  };

  const handleSave = () => {
    const standing = salaryPlanFromAmounts(salaryNumber, amounts);
    const monthPlan = normalizeAllocation(monthlyAllocations?.[monthKey]);
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          salaryPlan: standing,
          categoryBudgets: categoryBudgetsFromAmounts(amounts, mainCategories),
          habits: { ...normalizedHabits, limitThresholds: thresholds },
          monthlyAllocations: {
            ...(monthlyAllocations || {}),
            [monthKey]: {
              ...monthPlan,
              savings: standing.emergency,
              investment: standing.investment,
            },
          },
        },
      })
    ).then((result) => {
      if (!result.error) setMessage('Split saved.');
      else setMessage(typeof result.payload === 'string' ? result.payload : 'Could not save the split.');
    });
  };

  const toggleThreshold = (level) => {
    setThresholds((current) => {
      const has = current.includes(level);
      return has ? current.filter((item) => item !== level) : [...current, level].sort((a, b) => a - b);
    });
    setMessage('');
  };

  useEffect(() => {
    if (!startOpen) return undefined;
    setOpen(true);
    document.getElementById('money-calculator')?.scrollIntoView({ block: 'start' });
    return undefined;
  }, [startOpen]);

  return (
    <section className="card" id="money-calculator">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between border-0 bg-transparent p-0 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="card-title mb-0">Money calculator</h2>
          <p className="card-desc mb-0 mt-1">
            {salaryNumber > 0
              ? `${formatINR(salaryNumber)} salary · ${formatINR(assigned)} assigned`
              : 'Split monthly salary into limits.'}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <p className="m-0 text-sm text-muted">
            25% investment, 10% emergency fund, 15% bike/car, 15% personal, and 35% home. Edit any line.
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Monthly salary</span>
            <input
              className="input"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="0"
              value={salary}
              onChange={(event) => {
                setSalary(event.target.value);
                setFromIncome(false);
                setMessage('');
              }}
            />
          </label>
          {fromIncome && (
            <p className="m-0 text-xs text-muted">
              Filled from this month’s income. Change it if that is not your salary.
            </p>
          )}
          <button type="button" className="btn-outline btn-full" onClick={applySuggestion}>
            Suggest from salary
          </button>

          {SALARY_GROUPS.map((group) => {
            const single = group.lines.length === 1;
            return (
              <fieldset key={group.id} className="m-0 space-y-2 border-0 p-0">
                <legend className="mb-1 flex w-full items-baseline justify-between gap-3 text-sm font-semibold text-ink">
                  <span>
                    {group.label} · {group.percent}%
                  </span>
                  {!single && (
                    <span className="text-xs font-medium tabular-nums text-muted">
                      {formatINR(groupAmount(amounts, group.id))}
                    </span>
                  )}
                </legend>
                {group.lines.map((line) => {
                  const label = single ? group.label : categoryNameForLine(line, mainCategories);
                  return (
                    <label key={line.id} className="block">
                      {!single && (
                        <span className="mb-1 block text-xs font-medium text-muted">
                          {label} · {line.percent}%
                        </span>
                      )}
                      <input
                        className="input"
                        type="number"
                        min="0"
                        inputMode="numeric"
                        aria-label={single ? group.label : label}
                        value={amounts[line.id] ? String(amounts[line.id]) : ''}
                        placeholder="0"
                        onChange={(event) => {
                          const next = event.target.value === '' ? 0 : Number(event.target.value);
                          setAmounts((current) => ({ ...current, [line.id]: next }));
                          setMessage('');
                        }}
                      />
                    </label>
                  );
                })}
              </fieldset>
            );
          })}

          <p className={`m-0 text-sm ${remaining < 0 ? 'text-danger' : 'text-muted'}`}>
            {salaryNumber <= 0
              ? 'Enter a salary to compare the split.'
              : remaining < 0
                ? `${formatINR(Math.abs(remaining))} over this salary`
                : `${formatINR(remaining)} still unassigned`}
          </p>
          <p className="m-0 text-xs text-muted">
            Investment and the emergency fund are set aside each month. The other lines are spending limits.
          </p>

          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Warn at
            </legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_LIMIT_THRESHOLDS.map((level) => {
                const on = thresholds.includes(level);
                return (
                  <button
                    key={level}
                    type="button"
                    className={`btn-outline btn-sm ${on ? 'border-primary/50 text-primary' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleThreshold(level)}
                  >
                    {level}%
                  </button>
                );
              })}
            </div>
          </fieldset>

          <button type="button" className="btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save split'}
          </button>
          {message && <p className="m-0 text-sm text-muted">{message}</p>}
        </div>
      )}
    </section>
  );
}
