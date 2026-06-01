import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import { selectTotalSpent, selectBudgetRemaining } from '../store/dashboardSlice';

export default function BudgetOverview() {
  const { monthlyBudget } = useSelector((state) => state.dashboard);
  const totalSpent = useSelector(selectTotalSpent);
  const remaining = useSelector(selectBudgetRemaining);
  const percent = Math.min(100, Math.round((totalSpent / monthlyBudget) * 100));
  const isOverBudget = remaining < 0;

  const habits = [
    { icon: '💳', tip: 'Track UPI spends daily — small amounts add up fast' },
    { icon: '🎯', tip: 'Keep food budget under 30% of monthly income' },
    { icon: '📊', tip: 'Review expenses every Sunday — build the habit' },
  ];

  return (
    <section className="budget-overview card">
      <h3>Monthly Budget</h3>
      <div className="budget-bar">
        <div
          className={`budget-bar__fill ${isOverBudget ? 'budget-bar__fill--over' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="budget-bar__labels">
        <span>Spent: {formatINR(totalSpent)}</span>
        <span className={isOverBudget ? 'text-danger' : ''}>
          {isOverBudget ? 'Over by' : 'Left'}: {formatINR(Math.abs(remaining))}
        </span>
      </div>

      <div className="habit-tips">
        <h4>Smart Money Habits</h4>
        <ul>
          {habits.map((habit) => (
            <li key={habit.tip}>
              <span>{habit.icon}</span>
              <p>{habit.tip}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
