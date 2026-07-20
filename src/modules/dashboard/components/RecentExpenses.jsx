import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { getCategoryColor } from '../../../core/constants/finance';
import { formatINR } from '../../../core/utils/currency';
import { removeExpense, selectMonthExpenses, selectFilteredMonthLabel } from '../store/dashboardSlice';

export default function RecentExpenses({ limit }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const monthExpenses = useSelector(selectMonthExpenses);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const saving = useSelector((state) => state.dashboard.saving);
  const categoryColors = useSelector((state) => state.dashboard.categoryColors);

  const list = limit ? monthExpenses.slice(0, limit) : monthExpenses;

  return (
    <section className="recent-expenses card">
      <h3>Expenses — {monthLabel}</h3>
      {list.length === 0 ? (
        <p className="empty-state">No expenses for this month. Add one or change the filter.</p>
      ) : (
        <ul className="expense-list">
          {list.map((expense) => (
            <li key={expense.id} className="expense-list__item">
              <span
                className="expense-list__dot"
                style={{ background: getCategoryColor(expense.category, categoryColors) }}
              />
              <div className="expense-list__info">
                <strong>{expense.title}</strong>
                <span>
                  {expense.category} · {expense.paymentMode} ·{' '}
                  {dayjs(expense.date).format('D MMM')}
                </span>
              </div>
              <span className="expense-list__amount">-{formatINR(expense.amount)}</span>
              <button
                type="button"
                className="expense-list__delete"
                disabled={saving}
                onClick={() =>
                  dispatch(
                    removeExpense({
                      uid: user.uid,
                      expenseId: expense.id,
                      amount: expense.amount,
                    })
                  )
                }
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
