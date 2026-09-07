import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { getNowMonthYear, getTodayString } from '../../../core/utils/date';
import { formatINR } from '../../../core/utils/currency';
import { searchExpenses } from '../utils/searchExpenses';
import { normalizeTags, resolveMainCategoryName } from '../utils/categories';
import {
  buildLedgerRows,
  buildSearchExportRows,
  downloadLedgerCsv,
  downloadSearchResultsCsv,
  summarizeLedgerRows,
} from '../utils/exportExpenses';
import {
  downloadLedgerReport,
  downloadSearchReport,
  downloadShareableSplitReport,
} from '../utils/exportReport';
import { normalizeExpenseSplit } from '../utils/groups';
import {
  selectAccounts,
  selectMainCategories,
  selectPeopleGroups,
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
  const peopleGroups = useSelector(selectPeopleGroups);
  const today = getTodayString();

  const defaults = getDefaultRange();
  const [mode, setMode] = useState('all'); // 'all' | 'tag'
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [tagQuery, setTagQuery] = useState('');
  const [excludedIds, setExcludedIds] = useState(() => new Set());
  const [message, setMessage] = useState('');

  const rangeValid = startDate && endDate && !dayjs(startDate).isAfter(dayjs(endDate), 'day');

  useEffect(() => {
    setExcludedIds(new Set());
  }, [tagQuery]);

  const allRows = useMemo(() => {
    if (!rangeValid) return [];
    return buildLedgerRows({
      expenses,
      walletTransactions,
      accounts,
      mainCategories,
      peopleGroups,
      startDate,
      endDate,
    });
  }, [
    rangeValid,
    expenses,
    walletTransactions,
    accounts,
    mainCategories,
    peopleGroups,
    startDate,
    endDate,
  ]);

  const allSummary = useMemo(() => summarizeLedgerRows(allRows), [allRows]);

  const tagMatches = useMemo(
    () => searchExpenses(expenses, tagQuery, { limit: TAG_EXPORT_LIMIT }),
    [expenses, tagQuery]
  );

  const tagResults = useMemo(
    () => tagMatches.filter((expense) => !excludedIds.has(expense.id)),
    [tagMatches, excludedIds]
  );

  const tagExportRows = useMemo(
    () =>
      buildSearchExportRows({
        expenses: tagResults,
        accounts,
        mainCategories,
        peopleGroups,
      }),
    [tagResults, accounts, mainCategories, peopleGroups]
  );

  const tagTotal = useMemo(
    () => tagResults.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    [tagResults]
  );

  const splitReadyCount = useMemo(
    () =>
      tagResults.filter((expense) => Boolean(normalizeExpenseSplit(expense.split, peopleGroups)))
        .length,
    [tagResults, peopleGroups]
  );

  const trimmedTag = tagQuery.trim();
  const removedCount = excludedIds.size;

  const validateAll = () => {
    setMessage('');
    if (!rangeValid) {
      setMessage('End date must be on or after start date.');
      return false;
    }
    if (allRows.length === 0) {
      setMessage('No income, expenses, or transfers in this date range.');
      return false;
    }
    return true;
  };

  const validateTag = () => {
    setMessage('');
    if (!trimmedTag) {
      setMessage('Enter a tag or search term first.');
      return false;
    }
    if (tagResults.length === 0) {
      setMessage(
        removedCount > 0
          ? 'All matches were removed. Restore some items or search again.'
          : `No expenses match “${trimmedTag}”.`
      );
      return false;
    }
    return true;
  };

  const handleExclude = (expenseId) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      next.add(expenseId);
      return next;
    });
    setMessage('');
  };

  const handleRestoreRemoved = () => {
    setExcludedIds(new Set());
    setMessage('');
  };

  const handleExportAllReport = () => {
    if (!validateAll()) return;
    const rangedExpenses = expenses.filter((expense) => {
      const day = expense.date;
      return day && !dayjs(day).isBefore(dayjs(startDate), 'day') && !dayjs(day).isAfter(dayjs(endDate), 'day');
    });
    downloadLedgerReport(allRows, startDate, endDate, {
      expenses: rangedExpenses,
      peopleGroups,
    });
  };

  const handleExportAllCsv = () => {
    if (!validateAll()) return;
    downloadLedgerCsv(allRows, startDate, endDate);
  };

  const handleExportTagReport = () => {
    if (!validateTag()) return;
    downloadSearchReport({
      rows: tagExportRows,
      query: trimmedTag,
      expenses: tagResults,
      peopleGroups,
    });
  };

  const handleExportTagCsv = () => {
    if (!validateTag()) return;
    downloadSearchResultsCsv({
      expenses: tagResults,
      accounts,
      mainCategories,
      peopleGroups,
      query: trimmedTag,
    });
  };

  const handleShareableSplitReport = () => {
    if (!validateTag()) return;
    if (splitReadyCount === 0) {
      setMessage('None of the selected expenses have a split. Add a split, or remove non-split items.');
      return;
    }
    downloadShareableSplitReport({
      expenses: tagResults,
      peopleGroups,
      query: trimmedTag,
    });
  };

  return (
    <section className="card">
      <h2 className="card-title mb-1">Export data</h2>
      <p className="card-desc mb-3">
        Download a report with charts, or CSV for spreadsheets. Search a tag like #trip to export
        only those expenses — or a shareable split report for your group.
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
            onClick={handleExportAllReport}
            disabled={!rangeValid}
          >
            Export report
          </button>
          <button
            type="button"
            className="btn-outline btn-full mt-2"
            onClick={handleExportAllCsv}
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
              Type a tag to find matching expenses. Remove any you don’t want, then export or share
              splits.
            </p>
          ) : tagMatches.length === 0 ? (
            <p className="empty-state-sm mt-3 mb-0">No matches for “{trimmedTag}”.</p>
          ) : tagResults.length === 0 ? (
            <div className="mt-3">
              <p className="empty-state-sm mb-2">All matches were removed from this export.</p>
              <button type="button" className="btn-outline btn-sm" onClick={handleRestoreRemoved}>
                Restore {removedCount} removed
              </button>
            </div>
          ) : (
            <>
              <div className="mb-2 mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="m-0 text-xs text-muted">
                  {tagResults.length} selected
                  {removedCount > 0 ? ` · ${removedCount} removed` : ''}
                  {` · ${formatINR(tagTotal)}`}
                  {splitReadyCount > 0
                    ? ` · ${splitReadyCount} with split`
                    : ''}
                </p>
                {removedCount > 0 && (
                  <button
                    type="button"
                    className="border-0 bg-transparent p-0 text-xs font-semibold text-primary"
                    onClick={handleRestoreRemoved}
                  >
                    Restore removed
                  </button>
                )}
              </div>
              <ul className="m-0 max-h-[min(40vh,16rem)] list-none overflow-y-auto overscroll-contain p-0">
                {tagResults.slice(0, 40).map((expense) => {
                  const dateLabel = dayjs(expense.date).isValid()
                    ? dayjs(expense.date).format('D MMM YYYY')
                    : 'Unknown date';
                  const category = resolveMainCategoryName(expense.category, mainCategories);
                  const tags = normalizeTags(expense.tags);
                  const hasSplit = Boolean(normalizeExpenseSplit(expense.split, peopleGroups));
                  return (
                    <li
                      key={expense.id}
                      className="flex items-center justify-between gap-2 border-t border-edge/50 py-2.5 first:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-medium">
                          {expense.title || 'Untitled'}
                          {hasSplit ? (
                            <span className="ml-1.5 text-xs font-normal text-muted">· split</span>
                          ) : null}
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
                      <button
                        type="button"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-lg text-muted hover:bg-danger/10 hover:text-danger"
                        onClick={() => handleExclude(expense.id)}
                        aria-label={`Remove ${expense.title || 'expense'} from export`}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
              {tagResults.length > 40 && (
                <p className="mb-0 mt-2 text-xs text-muted">
                  Showing first 40 · export includes all {tagResults.length} selected
                </p>
              )}
            </>
          )}

          {message && <p className="mt-2 mb-0 text-sm text-danger">{message}</p>}

          <button
            type="button"
            className="btn-primary btn-full mt-4"
            onClick={handleShareableSplitReport}
            disabled={!trimmedTag || tagResults.length === 0}
          >
            Shareable split report
          </button>
          <p className="mb-0 mt-1.5 text-xs text-muted">
            Split expenses only · no banks or income · safe to send to your group
          </p>
          <button
            type="button"
            className="btn-outline btn-full mt-3"
            onClick={handleExportTagReport}
            disabled={!trimmedTag || tagResults.length === 0}
          >
            Export full report
          </button>
          <button
            type="button"
            className="btn-outline btn-full mt-2"
            onClick={handleExportTagCsv}
            disabled={!trimmedTag || tagResults.length === 0}
          >
            Export CSV
          </button>
        </>
      )}
    </section>
  );
}
