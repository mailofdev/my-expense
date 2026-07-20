import dayjs from 'dayjs';

export const getTodayString = () => dayjs().format('YYYY-MM-DD');

export const getNowMonthYear = () => ({
  month: dayjs().month() + 1,
  year: dayjs().year(),
});

export const isInMonthYear = (dateStr, month, year) => {
  const d = dayjs(dateStr);
  return d.month() + 1 === month && d.year() === year;
};

export const isInDateRange = (dateStr, startDate, endDate) => {
  if (!dateStr || !startDate || !endDate) return false;
  const d = dayjs(dateStr);
  return !d.isBefore(dayjs(startDate), 'day') && !d.isAfter(dayjs(endDate), 'day');
};

export const isToday = (dateStr) => dayjs(dateStr).isSame(dayjs(), 'day');

export const isCurrentMonth = (dateStr) => {
  const { month, year } = getNowMonthYear();
  return isInMonthYear(dateStr, month, year);
};

export const getMonthKey = (month, year) =>
  `${year}-${String(month).padStart(2, '0')}`;

export const formatMonthYearLabel = (month, year) =>
  dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('MMMM YYYY');

export const formatDayLabel = (dateStr) => {
  const d = dayjs(dateStr);
  const today = dayjs();
  if (d.isSame(today, 'day')) return 'Today';
  if (d.isSame(today.subtract(1, 'day'), 'day')) return 'Yesterday';
  return d.format('ddd, D MMM YYYY');
};

export const formatDayShort = (dateStr) => {
  const d = dayjs(dateStr);
  if (d.isSame(dayjs(), 'day')) return 'Today';
  return d.format('D MMM');
};

export const resolveFilterDateForMonth = (month, year, currentDate) => {
  const now = dayjs();
  const selectedMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);

  if (currentDate && isInMonthYear(currentDate, month, year)) {
    return currentDate;
  }

  if (now.month() + 1 === month && now.year() === year) {
    return now.format('YYYY-MM-DD');
  }

  if (selectedMonth.isAfter(now, 'month')) {
    return selectedMonth.format('YYYY-MM-DD');
  }

  return selectedMonth.endOf('month').format('YYYY-MM-DD');
};

export const getDefaultExpenseDate = (filterDate) => filterDate || getTodayString();

export const getYearOptions = (count = 6) => {
  const current = dayjs().year();
  return Array.from({ length: count }, (_, i) => current - i);
};

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];
