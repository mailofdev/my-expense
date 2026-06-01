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
    <section className="card card--flat day-expenses">
      <header className="day-expenses__header">
        <h3 className="card__title">{isToday ? "Today's list" : dayLabel}</h3>
        <span className="day-expenses__total">{formatINR(dayTotal)}</span>
      </header>

      {dayExpenses.length === 0 ? (
        <p className="empty-state empty-state--sm">
          No expenses yet. Use quick add above.
        </p>
      ) : (
        <ul className="expense-list expense-list--clean">
          {dayExpenses.map((expense) => (
            <li key={expense.id} className="expense-list__item">
              <span
                className="expense-list__dot"
                style={{ background: categoryColors[expense.category] }}
              />
              <div className="expense-list__info">
                <strong>{expense.title}</strong>
                <span>{expense.category} · {expense.paymentMode}</span>
              </div>
              <span className="expense-list__amount">-{formatINR(expense.amount)}</span>
              <button
                type="button"
                className="expense-list__delete"
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
