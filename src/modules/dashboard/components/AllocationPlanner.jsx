import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import { ALLOCATION_BUCKETS, normalizeAllocation, unallocatedAmount } from '../utils/planning';
import {
  selectFilterMonthKey,
  selectFilteredMonthLabel,
  selectMonthAllocation,
  selectMonthWalletFunded,
  updateFinanceSettings,
} from '../store/dashboardSlice';

export default function AllocationPlanner() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving, monthlyAllocations, goals } = useSelector((state) => state.dashboard);
  const monthKey = useSelector(selectFilterMonthKey);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const stored = useSelector(selectMonthAllocation);
  const income = useSelector(selectMonthWalletFunded);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(stored);
  const [message, setMessage] = useState('');

  const goalAsk = (goals || []).reduce(
    (sum, goal) => sum + (Number(goal.monthlyContribution) || 0),
    0
  );

  useEffect(() => {
    setDraft(stored);
    setMessage('');
  }, [stored, monthKey]);

  const remaining = unallocatedAmount(income, draft);

  const handleSave = () => {
    const plan = normalizeAllocation(draft);
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          monthlyAllocations: {
            ...(monthlyAllocations || {}),
            [monthKey]: plan,
          },
        },
      })
    ).then((result) => {
      if (!result.error) setMessage('Plan saved.');
      else setMessage(typeof result.payload === 'string' ? result.payload : 'Could not save the plan.');
    });
  };

  return (
    <section className="card">
      <button
        type="button"
        className="flex w-full items-center justify-between border-0 bg-transparent p-0 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="card-title mb-0">Plan {monthLabel}</h2>
          <p className="card-desc mb-0 mt-1">Give this month’s income a job before you spend it.</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && income <= 0 && (
        <p className="mb-0 mt-4 text-sm text-muted">Add income for {monthLabel} to split it.</p>
      )}

      {open && income > 0 && (
        <div className="mt-4 space-y-3">
          <p className="m-0 text-sm text-muted">
            Income to plan: <span className="font-semibold text-ink">{formatINR(income)}</span>
          </p>
          {goalAsk > 0 && (
            <p className="m-0 text-xs text-muted">Goals ask for {formatINR(goalAsk)} this month.</p>
          )}
          {ALLOCATION_BUCKETS.map((bucket) => (
            <label key={bucket.id} className="block">
              <span className="mb-1 block text-xs font-medium text-muted">{bucket.label}</span>
              <input
                className="input"
                type="number"
                min="0"
                inputMode="numeric"
                value={draft[bucket.id] ? String(draft[bucket.id]) : ''}
                placeholder="0"
                onChange={(event) => {
                  const next = event.target.value === '' ? 0 : Number(event.target.value);
                  setDraft((current) => ({ ...current, [bucket.id]: next }));
                  setMessage('');
                }}
              />
            </label>
          ))}
          <p className={`m-0 text-sm ${remaining < 0 ? 'text-danger' : 'text-muted'}`}>
            {remaining < 0
              ? `${formatINR(Math.abs(remaining))} over this month’s income`
              : `${formatINR(remaining)} still unplanned`}
          </p>
          <button type="button" className="btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save plan'}
          </button>
          {message && <p className="m-0 text-sm text-muted">{message}</p>}
        </div>
      )}
    </section>
  );
}
