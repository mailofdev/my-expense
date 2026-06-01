import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  removeExpense,
  selectDayExpenses,
  selectDayTotal,
  selectFilteredDayLabel,
  selectIsTodaySelected,
} from '../store/dashboardSlice';

export default function DailyExpenseLedger() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const categoryColors = useSelector((state) => state.dashboard.categoryColors);
  const saving = useSelector((state) => state.dashboard.saving);
  const dayExpenses = useSelector(selectDayExpenses);
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const isToday = useSelector(selectIsTodaySelected);

  const handleDelete = (expense) => {
    dispatch(
      removeExpense({
        uid: user.uid,
        expenseId: expense.id,
        amount: expense.amount,
      })
    );
  };

  return (
    <section className="card card-flat">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className="card-title mb-0">{isToday ? "Today's list" : dayLabel}</h3>
        <span className="shrink-0 text-lg font-bold text-primary">{formatINR(dayTotal)}</span>
      </header>

      {dayExpenses.length === 0 ? (
        <p className="empty-state-sm">No expenses yet. Use quick add above.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {dayExpenses.map((expense) => (
            <li
              key={expense.id}
              className="flex flex-wrap items-center gap-3 border-b border-edge py-3 last:border-0"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: categoryColors[expense.category] }}
              />
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{expense.title}</strong>
                <span className="text-xs text-muted">
                  {expense.category} · {expense.paymentMode}
                </span>
              </div>
              <span className="ml-auto shrink-0 font-semibold text-danger">
                -{formatINR(expense.amount)}
              </span>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center border-0 bg-transparent text-xl leading-none text-muted hover:text-danger"
                disabled={saving}
                onClick={() => handleDelete(expense)}
                aria-label={`Delete ${expense.title}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
