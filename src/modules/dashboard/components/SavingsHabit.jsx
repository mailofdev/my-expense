import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import { normalizeHabits } from '../../../core/constants/finance';
import { selectMonthSavingsSnapshot, updateFinanceSettings } from '../store/dashboardSlice';

export default function SavingsHabit({ compact = false }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving, habits } = useSelector((state) => state.dashboard);
  const snapshot = useSelector(selectMonthSavingsSnapshot);
  const normalized = normalizeHabits(habits);
  const [percent, setPercent] = useState(String(normalized.savingsGoalPercent));
  const [message, setMessage] = useState('');
  const skipBlur = useRef(false);

  const save = (enabled, nextPercent = percent) => {
    const value = Math.round(Number(nextPercent) || 20);
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          habits: {
            savingsGoalEnabled: enabled,
            savingsGoalPercent: value,
          },
        },
      })
    ).then((result) => {
      if (!result.error) setMessage(enabled ? 'Savings target on.' : 'Savings target off.');
      else setMessage(typeof result.payload === 'string' ? result.payload : 'Could not update.');
    });
  };

  if (compact) {
    if (!snapshot.enabled || !snapshot.hasIncome) return null;
    return (
      <section className="card">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Savings target</p>
        <p className="m-0 mt-1 text-sm text-ink">
          {formatINR(Math.max(0, snapshot.saved))} of {formatINR(snapshot.goalAmount)} ({snapshot.goalPercent}%)
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-success" style={{ width: `${snapshot.progressTowardGoal}%` }} />
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="card-title mb-1">Savings target</h2>
          <p className="card-desc">Optional. Spending still works if this stays off.</p>
        </div>
        <button
          type="button"
          className={`btn-outline btn-sm shrink-0 ${snapshot.enabled ? 'border-primary/50 text-primary' : ''}`}
          aria-pressed={snapshot.enabled}
          disabled={saving}
          onMouseDown={() => {
            skipBlur.current = true;
          }}
          onClick={() => save(!snapshot.enabled)}
        >
          {snapshot.enabled ? 'On' : 'Off'}
        </button>
      </div>

      {snapshot.enabled && (
        <div className="mt-4 space-y-3">
          <label className="label m-0">
            Percent of income
            <input
              className="input mt-1"
              type="number"
              min="1"
              max="100"
              value={percent}
              onChange={(event) => setPercent(event.target.value)}
              onBlur={() => {
                if (skipBlur.current) {
                  skipBlur.current = false;
                  return;
                }
                save(true, percent);
              }}
            />
          </label>
          {snapshot.hasIncome ? (
            <>
              <p className="m-0 text-sm text-ink">
                Aim for {formatINR(snapshot.goalAmount)} this month. You have {formatINR(Math.max(0, snapshot.saved))} unspent.
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-success" style={{ width: `${snapshot.progressTowardGoal}%` }} />
              </div>
              <p className="m-0 text-xs text-muted">
                {snapshot.goalMet
                  ? 'This month is at the target.'
                  : `${snapshot.progressTowardGoal}% of the target so far.`}
              </p>
            </>
          ) : (
            <p className="m-0 text-sm text-muted">
              Add income and this will suggest {normalized.savingsGoalPercent}% of it.
            </p>
          )}
        </div>
      )}
      {message && <p className="mb-0 mt-3 text-sm text-muted">{message}</p>}
    </section>
  );
}
