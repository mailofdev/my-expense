import { useState } from 'react';
import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  selectTotalSpent,
  selectMonthExpenses,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';
import { shortCategoryLabel } from '../utils/categories';
import CategoryChart from './CategoryChart';
import MonthHistoryList from './MonthHistoryList';
import MonthlyReview from './MonthlyReview';
import CategoryLimitStatus from './CategoryLimitStatus';
import ExpenseSearch from './ExpenseSearch';

export default function ExpenseAnalyzer({ onOpenDay, onAddExpense, onEditLimits }) {
  const totalSpent = useSelector(selectTotalSpent);
  const monthExpenses = useSelector(selectMonthExpenses);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const [showChart, setShowChart] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  const largest = [...monthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 3);

  return (
    <div className="feature-panel">
      <p className="m-0 px-0.5 text-sm text-muted">Where the money went.</p>
      <section className="relative overflow-hidden rounded-lg border border-edge bg-surface px-5 py-5">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{monthLabel}</p>
        <p className="hero-amount m-0 mt-1 text-left">{formatINR(totalSpent)}</p>
        <p className="m-0 text-sm text-muted">spent</p>
      </section>

      <MonthlyReview />

      {largest.length > 0 && (
        <section className="card">
          <h2 className="card-title mb-1">Largest expenses</h2>
          <ul className="m-0 list-none space-y-0 p-0">
            {largest.map((expense) => (
              <li key={expense.id} className="border-t border-edge/50 first:border-0">
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between gap-3 border-0 bg-transparent py-2.5 text-left"
                  onClick={() => onOpenDay?.(expense.date)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{expense.title}</span>
                    <span className="block text-xs text-muted">{shortCategoryLabel(expense.category)} · open on Today</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{formatINR(expense.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ExpenseSearch onOpenDay={onOpenDay} />

      <section className="card p-0">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between px-5 py-4 text-left"
          onClick={() => setShowChart((open) => !open)}
          aria-expanded={showChart}
        >
          <span className="text-sm font-semibold">Category chart</span>
          <span className="text-xs font-semibold text-primary">{showChart ? 'Hide' : 'Show'}</span>
        </button>
        {showChart && (
          <div className="border-t border-edge/50 px-5 pb-5 pt-4">
            <CategoryChart />
          </div>
        )}
      </section>

      <section className="card p-0">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between px-5 py-4 text-left"
          onClick={() => setShowLimits((open) => !open)}
          aria-expanded={showLimits}
        >
          <span>
            <span className="block text-sm font-semibold">Category limits</span>
            <span className="block text-xs text-muted">Optional caps</span>
          </span>
          <span className="text-xs font-semibold text-primary">{showLimits ? 'Hide' : 'Show'}</span>
        </button>
        {showLimits && (
          <div className="border-t border-edge/50 px-5 pb-5 pt-4">
            <CategoryLimitStatus onEdit={onEditLimits} />
          </div>
        )}
      </section>

      {monthExpenses.length > 0 ? (
        <MonthHistoryList onOpenDay={onOpenDay} />
      ) : (
        <section className="card">
          <p className="m-0 text-sm font-medium text-ink">No expenses in {monthLabel}.</p>
          <p className="mb-0 mt-1 text-sm text-muted">A spend on Today is what fills this report.</p>
          {onAddExpense && (
            <button type="button" className="btn-primary btn-full mt-4 min-h-11" onClick={onAddExpense}>
              Add expense
            </button>
          )}
        </section>
      )}
    </div>
  );
}
