import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectHabitInsights,
  updateFinanceSettings,
  markWeeklyReview,
} from '../store/dashboardSlice';

const insightBorder = {
  danger: 'border-l-danger',
  warning: 'border-l-accent',
  success: 'border-l-success',
  tip: 'border-l-primary',
  info: 'border-l-primary',
  action: 'border-l-primary',
};

export default function HabitImprover() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { habits, saving } = useSelector((state) => state.dashboard);
  const insights = useSelector(selectHabitInsights);
  const [savingsGoal, setSavingsGoal] = useState(habits?.savingsGoalPercent ?? 20);

  useEffect(() => {
    setSavingsGoal(habits?.savingsGoalPercent ?? 20);
  }, [habits?.savingsGoalPercent]);

  const handleSaveGoal = () => {
    const updatedHabits = { ...habits, savingsGoalPercent: Number(savingsGoal) || 20 };
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: { habits: updatedHabits },
      })
    );
  };

  const handleWeeklyReview = () => {
    dispatch(markWeeklyReview({ uid: user.uid, habits }));
  };

  return (
    <div className="feature-panel">
      <section className="card">
        <h2 className="card-title">Savings goal</h2>
        <p className="card-desc">How much of your income you want to save each month.</p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="number"
            min="5"
            max="80"
            aria-label="Savings goal percent"
            value={savingsGoal}
            onChange={(e) => setSavingsGoal(e.target.value)}
          />
          <span className="flex items-center text-sm text-muted">%</span>
          <button type="button" className="btn-primary shrink-0" onClick={handleSaveGoal} disabled={saving}>
            Save
          </button>
        </div>
        <button
          type="button"
          className="btn-outline btn-full mt-4"
          onClick={handleWeeklyReview}
          disabled={saving}
        >
          Mark weekly review done
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">Tips for you</h2>
        {insights.length === 0 ? (
          <p className="empty-state-sm">Tips appear as you add expenses on Home.</p>
        ) : (
          <ul className="m-0 list-none space-y-3 p-0">
            {insights.map((insight, i) => (
              <li
                key={i}
                className={`rounded-sm border-l-[3px] bg-surface-2/80 px-3 py-3 text-sm leading-relaxed ${
                  insightBorder[insight.type] || 'border-l-primary'
                }`}
              >
                {insight.text}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
