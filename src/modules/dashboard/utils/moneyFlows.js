import dayjs from 'dayjs';
import { getMonthKey, getTodayString } from '../../../core/utils/date';

/**
 * Resolve income for a month key without leaking legacy totals into empty months.
 */
export function resolveMonthIncome({
  monthKey,
  monthlyIncomes = {},
  walletTransactions = [],
  legacyMonthlyIncome = 0,
}) {
  if (Object.prototype.hasOwnProperty.call(monthlyIncomes || {}, monthKey)) {
    return Number(monthlyIncomes[monthKey]) || 0;
  }

  const fromTx = (walletTransactions || [])
    .filter(
      (tx) =>
        tx.type === 'credit' &&
        tx.source === 'income' &&
        tx.monthKey === monthKey
    )
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  if (fromTx > 0) return fromTx;

  if (Object.keys(monthlyIncomes || {}).length === 0) {
    return Number(legacyMonthlyIncome) || 0;
  }

  return 0;
}

/**
 * Advance a recurring nextDate until it is strictly after `today`.
 */
export function advanceRecurringNextDate(fromDate, cadence, today) {
  const addOnce = (d) => {
    if (cadence === 'weekly') return d.add(1, 'week');
    if (cadence === 'yearly') return d.add(1, 'year');
    return d.add(1, 'month');
  };

  let next = addOnce(fromDate);
  let guard = 0;
  while (!next.isAfter(today, 'day') && guard < 120) {
    next = addOnce(next);
    guard += 1;
  }
  return next;
}

/** Normalize Firestore / ISO / seconds timestamps to epoch ms. */
export function toMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (typeof value.toDate === 'function') {
      const d = value.toDate();
      return d instanceof Date ? d.getTime() : 0;
    }
  }
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** Calendar day YYYY-MM-DD for a wallet tx or expense (date first, then createdAt). */
export function resolveLedgerDayKey(item, fallback = '') {
  const rawDate = item?.date;
  if (rawDate && /^\d{4}-\d{2}-\d{2}/.test(String(rawDate))) {
    return String(rawDate).slice(0, 10);
  }
  const ms = toMillis(item?.createdAt);
  if (ms) return dayjs(ms).format('YYYY-MM-DD');
  return fallback;
}

/** Normalize user-entered date; clamp to today max. */
export function normalizeLedgerDate(dateStr, { allowFuture = false } = {}) {
  const d = dayjs(dateStr);
  if (!d.isValid()) return getTodayString();
  if (!allowFuture && d.isAfter(dayjs(), 'day')) return getTodayString();
  return d.format('YYYY-MM-DD');
}

export function monthKeyFromDate(dateStr) {
  const d = dayjs(dateStr);
  if (!d.isValid()) {
    const today = dayjs();
    return getMonthKey(today.month() + 1, today.year());
  }
  return getMonthKey(d.month() + 1, d.year());
}
