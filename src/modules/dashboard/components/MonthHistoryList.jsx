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
        <h2 className="card-title">By day</h2>
        <p className="empty-state-sm">No expenses this month</p>
      </section>
    );
  }

  return (
    <section className="card card-subtle">
      <h2 className="card-title">By day</h2>
      <ul className="m-0 list-none p-0">
        {groupedDays.map((group) => (
          <li key={group.date} className="border-t border-edge/60 first:border-0">
            <button
              type="button"
              className={`flex w-full items-center justify-between gap-3 border-0 bg-transparent py-3.5 text-left text-sm transition-colors ${
                group.date === filterDate ? 'text-primary' : 'text-[#f0f4f2] hover:text-primary'
              }`}
              onClick={() => dispatch(setDayFilter({ date: group.date }))}
            >
              <span>{formatDayLabel(group.date)}</span>
              <strong>{formatINR(group.total)}</strong>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
