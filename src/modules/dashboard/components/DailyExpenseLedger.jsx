import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import { formatDayLabel } from '../../../core/utils/date';
import {
  removeExpense,
  setDayFilter,
  selectDayExpenses,
  selectDayTotal,
  selectFilteredDayLabel,
  selectExpensesGroupedByDay,
  selectIsTodaySelected,
  selectFilterDate,
} from '../store/dashboardSlice';

function ExpenseRow({ expense, categoryColors, onDelete, disabled }) {
  return (
    <li className="expense-list__item">
      <span
        className="expense-list__dot"
        style={{ background: categoryColors[expense.category] }}
      />
      <div className="expense-list__info">
        <strong>{expense.title}</strong>
        <span>
          {expense.category} · {expense.paymentMode}
        </span>
      </div>
      <span className="expense-list__amount">-{formatINR(expense.amount)}</span>
      <button
        type="button"
        className="expense-list__delete"
        disabled={disabled}
        onClick={onDelete}
        aria-label={`Delete ${expense.title}`}
      >
        ×
      </button>
    </li>
  );
}

export default function DailyExpenseLedger() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const categoryColors = useSelector((state) => state.dashboard.categoryColors);
  const saving = useSelector((state) => state.dashboard.saving);
  const filterDate = useSelector(selectFilterDate);
  const dayExpenses = useSelector(selectDayExpenses);
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const isToday = useSelector(selectIsTodaySelected);
  const groupedDays = useSelector(selectExpensesGroupedByDay);

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
    <div className="daily-ledger">
      <section className="card daily-ledger__selected">
        <div className="daily-ledger__selected-header">
          <div>
            <h3>{isToday ? "Today's expenses" : dayLabel}</h3>
            <p className="card__desc">
              {dayExpenses.length} entry{dayExpenses.length !== 1 ? 'ies' : ''} · track every spend
            </p>
          </div>
          <strong className="daily-ledger__day-total">{formatINR(dayTotal)}</strong>
        </div>

        {dayExpenses.length === 0 ? (
          <p className="empty-state">
            No expenses logged for this day. Add one above to build your daily record.
          </p>
        ) : (
          <ul className="expense-list">
            {dayExpenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                categoryColors={categoryColors}
                disabled={saving}
                onDelete={() => handleDelete(expense)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>Month at a glance (day by day)</h3>
        <p className="card__desc">Tap a day to view and edit its expenses</p>
        {groupedDays.length === 0 ? (
          <p className="empty-state">No daily records this month yet</p>
        ) : (
          <div className="daily-ledger__groups">
            {groupedDays.map((group) => (
              <button
                key={group.date}
                type="button"
                className={`daily-ledger__group-header ${group.date === filterDate ? 'daily-ledger__group-header--active' : ''}`}
                onClick={() => dispatch(setDayFilter({ date: group.date }))}
              >
                <span>
                  {formatDayLabel(group.date)}
                  <em>{group.expenses.length} items</em>
                </span>
                <strong>{formatINR(group.total)}</strong>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
