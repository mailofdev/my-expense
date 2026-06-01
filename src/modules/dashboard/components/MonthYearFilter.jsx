import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  setMonthFilter,
  setDayFilter,
  selectFilteredMonthLabel,
  selectIsFilterCurrentMonth,
  selectMonthExpenses,
  selectDayTotal,
  selectFilteredDayLabel,
} from '../store/dashboardSlice';
import { MONTH_OPTIONS, getYearOptions, getTodayString } from '../../../core/utils/date';
import { formatINR } from '../../../core/utils/currency';

export default function MonthYearFilter() {
  const dispatch = useDispatch();
  const { filterMonth, filterYear } = useSelector((state) => state.dashboard);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);
  const monthExpenses = useSelector(selectMonthExpenses);
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);

  const years = getYearOptions(8);

  const goToMonth = (month, year) => {
    dispatch(setMonthFilter({ month, year }));
  };

  const shiftMonth = (delta) => {
    const d = dayjs(`${filterYear}-${filterMonth}-01`).add(delta, 'month');
    goToMonth(d.month() + 1, d.year());
  };

  const goToToday = () => {
    dispatch(setDayFilter({ date: getTodayString() }));
  };

  return (
    <section className="month-filter card">
      <div className="month-filter__row">
        <div className="month-filter__nav">
          <button
            type="button"
            className="month-filter__arrow"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>
          <div className="month-filter__current">
            <strong>{monthLabel}</strong>
            {isCurrentMonth && <span className="month-filter__badge">Current</span>}
          </div>
          <button
            type="button"
            className="month-filter__arrow"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="month-filter__selects">
          <select
            value={filterMonth}
            onChange={(e) => goToMonth(Number(e.target.value), filterYear)}
            aria-label="Select month"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => goToMonth(filterMonth, Number(e.target.value))}
            aria-label="Select year"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--outline btn--sm" onClick={goToToday}>
            Today
          </button>
        </div>
      </div>

      <p className="month-filter__summary">
        <span>
          <strong>{dayLabel}:</strong> {formatINR(dayTotal)}
        </span>
        <span>·</span>
        <span>
          Month: {new Set(monthExpenses.map((e) => e.date)).size} active day
          {new Set(monthExpenses.map((e) => e.date)).size !== 1 ? 's' : ''} ·{' '}
          <strong>{formatINR(monthTotal)}</strong>
        </span>
      </p>
    </section>
  );
}
