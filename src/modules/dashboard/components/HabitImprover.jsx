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

  const lastReview = habits?.lastWeeklyReview;

  return (
    <div className="feature-panel">
      <section className="card">
        <h3 className="card-title">Financial Habit Improver</h3>
        <p className="card-desc">
          Smart tips based on your real spending — built for Indian money habits.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="label min-w-[140px] flex-1">
            Savings goal (% of income)
            <input
              className="input mt-1"
              type="number"
              min="5"
              max="80"
              value={savingsGoal}
              onChange={(e) => setSavingsGoal(e.target.value)}
            />
          </label>
          <button type="button" className="btn-primary sm:mb-0" onClick={handleSaveGoal} disabled={saving}>
            Save goal
          </button>
        </div>

        {lastReview && (
          <p className="mt-3 text-xs text-muted">Last weekly review: {lastReview}</p>
        )}
        <button
          type="button"
          className="btn-outline btn-full mt-3"
          onClick={handleWeeklyReview}
          disabled={saving}
        >
          ✓ Mark weekly review done
        </button>
      </section>

      <section className="card">
        <h3 className="card-title">Your Insights</h3>
        {insights.length === 0 ? (
          <p className="empty-state">Insights will appear as you track expenses</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {insights.map((insight, i) => (
              <li
                key={i}
                className={`flex gap-3 rounded-sm border-l-[3px] bg-surface-2 p-3 ${
                  insightBorder[insight.type] || 'border-l-primary'
                }`}
              >
                <span className="text-lg">{insight.icon}</span>
                <p className="m-0 text-sm">{insight.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="card-title">Weekly Challenges</h3>
        <ul className="m-0 list-none space-y-0 p-0 text-sm text-muted">
          {[
            '🚫 No impulse Swiggy/Zomato for 3 days',
            '📱 Check UPI spends every Sunday evening',
            '💰 Move 10% salary to savings on payday',
            '🧾 Log every expense within 24 hours',
          ].map((text) => (
            <li key={text} className="border-t border-edge py-2.5 first:border-0">
              {text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
