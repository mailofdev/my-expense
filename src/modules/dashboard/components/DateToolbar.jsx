import { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  setMonthFilter,
  setDayFilter,
  selectFilteredMonthLabel,
  selectMonthDayCalendar,
  selectDayTotal,
} from '../store/dashboardSlice';
import { getTodayString } from '../../../core/utils/date';
import { formatINRCompact } from '../../../core/utils/currency';

export default function DateToolbar() {
  const dispatch = useDispatch();
  const { filterMonth, filterYear } = useSelector((state) => state.dashboard);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const days = useSelector(selectMonthDayCalendar);
  const dayTotal = useSelector(selectDayTotal);
  const selectedRef = useRef(null);
  const selectedDate = days.find((d) => d.isSelected)?.date;

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedDate]);

  const shiftMonth = (delta) => {
    const d = dayjs(`${filterYear}-${filterMonth}-01`).add(delta, 'month');
    dispatch(setMonthFilter({ month: d.month() + 1, year: d.year() }));
  };

  const goToDay = (date) => {
    if (dayjs(date).isAfter(dayjs(), 'day')) return;
    dispatch(setDayFilter({ date }));
  };

  return (
    <div className="date-toolbar">
      <div className="date-toolbar__month">
        <button type="button" className="date-toolbar__arrow" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <span className="date-toolbar__month-label">{monthLabel}</span>
        <button type="button" className="date-toolbar__arrow" onClick={() => shiftMonth(1)} aria-label="Next month">
          ›
        </button>
        <button type="button" className="date-toolbar__today" onClick={() => dispatch(setDayFilter({ date: getTodayString() }))}>
          Today
        </button>
        <span className="date-toolbar__day-total">{formatINRCompact(dayTotal)}</span>
      </div>

      <div className="date-toolbar__days" role="tablist" aria-label="Select day">
        {days.map((day) => (
          <button
            key={day.date}
            ref={day.isSelected ? selectedRef : null}
            type="button"
            role="tab"
            aria-selected={day.isSelected}
            disabled={day.isFuture}
            className={`date-toolbar__day ${day.isSelected ? 'date-toolbar__day--active' : ''} ${day.isToday ? 'date-toolbar__day--today' : ''}`}
            onClick={() => goToDay(day.date)}
          >
            <span>{dayjs(day.date).format('dd')[0]}</span>
            <strong>{day.dayNum}</strong>
            {day.total > 0 && <i className="date-toolbar__dot" />}
          </button>
        ))}
      </div>
    </div>
  );
}
