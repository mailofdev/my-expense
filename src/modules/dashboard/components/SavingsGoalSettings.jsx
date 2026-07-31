import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateFinanceSettings } from '../store/dashboardSlice';

export default function SavingsGoalSettings() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { habits, saving } = useSelector((state) => state.dashboard);
  const [goal, setGoal] = useState(habits?.savingsGoalPercent ?? 20);

  useEffect(() => {
    setGoal(habits?.savingsGoalPercent ?? 20);
  }, [habits?.savingsGoalPercent]);

  const handleSave = () => {
    const next = Math.min(80, Math.max(5, Number(goal) || 20));
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
    );
  };

  return (
    <section className="card">
      <h2 className="card-title mb-1">Savings goal</h2>
      <p className="card-desc mb-3">% of income you aim to save each month.</p>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          type="number"
          min="5"
          max="80"
          aria-label="Savings goal percent"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <span className="flex items-center text-sm text-muted">%</span>
        <button type="button" className="btn-primary shrink-0" onClick={handleSave} disabled={saving}>
          {saving ? '…' : 'Save'}
        </button>
      </div>
    </section>
  );
}
