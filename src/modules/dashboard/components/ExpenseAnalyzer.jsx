import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  selectTotalSpent,
  selectMonthExpenses,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';
import CategoryChart from './CategoryChart';
import MonthHistoryList from './MonthHistoryList';
import FindExpenses from './FindExpenses';

export default function ExpenseAnalyzer({ onOpenDay }) {
  const expenses = useSelector((state) => state.dashboard.expenses);
  const totalSpent = useSelector(selectTotalSpent);
  const monthExpenses = useSelector(selectMonthExpenses);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  return (
    <div className="feature-panel">
      <section className="card text-center">
        <p className="section-label m-0">{monthLabel}</p>
        <p className="text-glow m-0 mt-1 text-[clamp(1.75rem,8vw,2.5rem)] font-bold text-primary">
          {formatINR(totalSpent)}
        </p>
        <p className="m-0 mt-1 text-sm text-muted">spent this month</p>
      </section>

      <CategoryChart />

      {monthExpenses.length > 0 && <MonthHistoryList onOpenDay={onOpenDay} />}

      <FindExpenses onOpenDay={onOpenDay} />

      {monthExpenses.length === 0 && (
        <p className="empty-state">
          {expenses.length === 0
            ? 'Add expenses on Home to see your spending breakdown.'
            : `No expenses in ${monthLabel}.`}
        </p>
      )}
    </div>
  );
}
