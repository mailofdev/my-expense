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
      <section className="card card-subtle">
        <h3 className="card-title">Daily history</h3>
        <p className="empty-state-sm">No expenses this month</p>
      </section>
    );
  }

  return (
    <section className="card card-subtle">
      <h3 className="card-title">Daily history</h3>
      <ul className="m-0 list-none p-0">
        {groupedDays.map((group) => (
          <li key={group.date} className="border-b border-edge last:border-0">
            <button
              type="button"
              className={`grid w-full cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-2 border-0 bg-transparent py-3 text-left text-sm transition-colors hover:text-primary ${
                group.date === filterDate ? 'text-primary' : 'text-[#f0f4f2]'
              }`}
              onClick={() => dispatch(setDayFilter({ date: group.date }))}
            >
              <span>{formatDayLabel(group.date)}</span>
              <span className="text-xs text-muted">{group.expenses.length} items</span>
              <strong className="text-primary">{formatINR(group.total)}</strong>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
