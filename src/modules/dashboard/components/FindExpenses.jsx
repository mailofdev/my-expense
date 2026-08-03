import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import { getCategoryColor } from '../../../core/constants/finance';
import { searchExpenses } from '../utils/searchExpenses';

const RESULT_LIMIT = 40;

export default function FindExpenses({ onOpenDay }) {
  const expenses = useSelector((state) => state.dashboard.expenses);
  const { categoryColors, categories } = useSelector((state) => state.dashboard);
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => searchExpenses(expenses, query, { limit: RESULT_LIMIT }),
    [expenses, query]
  );

  const trimmed = query.trim();
  const hitLimit = trimmed && results.length >= RESULT_LIMIT;

  return (
    <section className="card">
      <h2 className="card-title mb-1">Find expenses</h2>
      <p className="card-desc mb-3">Search by name, category, or amount.</p>

      <input
        className="input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. Uber, Food, 350"
        aria-label="Search expenses"
        autoComplete="off"
      />

      {!trimmed ? (
        <p className="mb-0 mt-3 text-xs text-muted">
          Tip: try a merchant name or category.
        </p>
      ) : results.length === 0 ? (
        <p className="empty-state-sm mt-3 mb-0">No matches for “{trimmed}”.</p>
      ) : (
        <>
          <p className="mb-2 mt-3 text-xs text-muted">
            {hitLimit
              ? `Showing first ${RESULT_LIMIT} results`
              : `${results.length} result${results.length === 1 ? '' : 's'}`}
          </p>
          <ul className="m-0 max-h-[min(50vh,22rem)] list-none overflow-y-auto overscroll-contain p-0">
            {results.map((expense) => {
              const dateLabel = dayjs(expense.date).isValid()
                ? dayjs(expense.date).format('D MMM YYYY')
                : 'Unknown date';
              return (
                <li key={expense.id} className="border-t border-edge/50 first:border-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-0 bg-transparent py-3 text-left"
                    onClick={() => {
                      if (!expense.date || !dayjs(expense.date).isValid()) return;
                      onOpenDay?.(expense.date);
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{
                        background: getCategoryColor(
                          expense.category,
                          categoryColors,
                          categories
                        ),
                      }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-medium text-[#f0f4f2]">
                        {expense.title || 'Untitled'}
                      </p>
                      <p className="m-0 truncate text-xs text-muted">
                        {expense.category || 'Other'} · {dateLabel}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatINR(expense.amount)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {onOpenDay && (
            <p className="mb-0 mt-2 text-xs text-muted">Tap a result to open that day on Home.</p>
          )}
        </>
      )}
    </section>
  );
}
