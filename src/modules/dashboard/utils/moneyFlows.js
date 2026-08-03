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
