import dayjs from 'dayjs';

/**
 * Filter expenses by a free-text query (title, category, amount, readable date).
 */
export function searchExpenses(expenses = [], query = '', { limit = 40 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  const amountQuery = q.replace(/[₹,\s]/g, '');
  const wantsAmount =
    amountQuery !== '' &&
    amountQuery.length >= 2 &&
    !Number.isNaN(Number(amountQuery));

  return [...(expenses || [])]
    .filter((expense) => {
      const title = String(expense.title || '').toLowerCase();
      const category = String(expense.category || '').toLowerCase();
      const paymentMode = String(expense.paymentMode || '').toLowerCase();
      const amountStr = String(expense.amount ?? '');
      const dateRaw = String(expense.date || '');
      const dateLabel = dayjs(dateRaw).isValid()
        ? dayjs(dateRaw).format('D MMM YYYY').toLowerCase()
        : '';

      if (title.includes(q) || category.includes(q) || paymentMode.includes(q)) return true;
      // Readable dates: require 3+ chars so "2" / "1" don't match every day number.
      if (q.length >= 3 && dateLabel.includes(q)) return true;
      // ISO date strings: only longer or dashed queries (avoid "2" hitting every YYYY-MM-DD).
      if ((q.includes('-') || q.length >= 4) && dateRaw.includes(q)) return true;
      if (wantsAmount && amountStr.includes(amountQuery)) return true;
      return false;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)))
    .slice(0, limit);
}
