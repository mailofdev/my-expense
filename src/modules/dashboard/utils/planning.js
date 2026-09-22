import dayjs from 'dayjs';
import { isInMonthYear } from '../../../core/utils/date';

/** Planning buckets. Flexible is day-to-day spending; the others are set aside on purpose. */
export const ALLOCATION_BUCKETS = [
  { id: 'essentials', label: 'Essentials' },
  { id: 'bills', label: 'Bills / EMIs' },
  { id: 'savings', label: 'Savings' },
  { id: 'goals', label: 'Goals' },
  { id: 'investment', label: 'Investment' },
  { id: 'flexible', label: 'Flexible spending' },
];

const HOLD_BUCKETS = ['savings', 'goals', 'investment'];

/** Main categories that count as essential living costs for the emergency fund. */
export const ESSENTIAL_CATEGORY_IDS = [
  'food_groceries',
  'household_living',
  'transport_fuel',
  'bills_emis',
];

export function emptyAllocation() {
  return {
    essentials: 0,
    bills: 0,
    savings: 0,
    goals: 0,
    investment: 0,
    flexible: 0,
  };
}

export function normalizeAllocation(raw) {
  const base = emptyAllocation();
  if (!raw || typeof raw !== 'object') return base;
  Object.keys(base).forEach((key) => {
    base[key] = Math.max(0, Math.round(Number(raw[key]) || 0));
  });
  return base;
}

export function allocationTotal(allocation) {
  const plan = normalizeAllocation(allocation);
  return Object.values(plan).reduce((sum, amount) => sum + amount, 0);
}

/** Savings, goals, and investment are held back from safe-to-spend. */
export function heldFromAllocation(allocation) {
  const plan = normalizeAllocation(allocation);
  return HOLD_BUCKETS.reduce((sum, key) => sum + plan[key], 0);
}

export function unallocatedAmount(income, allocation) {
  return (Number(income) || 0) - allocationTotal(allocation);
}

export function isTemplateActive(item, today) {
  if (!item || item.enabled === false) return false;
  if (!item.nextDate) return false;
  const todayD = dayjs(today);
  if (item.endDate && dayjs(item.endDate).isValid() && dayjs(item.endDate).isBefore(todayD, 'day')) {
    return false;
  }
  if (item.maxOccurrences && (item.runCount || 0) >= Number(item.maxOccurrences)) return false;
  return true;
}

/**
 * Bills that should reduce safe-to-spend.
 * Current month includes this month's due dates and anything still overdue.
 * Other months include only dates that fall inside that month.
 */
export function commitmentsForSafeSpend(items, { month, year, today, isCurrentMonth }) {
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('day');
  const end = start.endOf('month');
  return (items || []).filter((item) => {
    if (!isTemplateActive(item, today)) return false;
    const next = dayjs(item.nextDate);
    if (!next.isValid()) return false;
    const inMonth = !next.isBefore(start, 'day') && !next.isAfter(end, 'day');
    if (inMonth) return true;
    return Boolean(isCurrentMonth) && next.isBefore(start, 'day');
  });
}

export function sumAmounts(items) {
  return (items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

/**
 * Upcoming list: overdue items and anything due within the horizon.
 * Does not create transactions.
 */
export function listUpcoming(items, { today, horizonDays = 35 } = {}) {
  const now = dayjs(today);
  const horizon = now.add(horizonDays, 'day');
  return (items || [])
    .filter((item) => isTemplateActive(item, today))
    .filter((item) => {
      const next = dayjs(item.nextDate);
      return next.isValid() && !next.isAfter(horizon, 'day');
    })
    .slice()
    .sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)));
}

/**
 * Date to post when the user records a due template.
 * Future dates are not recorded. Dates in the viewed current month keep their day.
 * Older overdue items are recorded today so a past month is left unchanged.
 */
export function recordDateForTemplate(nextDate, today) {
  const next = dayjs(nextDate);
  const now = dayjs(today);
  if (!next.isValid() || !now.isValid()) return null;
  if (next.isAfter(now, 'day')) return null;
  if (next.isSame(now, 'month')) return next.format('YYYY-MM-DD');
  return now.format('YYYY-MM-DD');
}

/**
 * Safe to spend sits on top of money left.
 * When nothing is planned and no bills are due, it matches money left.
 */
export function computeSafeToSpend({ funded, spent, held, upcomingTotal }) {
  const income = Number(funded) || 0;
  const spentN = Number(spent) || 0;
  const heldN = Number(held) || 0;
  const upcomingN = Number(upcomingTotal) || 0;
  const left = income > 0 ? income - spentN : 0;
  const safe = income > 0 ? left - heldN - upcomingN : 0;
  return {
    hasIncome: income > 0,
    income,
    spent: spentN,
    left,
    held: heldN,
    upcomingTotal: upcomingN,
    safe,
  };
}

export function daysRemainingInMonth(today) {
  const date = dayjs(today);
  if (!date.isValid()) return 1;
  return date.endOf('month').startOf('day').diff(date.startOf('day'), 'day') + 1;
}

export function dailySafeAmount(safe, daysLeft) {
  const days = Math.max(1, Number(daysLeft) || 1);
  return Math.round((Number(safe) || 0) / days);
}

export function previousMonthParts(month, year) {
  if (month <= 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

export function essentialCategoryNames(mainCategories) {
  return ESSENTIAL_CATEGORY_IDS.map(
    (id) => (mainCategories || []).find((item) => item.id === id)?.name
  ).filter(Boolean);
}

export function essentialSpendForMonth(expenses, month, year, essentialNames) {
  const names = new Set(essentialNames || []);
  return (expenses || [])
    .filter((expense) => names.has(expense.category) && isInMonthYear(expense.date, month, year))
    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
}

/** About three months of essential costs. Planned essentials win over past spending. */
export function suggestEmergencyTarget({ allocation, recentEssentialTotals = [] }) {
  const plan = normalizeAllocation(allocation);
  const planned = plan.essentials + plan.bills;
  const recent = (recentEssentialTotals || []).map((value) => Number(value) || 0).filter((value) => value > 0);
  const monthly = planned > 0
    ? planned
    : recent.length
      ? Math.round(recent.reduce((sum, value) => sum + value, 0) / recent.length)
      : 0;
  return monthly * 3;
}

export function goalProgress(goal) {
  const target = Math.max(0, Number(goal?.target) || 0);
  const saved = Math.max(0, Number(goal?.saved) || 0);
  const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  return {
    target,
    saved,
    percent,
    remaining: Math.max(0, target - saved),
  };
}

export function topCategories(spentByCategory, limit = 3) {
  return Object.entries(spentByCategory || {})
    .map(([name, amount]) => ({ name, amount: Number(amount) || 0 }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function compareMonths(current, previous) {
  const prev = previous || { income: 0, spent: 0, left: 0 };
  const curr = current || { income: 0, spent: 0, left: 0 };
  return {
    hasPrevious: (Number(prev.income) || 0) > 0 || (Number(prev.spent) || 0) > 0,
    incomeDelta: (Number(curr.income) || 0) - (Number(prev.income) || 0),
    spentDelta: (Number(curr.spent) || 0) - (Number(prev.spent) || 0),
    leftDelta: (Number(curr.left) || 0) - (Number(prev.left) || 0),
  };
}

export function reviewOutlook(comparison) {
  if (!comparison?.hasPrevious) return '';
  const { spentDelta, leftDelta } = comparison;
  if (spentDelta < 0 && leftDelta > 0) {
    return 'Spending is down and more money is left than last month.';
  }
  if (spentDelta > 0 && leftDelta < 0) {
    return 'Spending is up and less money is left than last month.';
  }
  if (spentDelta < 0) return 'Spending is down from last month.';
  if (spentDelta > 0) return 'Spending is up from last month.';
  if (leftDelta > 0) return 'More money is left than last month.';
  if (leftDelta < 0) return 'Less money is left than last month.';
  return 'Spending matches last month.';
}
