import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatINR, formatINRCompact } from '../../../core/utils/currency';
import {
  selectMonthSavingsSnapshot,
  updateFinanceSettings,
} from '../store/dashboardSlice';

export default function MonthSavingsSnapshot() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { habits, saving } = useSelector((state) => state.dashboard);
  const snap = useSelector(selectMonthSavingsSnapshot);

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(snap.goalPercent));

  useEffect(() => {
    setGoalInput(String(snap.goalPercent));
  }, [snap.goalPercent]);

  const handleSaveGoal = () => {
    const next = Math.min(80, Math.max(5, Number(goalInput) || 20));
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          habits: {
            ...habits,
            savingsGoalPercent: next,
          },
        },
      })
    ).then((result) => {
      if (!result.error) setEditingGoal(false);
    });
  };

  if (!snap.hasIncome) {
    return (
      <section className="card">
        <h2 className="card-title mb-1">{snap.monthLabel} savings</h2>
        <p className="card-desc mb-0">
          Add income to see how much you&apos;re saving this month.
        </p>
      </section>
    );
  }

  const barWidth = Math.min(100, Math.max(0, snap.progressTowardGoal));
  const overspent = snap.saved < 0;

  return (
    <section className="card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="card-title mb-0">{snap.monthLabel} savings</h2>
          <p className="card-desc mb-0 mt-1">
            Goal {snap.goalPercent}% of income
            {!editingGoal && (
              <>
                {' · '}
                <button
                  type="button"
                  className="border-0 bg-transparent p-0 text-xs font-semibold text-primary underline"
                  onClick={() => setEditingGoal(true)}
                >
                  Change
                </button>
              </>
            )}
          </p>
        </div>
        <p
          className={`m-0 shrink-0 text-lg font-bold tabular-nums ${
            overspent ? 'text-danger' : snap.goalMet ? 'text-success' : 'text-[#f0f4f2]'
          }`}
        >
          {overspent ? '−' : ''}
          {formatINRCompact(Math.abs(snap.saved))}
        </p>
      </div>

      {editingGoal && (
        <div className="mb-3 flex items-center gap-2">
          <input
            className="input w-20"
            type="number"
            min="5"
            max="80"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            aria-label="Savings goal percent"
          />
          <span className="text-sm text-muted">%</span>
          <button
            type="button"
            className="btn-primary shrink-0 px-3 py-1.5 text-sm"
            onClick={handleSaveGoal}
            disabled={saving}
          >
            Save
          </button>
          <button
            type="button"
            className="border-0 bg-transparent px-2 text-sm text-muted"
            onClick={() => {
              setGoalInput(String(snap.goalPercent));
              setEditingGoal(false);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <p className="m-0 text-sm text-muted">
        {overspent
          ? `Spent ${formatINR(Math.abs(snap.saved))} more than income`
          : snap.goalMet
            ? `On track — saved ${formatINR(snap.saved)} of ${formatINR(snap.goalAmount)} goal`
            : `Saved ${formatINR(snap.saved)} of ${formatINR(snap.goalAmount)} goal`}
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-all ${
            overspent ? 'bg-danger' : snap.goalMet ? 'bg-success' : 'bg-primary'
          }`}
          style={{ width: `${overspent ? 100 : barWidth}%` }}
        />
      </div>

      <div className="mt-3 flex justify-between gap-3 text-xs text-muted">
        <span>Income {formatINRCompact(snap.income)}</span>
        <span>Spent {formatINRCompact(snap.spent)}</span>
        <span className={overspent ? 'text-danger' : ''}>
          {snap.savingsRate}% of income
        </span>
      </div>
    </section>
  );
}
