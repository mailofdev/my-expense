import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import { searchExpenses } from '../utils/searchExpenses';
import { shortCategoryLabel } from '../utils/categories';

/** Visible search for merchant, tag, category, or date. Opens that day on Today. */
export default function ExpenseSearch({ onOpenDay }) {
  const expenses = useSelector((state) => state.dashboard.expenses);
  const [query, setQuery] = useState('');
  const results = useMemo(
    () => searchExpenses(expenses, query, { limit: 8 }),
    [expenses, query]
  );

  return (
    <section className="card">
      <label className="label m-0" htmlFor="expense-search">
        Search
        <input
          id="expense-search"
          className="input mt-1 min-h-11"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Merchant, tag, category, or date"
          enterKeyHint="search"
        />
      </label>
      {query.trim() && results.length === 0 && (
        <p className="mb-0 mt-3 text-sm text-muted">
          Nothing matches. Try a shop name, a tag, or a date like 12 Sep.
        </p>
      )}
      {results.length > 0 && (
        <ul className="m-0 mt-3 list-none space-y-0 p-0">
          {results.map((expense) => (
            <li key={expense.id} className="border-t border-edge/50 first:border-0">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 border-0 bg-transparent py-2.5 text-left"
                onClick={() => onOpenDay?.(expense.date)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{expense.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {shortCategoryLabel(expense.category)}
                    {expense.date ? ` · ${dayjs(expense.date).format('D MMM')}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatINR(expense.amount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
