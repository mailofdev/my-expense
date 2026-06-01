import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import { formatDayLabel } from '../../../core/utils/date';
import { setDayFilter, selectExpensesGroupedByDay, selectFilterDate } from '../store/dashboardSlice';

export default function MonthHistoryList() {
  const dispatch = useDispatch();
  const filterDate = useSelector(selectFilterDate);
  const groupedDays = useSelector(selectExpensesGroupedByDay);

  if (groupedDays.length === 0) {
    return (
      <section className="card card--subtle">
        <h3 className="card__title">Daily history</h3>
        <p className="empty-state empty-state--sm">No expenses this month</p>
      </section>
    );
  }

  return (
    <section className="card card--subtle">
      <h3 className="card__title">Daily history</h3>
      <ul className="month-history">
        {groupedDays.map((group) => (
          <li key={group.date}>
            <button
              type="button"
              className={`month-history__row ${group.date === filterDate ? 'month-history__row--active' : ''}`}
              onClick={() => dispatch(setDayFilter({ date: group.date }))}
            >
              <span>{formatDayLabel(group.date)}</span>
              <span className="month-history__meta">{group.expenses.length} items</span>
              <strong>{formatINR(group.total)}</strong>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
