import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  setDayFilter,
  selectFilteredDayLabel,
  selectFilteredMonthLabel,
  selectIsTodaySelected,
  selectIsFilterCurrentMonth,
} from '../store/dashboardSlice';
import { getTodayString, resolveFilterDateForMonth } from '../../../core/utils/date';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function CalendarIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
      <path d="M8 14h2M12 14h2M16 14h2M8 18h2M12 18h2" strokeLinecap="round" />
    </svg>
  );
}

export default function DateToolbar({ variant = 'day' }) {
  const dispatch = useDispatch();
  const { filterMonth, filterYear, filterDate, expenses } = useSelector((state) => state.dashboard);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const isToday = useSelector(selectIsTodaySelected);
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);
  const fullDateLabel = dayjs(filterDate).format('ddd, D MMM');
  const popoverRef = useRef(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(filterMonth);
  const [viewYear, setViewYear] = useState(filterYear);
  const today = getTodayString();
  const isMonth = variant === 'month';
  const canGoNextDay = dayjs(filterDate || today).isBefore(dayjs(), 'day');
  const canGoNextMonth = dayjs(`${filterYear}-${String(filterMonth).padStart(2, '0')}-01`).isBefore(
    dayjs(),
    'month'
  );

  useEffect(() => {
    if (calendarOpen) {
      setViewMonth(filterMonth);
      setViewYear(filterYear);
    }
  }, [calendarOpen, filterMonth, filterYear]);

  useEffect(() => {
    if (!calendarOpen) return undefined;

    const onPointerDown = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setCalendarOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setCalendarOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [calendarOpen]);

  const shiftDay = (delta) => {
    const next = dayjs(filterDate || today).add(delta, 'day');
    if (next.isAfter(dayjs(), 'day')) return;
    dispatch(setDayFilter({ date: next.format('YYYY-MM-DD') }));
  };

  const shiftMonth = (delta) => {
    const next = dayjs(`${filterYear}-${String(filterMonth).padStart(2, '0')}-01`).add(delta, 'month');
    if (next.isAfter(dayjs(), 'month')) return;
    dispatch(
      setDayFilter({
        date: resolveFilterDateForMonth(next.month() + 1, next.year(), filterDate),
      })
    );
  };

  const shiftViewMonth = (delta) => {
    const d = dayjs(`${viewYear}-${String(viewMonth).padStart(2, '0')}-01`).add(delta, 'month');
    setViewMonth(d.month() + 1);
    setViewYear(d.year());
  };

  const goToDay = (date) => {
    if (dayjs(date).isAfter(dayjs(), 'day')) return;
    dispatch(setDayFilter({ date }));
    setCalendarOpen(false);
  };

  const spendDates = new Set(
    expenses
      .filter((e) => dayjs(e.date).month() + 1 === viewMonth && dayjs(e.date).year() === viewYear)
      .map((e) => e.date)
  );

  const viewStart = dayjs(`${viewYear}-${String(viewMonth).padStart(2, '0')}-01`);
  const daysInMonth = viewStart.daysInMonth();
  const startWeekday = viewStart.day();
  const viewLabel = viewStart.format('MMMM YYYY');
  const calendarCells = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const date = viewStart.date(i + 1).format('YYYY-MM-DD');
      return {
        date,
        dayNum: i + 1,
        hasSpend: spendDates.has(date),
        isToday: date === today,
        isSelected: date === filterDate,
        isFuture: dayjs(date).isAfter(dayjs(), 'day'),
      };
    }),
  ];

  const title = isMonth
    ? monthLabel
    : isToday || dayLabel === 'Yesterday'
      ? dayLabel
      : fullDateLabel;
  const subtitle = !isMonth && (isToday || dayLabel === 'Yesterday') ? fullDateLabel : null;
  const canGoNext = isMonth ? canGoNextMonth : canGoNextDay;
  const showJumpBack = isMonth ? !isCurrentMonth : !isToday;

  return (
    <div className="relative" ref={popoverRef}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-[#f0f4f2] hover:bg-surface-2 hover:text-primary"
          onClick={() => (isMonth ? shiftMonth(-1) : shiftDay(-1))}
          aria-label={isMonth ? 'Previous month' : 'Previous day'}
        >
          ‹
        </button>

        <button
          type="button"
          className="min-w-0 flex-1 rounded-md px-1 py-1 text-center hover:bg-surface-2/70"
          onClick={() => setCalendarOpen((open) => !open)}
          aria-label="Open calendar"
          aria-expanded={calendarOpen}
        >
          <p className="m-0 truncate text-sm font-semibold text-[#f0f4f2]">{title}</p>
          {subtitle && <p className="m-0 truncate text-[11px] text-muted">{subtitle}</p>}
        </button>

        {showJumpBack && (
          <button
            type="button"
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
            onClick={() => goToDay(today)}
          >
            Today
          </button>
        )}

        <button
          type="button"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            calendarOpen
              ? 'bg-primary text-bg'
              : 'text-[#f0f4f2] hover:bg-surface-2 hover:text-primary'
          }`}
          onClick={() => setCalendarOpen((open) => !open)}
          aria-label="Open calendar"
          aria-expanded={calendarOpen}
        >
          <CalendarIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-[#f0f4f2] hover:bg-surface-2 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
          onClick={() => (isMonth ? shiftMonth(1) : shiftDay(1))}
          aria-label={isMonth ? 'Next month' : 'Next day'}
          disabled={!canGoNext}
        >
          ›
        </button>
      </div>

      {calendarOpen && (
        <div className="mt-2 rounded-lg border border-edge/70 bg-surface p-3 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-muted hover:bg-surface-2 hover:text-primary"
              onClick={() => shiftViewMonth(-1)}
              aria-label="Previous month in calendar"
            >
              ‹
            </button>
            <span className="flex-1 text-center text-sm font-semibold">{viewLabel}</span>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-muted hover:bg-surface-2 hover:text-primary"
              onClick={() => shiftViewMonth(1)}
              aria-label="Next month in calendar"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted">
            {WEEKDAYS.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, index) => {
              if (!day) {
                return <span key={`empty-${index}`} className="h-9" />;
              }

              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={day.isFuture}
                  onClick={() => goToDay(day.date)}
                  aria-label={`${dayjs(day.date).format('D MMM')}${day.hasSpend ? ', has expenses' : ''}${day.isToday ? ', today' : ''}`}
                  className={`relative flex h-9 items-center justify-center rounded-md text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
                    day.isSelected
                      ? 'bg-primary font-semibold text-bg'
                      : day.isToday
                        ? 'bg-surface-2 text-primary ring-1 ring-primary/50'
                        : day.hasSpend
                          ? 'bg-primary/15 text-primary'
                          : 'text-[#f0f4f2] hover:bg-surface-2'
                  }`}
                >
                  {day.dayNum}
                  {day.hasSpend && (
                    <span
                      className={`absolute bottom-1 h-1 w-1 rounded-full ${day.isSelected ? 'bg-bg/80' : 'bg-primary'}`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
