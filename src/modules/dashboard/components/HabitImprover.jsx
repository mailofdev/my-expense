import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectHabitInsights,
  updateFinanceSettings,
  markWeeklyReview,
} from '../store/dashboardSlice';

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
        <h3>Financial Habit Improver</h3>
        <p className="card__desc">
          Smart tips based on your real spending — built for Indian money habits (UPI, budgets, savings).
        </p>

        <div className="settings-form settings-form--inline">
          <label>
            Savings goal (% of income)
            <input
              type="number"
              min="5"
              max="80"
              value={savingsGoal}
              onChange={(e) => setSavingsGoal(e.target.value)}
            />
          </label>
          <button type="button" className="btn btn--primary" onClick={handleSaveGoal} disabled={saving}>
            Save goal
          </button>
        </div>

        {lastReview && (
          <p className="habit-meta">Last weekly review: {lastReview}</p>
        )}
        <button
          type="button"
          className="btn btn--outline btn--full"
          onClick={handleWeeklyReview}
          disabled={saving}
        >
          ✓ Mark weekly review done
        </button>
      </section>

      <section className="card">
        <h3>Your Insights</h3>
        {insights.length === 0 ? (
          <p className="empty-state">Insights will appear as you track expenses</p>
        ) : (
          <ul className="insights-list">
            {insights.map((insight, i) => (
              <li key={i} className={`insights-list__item insights-list__item--${insight.type}`}>
                <span>{insight.icon}</span>
                <p>{insight.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card habit-challenges">
        <h3>Weekly Challenges</h3>
        <ul>
          <li>🚫 No impulse Swiggy/Zomato for 3 days</li>
          <li>📱 Check UPI spends every Sunday evening</li>
          <li>💰 Move 10% salary to savings on payday</li>
          <li>🧾 Log every expense within 24 hours</li>
        </ul>
      </section>
    </div>
  );
}
