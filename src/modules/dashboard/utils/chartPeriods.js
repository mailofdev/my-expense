import dayjs from 'dayjs';

export const CHART_PERIODS = [
  { id: '1d', label: '1D', title: '1 day' },
  { id: '1w', label: '1W', title: '1 week' },
  { id: '1m', label: '1M', title: '1 month' },
  { id: '3m', label: '3M', title: '3 months' },
  { id: '6m', label: '6M', title: '6 months' },
  { id: '1y', label: '1Y', title: '1 year' },
];

export const DEFAULT_CHART_PERIOD = '1m';

export function getPeriodMeta(periodId) {
  return CHART_PERIODS.find((period) => period.id === periodId) || CHART_PERIODS[2];
}

/** Inclusive start/end for a rolling period ending today (or endDate). */
export function getPeriodRange(periodId, endDate = dayjs()) {
  const end = dayjs(endDate).startOf('day');

  switch (periodId) {
    case '1d':
      return { start: end, end };
    case '1w':
      return { start: end.subtract(6, 'day'), end };
    case '1m':
      return { start: end.subtract(1, 'month').add(1, 'day'), end };
    case '3m':
      return { start: end.subtract(3, 'month').add(1, 'day'), end };
    case '6m':
      return { start: end.subtract(6, 'month').add(1, 'day'), end };
    case '1y':
      return { start: end.subtract(1, 'year').add(1, 'day'), end };
    default:
      return { start: end.subtract(1, 'month').add(1, 'day'), end };
  }
}

export function filterExpensesByPeriod(expenses, periodId, endDate = dayjs()) {
  const { start, end } = getPeriodRange(periodId, endDate);
  return (expenses || []).filter((expense) => {
    const date = dayjs(expense.date);
    return !date.isBefore(start, 'day') && !date.isAfter(end, 'day');
  });
}

export function groupExpensesByCategory(expenses) {
  const grouped = {};
  (expenses || []).forEach((expense) => {
    grouped[expense.category] = (grouped[expense.category] || 0) + expense.amount;
  });
  return grouped;
}

/**
 * Build chart buckets for the spending trend chart.
 * 1d/1w/1m → daily, 3m → weekly, 6m/1y → monthly.
 */
export function buildSpendDistribution(expenses, periodId, endDate = dayjs()) {
  const { start, end } = getPeriodRange(periodId, endDate);
  const filtered = filterExpensesByPeriod(expenses, periodId, endDate);

  if (periodId === '3m') {
    const buckets = [];
    let cursor = start.startOf('week');
    const last = end.endOf('week');
    while (!cursor.isAfter(last, 'day')) {
      const weekStart = cursor;
      const weekEnd = cursor.endOf('week');
      const rangeStart = weekStart.isBefore(start, 'day') ? start : weekStart;
      const rangeEnd = weekEnd.isAfter(end, 'day') ? end : weekEnd;
      const amount = filtered
        .filter((expense) => {
          const date = dayjs(expense.date);
          return !date.isBefore(rangeStart, 'day') && !date.isAfter(rangeEnd, 'day');
        })
        .reduce((sum, expense) => sum + expense.amount, 0);

      buckets.push({
        key: weekStart.format('YYYY-MM-DD'),
        label: weekStart.format('D MMM'),
        amount,
        startDate: rangeStart.format('YYYY-MM-DD'),
        endDate: rangeEnd.format('YYYY-MM-DD'),
        type: 'week',
      });
      cursor = cursor.add(1, 'week');
    }
    return buckets;
  }

  if (periodId === '6m' || periodId === '1y') {
    const buckets = [];
    let cursor = start.startOf('month');
    const last = end.startOf('month');
    while (!cursor.isAfter(last, 'month')) {
      const key = cursor.format('YYYY-MM');
      const amount = filtered
        .filter((expense) => dayjs(expense.date).format('YYYY-MM') === key)
        .reduce((sum, expense) => sum + expense.amount, 0);

      buckets.push({
        key,
        label: cursor.format('MMM YY'),
        amount,
        month: cursor.month() + 1,
        year: cursor.year(),
        startDate: cursor.startOf('month').format('YYYY-MM-DD'),
        endDate: cursor.endOf('month').format('YYYY-MM-DD'),
        type: 'month',
      });
      cursor = cursor.add(1, 'month');
    }
    return buckets;
  }

  // Daily buckets for 1d / 1w / 1m
  const buckets = [];
  let cursor = start;
  while (!cursor.isAfter(end, 'day')) {
    const key = cursor.format('YYYY-MM-DD');
    const amount = filtered
      .filter((expense) => expense.date === key)
      .reduce((sum, expense) => sum + expense.amount, 0);

    buckets.push({
      key,
      label: periodId === '1d' ? cursor.format('ddd D MMM') : cursor.format('D MMM'),
      amount,
      date: key,
      startDate: key,
      endDate: key,
      type: 'day',
    });
    cursor = cursor.add(1, 'day');
  }
  return buckets;
}
