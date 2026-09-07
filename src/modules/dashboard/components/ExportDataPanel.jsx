import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { getNowMonthYear, getTodayString } from '../../../core/utils/date';
import { formatINR } from '../../../core/utils/currency';
import { searchExpenses } from '../utils/searchExpenses';
import { normalizeTags, resolveMainCategoryName } from '../utils/categories';
import {
  buildLedgerRows,
  downloadLedgerCsv,
  downloadSearchResultsCsv,
  summarizeLedgerRows,
} from '../utils/exportExpenses';
import {
  selectAccounts,
  selectMainCategories,
} from '../store/dashboardSlice';

const TAG_EXPORT_LIMIT = 500;

function getDefaultRange() {
  const { month, year } = getNowMonthYear();
  const today = getTodayString();
  const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
  const monthEnd = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
  const endDate = dayjs(monthEnd).isAfter(dayjs(today), 'day') ? today : monthEnd;
  return { startDate, endDate };
}

export default function ExportDataPanel() {
  const expenses = useSelector((state) => state.dashboard.expenses);
  const walletTransactions = useSelector((state) => state.dashboard.walletTransactions);
  const accounts = useSelector(selectAccounts);
  const mainCategories = useSelector(selectMainCategories);
  const today = getTodayString();

  const defaults = getDefaultRange();
  const [mode, setMode] = useState('all'); // 'all' | 'tag'
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [tagQuery, setTagQuery] = useState('');
  const [message, setMessage] = useState('');

  const rangeValid = startDate && endDate && !dayjs(startDate).isAfter(dayjs(endDate), 'day');

  const allRows = useMemo(() => {
    if (!rangeValid) return [];
    return buildLedgerRows({
      expenses,
      walletTransactions,
      accounts,
      mainCategories,
      startDate,
      endDate,
    });
  }, [
    rangeValid,
    expenses,
    walletTransactions,
    accounts,
    mainCategories,
    startDate,
    endDate,
  ]);

  const allSummary = useMemo(() => summarizeLedgerRows(allRows), [allRows]);

  const tagResults = useMemo(
    () => searchExpenses(expenses, tagQuery, { limit: TAG_EXPORT_LIMIT }),
    [expenses, tagQuery]
  );

  const tagTotal = useMemo(
    () => tagResults.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    [tagResults]
  );

  const trimmedTag = tagQuery.trim();

  const handleExportAll = () => {
    setMessage('');
    if (!rangeValid) {
      setMessage('End date must be on or after start date.');
      return;
    }
    if (allRows.length === 0) {
      setMessage('No income, expenses, or transfers in this date range.');
      return;
    }
    downloadLedgerCsv(allRows, startDate, endDate);
  };

  const handleExportByTag = () => {
    setMessage('');
    if (!trimmedTag) {
      setMessage('Enter a tag or search term first.');
      return;
    }
    if (tagResults.length === 0) {
      setMessage(`No expenses match “${trimmedTag}”.`);
      return;
    }
    downloadSearchResultsCsv({
      expenses: tagResults,
      accounts,
      mainCategories,
      query: trimmedTag,
    });
  };

  return (
    <section className="card">
      <h2 className="card-title mb-1">Export data</h2>
      <p className="card-desc mb-3">
        Export everything in a date range, or search a tag like #trip and export only those expenses.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`rounded-sm border px-3 py-2 text-sm font-semibold transition-colors ${
            mode === 'all'
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-edge/70 bg-surface text-muted'
          }`}
          onClick={() => {
            setMode('all');
            setMessage('');
          }}
        >
          Export all
        </button>
        <button
          type="button"
          className={`rounded-sm border px-3 py-2 text-sm font-semibold transition-colors ${
            mode === 'tag'
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-edge/70 bg-surface text-muted'
          }`}
          onClick={() => {
            setMode('tag');
            setMessage('');
          }}
        >
          By tag
        </button>
      </div>

      {mode === 'all' ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="label m-0">
              Start date
              <input
                type="date"
                className="input mt-1"
                value={startDate}
                max={endDate || today}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setMessage('');
                }}
              />
            </label>
            <label className="label m-0">
              End date
              <input
                type="date"
                className="input mt-1"
                value={endDate}
                min={startDate || undefined}
                max={today}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setMessage('');
                }}
              />
            </label>
          </div>

          {rangeValid && (
            <p className="mt-3 mb-0 text-sm text-muted">
              {allSummary.total} item{allSummary.total === 1 ? '' : 's'}
              {allSummary.income > 0 ? ` · ${allSummary.income} income` : ''}
              {allSummary.expenses > 0 ? ` · ${allSummary.expenses} expenses` : ''}
              {allSummary.transfers > 0 ? ` · ${allSummary.transfers} transfers` : ''}
              {allSummary.incomeTotal > 0 ? ` · In ${formatINR(allSummary.incomeTotal)}` : ''}
              {allSummary.expenseTotal > 0 ? ` · Out ${formatINR(allSummary.expenseTotal)}` : ''}
            </p>
          )}

          {message && <p className="mt-2 mb-0 text-sm text-danger">{message}</p>}

          <button
            type="button"
            className="btn-primary btn-full mt-4"
            onClick={handleExportAll}
            disabled={!rangeValid}
          >
            Export CSV
          </button>
        </>
      ) : (
        <>
          <input
            className="input"
            type="search"
            value={tagQuery}
            onChange={(e) => {
              setTagQuery(e.target.value);
              setMessage('');
            }}
            placeholder="Search tag · #trip"
            aria-label="Search by tag"
            autoComplete="off"
          />

          {!trimmedTag ? (
            <p className="mb-0 mt-3 text-xs text-muted">
              Type a tag to find matching expenses, then export them.
            </p>
          ) : tagResults.length === 0 ? (
            <p className="empty-state-sm mt-3 mb-0">No matches for “{trimmedTag}”.</p>
          ) : (
            <>
              <p className="mb-2 mt-3 text-xs text-muted">
                {tagResults.length} expense{tagResults.length === 1 ? '' : 's'} ·{' '}
                {formatINR(tagTotal)}
              </p>
              <ul className="m-0 max-h-[min(40vh,16rem)] list-none overflow-y-auto overscroll-contain p-0">
                {tagResults.slice(0, 40).map((expense) => {
                  const dateLabel = dayjs(expense.date).isValid()
                    ? dayjs(expense.date).format('D MMM YYYY')
                    : 'Unknown date';
                  const category = resolveMainCategoryName(expense.category, mainCategories);
                  const tags = normalizeTags(expense.tags);
                  return (
                    <li
                      key={expense.id}
                      className="flex items-center justify-between gap-3 border-t border-edge/50 py-2.5 first:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-medium">
                          {expense.title || 'Untitled'}
                        </p>
                        <p className="m-0 truncate text-xs text-muted">
                          {category}
                          {tags.length ? ` · ${tags.map((tag) => `#${tag}`).join(' ')}` : ''}
                          {' · '}
                          {dateLabel}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatINR(expense.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {tagResults.length > 40 && (
                <p className="mb-0 mt-2 text-xs text-muted">
                  Showing first 40 · export includes all {tagResults.length}
                </p>
              )}
            </>
          )}

          {message && <p className="mt-2 mb-0 text-sm text-danger">{message}</p>}

          <button
            type="button"
            className="btn-primary btn-full mt-4"
            onClick={handleExportByTag}
            disabled={!trimmedTag || tagResults.length === 0}
          >
            Export matches
          </button>
        </>
      )}
    </section>
  );
}
