import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  selectTotalSpent,
  selectMonthExpenses,
} from '../store/dashboardSlice';
import CategoryChart from './CategoryChart';
import MonthHistoryList from './MonthHistoryList';

export default function ExpenseAnalyzer({ onOpenDay }) {
  const expenses = useSelector((state) => state.dashboard.expenses);
  const totalSpent = useSelector(selectTotalSpent);
  const monthExpenses = useSelector(selectMonthExpenses);

  return (
    <div className="feature-panel">
      <section className="card text-center">
        <p className="text-glow m-0 text-[clamp(1.75rem,8vw,2.5rem)] font-bold text-primary">
          {formatINR(totalSpent)}
        </p>
        <p className="m-0 mt-1 text-sm text-muted">spent this month</p>
      </section>

      <CategoryChart />

      {monthExpenses.length > 0 && <MonthHistoryList onOpenDay={onOpenDay} />}

      {expenses.length === 0 && (
        <p className="empty-state">Add expenses on Home to see a breakdown.</p>
      )}
    </div>
  );
}
