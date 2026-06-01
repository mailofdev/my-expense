import { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { setDayFilter, selectMonthDayCalendar } from '../store/dashboardSlice';
import { getTodayString } from '../../../core/utils/date';
import { formatINRCompact } from '../../../core/utils/currency';

export default function DayPickerStrip() {
  const dispatch = useDispatch();
  const days = useSelector(selectMonthDayCalendar);
  const selectedRef = useRef(null);
  const selectedDate = days.find((d) => d.isSelected)?.date;

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedDate]);

  const goToDay = (date) => {
    if (dayjs(date).isAfter(dayjs(), 'day')) return;
    dispatch(setDayFilter({ date }));
  };

  return (
    <section className="day-picker card">
      <div className="day-picker__header">
        <h3>Daily tracker</h3>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={() => dispatch(setDayFilter({ date: getTodayString() }))}
        >
          Jump to today
        </button>
      </div>
      <div className="day-picker__strip" role="tablist" aria-label="Select day">
        {days.map((day) => (
          <button
            key={day.date}
            ref={day.isSelected ? selectedRef : null}
            type="button"
            role="tab"
            aria-selected={day.isSelected}
            disabled={day.isFuture}
            className={`day-picker__day ${day.isSelected ? 'day-picker__day--active' : ''} ${day.isToday ? 'day-picker__day--today' : ''} ${day.total > 0 ? 'day-picker__day--has-spend' : ''}`}
            onClick={() => goToDay(day.date)}
          >
            <span className="day-picker__weekday">{dayjs(day.date).format('dd')[0]}</span>
            <span className="day-picker__num">{day.dayNum}</span>
            {day.total > 0 && (
              <span className="day-picker__amount">{formatINRCompact(day.total)}</span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
