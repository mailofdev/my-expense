import { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  setMonthFilter,
  setDayFilter,
  selectFilteredMonthLabel,
  selectMonthDayCalendar,
} from '../store/dashboardSlice';
import { getTodayString } from '../../../core/utils/date';

export default function DateToolbar({ compact = false }) {
  const dispatch = useDispatch();
  const { filterMonth, filterYear } = useSelector((state) => state.dashboard);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const days = useSelector(selectMonthDayCalendar);
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
    <div className={compact ? 'px-1' : 'card card-flat px-4 py-4 sm:px-5'}>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg text-muted hover:text-primary"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="min-w-0 flex-1 text-center text-sm font-medium sm:text-base">{monthLabel}</span>
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg text-muted hover:text-primary"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          ›
        </button>
        <button
          type="button"
          className="shrink-0 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25"
          onClick={() => dispatch(setDayFilter({ date: getTodayString() }))}
        >
          Today
        </button>
      </div>

      <div
        className="scrollbar-hide flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Select day"
      >
        {days.map((day) => (
          <button
            key={day.date}
            ref={day.isSelected ? selectedRef : null}
            type="button"
            role="tab"
            aria-selected={day.isSelected}
            disabled={day.isFuture}
            className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full text-sm transition-all disabled:cursor-not-allowed disabled:opacity-25 ${
              day.isSelected
                ? 'bg-primary font-semibold text-bg'
                : day.isToday
                  ? 'bg-surface-2 text-primary ring-1 ring-primary/40'
                  : 'bg-surface-2/80 text-muted hover:text-[#f0f4f2]'
            }`}
            onClick={() => goToDay(day.date)}
          >
            {day.dayNum}
          </button>
        ))}
      </div>
    </div>
  );
}
