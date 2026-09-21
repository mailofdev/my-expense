import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  selectTotalSpent,
  selectMonthExpenses,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';
import CategoryChart from './CategoryChart';
import MonthHistoryList from './MonthHistoryList';

export default function ExpenseAnalyzer({ onOpenDay, onAddExpense }) {
  const totalSpent = useSelector(selectTotalSpent);
  const monthExpenses = useSelector(selectMonthExpenses);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  return (
    <div className="feature-panel">
      <p className="m-0 px-0.5 text-sm text-muted">See where it went.</p>
      <section className="relative overflow-hidden rounded-lg border border-edge bg-surface px-5 py-6 text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-40 w-56 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />
        <p className="hero-amount relative">{formatINR(totalSpent)}</p>
        <p className="relative m-0 mt-2 text-sm text-muted">spent in {monthLabel}</p>
      </section>

      <CategoryChart />

      {monthExpenses.length > 0 ? (
        <MonthHistoryList onOpenDay={onOpenDay} />
      ) : (
        <section className="card text-center">
          <p className="m-0 text-sm text-ink">No expenses in {monthLabel}.</p>
          <p className="mb-0 mt-1 text-sm text-muted">Log a spend on Today to see a breakdown.</p>
          {onAddExpense && (
            <button type="button" className="btn-primary btn-full mt-4" onClick={onAddExpense}>
              Add expense
            </button>
          )}
        </section>
      )}
    </div>
  );
}
