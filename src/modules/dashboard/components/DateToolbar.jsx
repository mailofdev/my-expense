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
    <div className="rounded border border-edge bg-surface px-3 py-3 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-edge bg-surface-2 text-lg leading-none text-[#f0f4f2] hover:border-primary hover:text-primary"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="min-w-0 flex-1 text-center text-sm font-semibold sm:text-base">{monthLabel}</span>
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-edge bg-surface-2 text-lg leading-none hover:border-primary hover:text-primary"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          ›
        </button>
        <button
          type="button"
          className="hidden rounded-sm border border-edge px-2.5 py-1 text-xs font-semibold text-primary hover:border-primary sm:inline"
          onClick={() => dispatch(setDayFilter({ date: getTodayString() }))}
        >
          Today
        </button>
        <span className="ml-auto text-sm font-bold text-primary">{formatINRCompact(dayTotal)}</span>
      </div>

      <div
        className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
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
            className={`relative flex w-[42px] shrink-0 flex-col items-center gap-0.5 rounded-sm border py-1.5 text-[0.65rem] transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
              day.isSelected
                ? 'border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(232,197,71,0.22)]'
                : day.isToday
                  ? 'border-accent bg-surface-2 text-muted'
                  : 'border-transparent bg-surface-2 text-muted'
            }`}
            onClick={() => goToDay(day.date)}
          >
            <span className="uppercase">{dayjs(day.date).format('dd')[0]}</span>
            <strong className={`text-sm ${day.isSelected ? 'text-primary' : 'text-[#f0f4f2]'}`}>
              {day.dayNum}
            </strong>
            {day.total > 0 && (
              <i className="absolute right-1 top-1 h-1 w-1 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
