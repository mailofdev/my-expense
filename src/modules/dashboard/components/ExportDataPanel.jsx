import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { getNowMonthYear, getTodayString } from '../../../core/utils/date';
import { formatINR, ledgerAmountClass } from '../../../core/utils/currency';
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
const PREVIEW_VISIBLE = 80;

function getDefaultRange() {
  const { month, year } = getNowMonthYear();
  const today = getTodayString();
  const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
  const monthEnd = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
  const endDate = dayjs(monthEnd).isAfter(dayjs(today), 'day') ? today : monthEnd;
  return { startDate, endDate };
}

function formatPreviewDate(date) {
  return dayjs(date).isValid() ? dayjs(date).format('D MMM YYYY') : 'Unknown date';
}

function amountClassForType(type) {
  if (type === 'Income') return ledgerAmountClass('income');
  if (type === 'Transfer') return ledgerAmountClass('transfer');
  return ledgerAmountClass('debit');
}

function amountPrefix(type) {
  if (type === 'Income') return '+';
  if (type === 'Transfer') return '↔';
  return '−';
}

function ExportPreview({
  heading,
  summaryText,
  rows,
  message,
  exporting,
  onBack,
  onExportPdf,
  onExportCsv,
  onExportSplit,
  splitReadyCount = 0,
}) {
  const visibleRows = rows.slice(0, PREVIEW_VISIBLE);

  return (
    <div>
      <button
        type="button"
        className="mb-3 border-0 bg-transparent p-0 text-sm font-semibold text-primary"
        onClick={onBack}
      >
        ← Back
      </button>
      <h3 className="m-0 text-base font-semibold text-[#f0f4f2]">Preview</h3>
      <p className="mb-3 mt-1 text-sm text-muted">{heading}</p>
      {summaryText && <p className="mb-3 mt-0 text-xs text-muted">{summaryText}</p>}

      {rows.length === 0 ? (
        <p className="empty-state-sm">Nothing to export.</p>
      ) : (
        <>
          <ul className="m-0 max-h-[min(50vh,22rem)] list-none overflow-y-auto overscroll-contain p-0">
            {visibleRows.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-2 border-t border-edge/50 py-2.5 first:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-medium">{row.title}</p>
                  <p className="m-0 truncate text-xs text-muted">{row.detail}</p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${amountClassForType(row.type)}`}
                >
                  {amountPrefix(row.type)}
                  {formatINR(row.amount)}
                </span>
              </li>
            ))}
          </ul>
          {rows.length > PREVIEW_VISIBLE && (
            <p className="mb-0 mt-2 text-xs text-muted">
              Showing first {PREVIEW_VISIBLE} · export includes all {rows.length}
            </p>
          )}
        </>
      )}

      {message && <p className="mt-2 mb-0 text-sm text-danger">{message}</p>}

      <button
        type="button"
        className="btn-primary btn-full mt-4"
        onClick={onExportPdf}
        disabled={exporting || rows.length === 0}
      >
        {exporting ? 'Creating PDF…' : 'Export PDF'}
      </button>
      <button
        type="button"
        className="btn-outline btn-full mt-2"
        onClick={onExportCsv}
        disabled={exporting || rows.length === 0}
      >
        Export CSV
      </button>
      {onExportSplit && (
        <>
          <button
            type="button"
            className="btn-outline btn-full mt-2"
            onClick={onExportSplit}
            disabled={exporting || splitReadyCount === 0}
          >
            Shareable split PDF
          </button>
          <p className="mb-0 mt-1.5 text-xs text-muted">
            {splitReadyCount > 0
              ? `${splitReadyCount} split expense${splitReadyCount === 1 ? '' : 's'} · opens on phones`
              : 'No split expenses in this preview'}
          </p>
        </>
      )}
    </div>
  );
}

export default function ExportDataPanel({ embedded = false }) {
  const expenses = useSelector((state) => state.dashboard.expenses);
  const walletTransactions = useSelector((state) => state.dashboard.walletTransactions);
  const accounts = useSelector(selectAccounts);
  const mainCategories = useSelector(selectMainCategories);
  const peopleGroups = useSelector(selectPeopleGroups);
  const today = getTodayString();

  const defaults = getDefaultRange();
  const [mode, setMode] = useState('all');
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [tagQuery, setTagQuery] = useState('');
  const [excludedIds, setExcludedIds] = useState(() => new Set());
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const allPreviewRows = useMemo(
    () =>
      allRows.map((row, index) => ({
        id: `${row.type}-${row.date}-${row.sortId || index}`,
        title: row.description || row.type,
        detail: [formatPreviewDate(row.date), row.type, row.category, row.split]
          .filter(Boolean)
          .join(' · '),
        amount: row.amount,
        type: row.type,
      })),
    [allRows]
  );

  const tagPreviewRows = useMemo(
    () =>
      tagExportRows.map((row, index) => ({
        id: tagResults[index]?.id || `${row.date}-${row.title}-${index}`,
        title: row.title || 'Untitled',
        detail: [formatPreviewDate(row.date), row.category, row.tags, row.account, row.split]
          .filter(Boolean)
          .join(' · '),
        amount: row.amount,
        type: 'Expense',
      })),
    [tagExportRows, tagResults]
  );

  const closePreview = () => {
    setPreviewOpen(false);
    setMessage('');
  };

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

  const handlePreview = () => {
    if (mode === 'all') {
      setMessage('');
      if (!rangeValid) {
        setMessage('End date must be on or after start date.');
        return;
      }
    } else if (!validateTag()) {
      return;
    }
    setPreviewOpen(true);
  };

  const handleExportAllReport = async () => {
    if (!validateAll()) return;
    const rangedExpenses = expenses.filter((expense) => {
      const day = expense.date;
      return (
        day &&
        !dayjs(day).isBefore(dayjs(startDate), 'day') &&
        !dayjs(day).isAfter(dayjs(endDate), 'day')
      );
    });
    setExporting(true);
    try {
      await downloadLedgerReport(allRows, startDate, endDate, {
        expenses: rangedExpenses,
        peopleGroups,
      });
    } catch (error) {
      setMessage(error?.message || 'Could not create PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportAllCsv = () => {
    if (!validateAll()) return;
    downloadLedgerCsv(allRows, startDate, endDate);
  };

  const handleExportTagReport = async () => {
    if (!validateTag()) return;
    setExporting(true);
    try {
      await downloadSearchReport({
        rows: tagExportRows,
        query: trimmedTag,
        expenses: tagResults,
        peopleGroups,
      });
    } catch (error) {
      setMessage(error?.message || 'Could not create PDF.');
    } finally {
      setExporting(false);
    }
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

  const handleShareableSplitReport = async () => {
    if (!validateTag()) return;
    if (splitReadyCount === 0) {
      setMessage('None of the selected expenses have a split. Add a split, or remove non-split items.');
      return;
    }
    setExporting(true);
    try {
      await downloadShareableSplitReport({
        expenses: tagResults,
        peopleGroups,
        query: trimmedTag,
      });
    } catch (error) {
      setMessage(error?.message || 'Could not create PDF.');
    } finally {
      setExporting(false);
    }
  };

  const rangeLabel = `${dayjs(startDate).format('D MMM YYYY')} – ${dayjs(endDate).format('D MMM YYYY')}`;
  const allSummaryText = rangeValid
    ? [
        `${allSummary.total} item${allSummary.total === 1 ? '' : 's'}`,
        allSummary.income > 0 ? `${allSummary.income} income` : null,
        allSummary.expenses > 0 ? `${allSummary.expenses} expenses` : null,
        allSummary.transfers > 0 ? `${allSummary.transfers} transfers` : null,
        allSummary.incomeTotal > 0 ? `In ${formatINR(allSummary.incomeTotal)}` : null,
        allSummary.expenseTotal > 0 ? `Out ${formatINR(allSummary.expenseTotal)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  if (previewOpen && mode === 'all') {
    return (
      <ExportPreview
        heading={rangeLabel}
        summaryText={allSummaryText}
        rows={allPreviewRows}
        message={message}
        exporting={exporting}
        onBack={closePreview}
        onExportPdf={handleExportAllReport}
        onExportCsv={handleExportAllCsv}
      />
    );
  }

  if (previewOpen && mode === 'tag') {
    return (
      <ExportPreview
        heading={`“${trimmedTag}”`}
        summaryText={`${tagResults.length} expense${tagResults.length === 1 ? '' : 's'} · ${formatINR(tagTotal)}`}
        rows={tagPreviewRows}
        message={message}
        exporting={exporting}
        onBack={closePreview}
        onExportPdf={handleExportTagReport}
        onExportCsv={handleExportTagCsv}
        onExportSplit={handleShareableSplitReport}
        splitReadyCount={splitReadyCount}
      />
    );
  }

  return (
    <section className={embedded ? '' : 'card'}>
      {!embedded && (
        <>
          <h2 className="card-title mb-1">Export data</h2>
          <p className="card-desc mb-3">Preview first, then download PDF or CSV.</p>
        </>
      )}

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
            setPreviewOpen(false);
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
            setPreviewOpen(false);
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

          {rangeValid && <p className="mt-3 mb-0 text-sm text-muted">{allSummaryText || '0 items'}</p>}
          {message && <p className="mt-2 mb-0 text-sm text-danger">{message}</p>}

          <button
            type="button"
            className="btn-primary btn-full mt-4"
            onClick={handlePreview}
            disabled={!rangeValid}
          >
            Preview
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
              Type a tag, remove any extras, then preview.
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
                  {splitReadyCount > 0 ? ` · ${splitReadyCount} with split` : ''}
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
                  const dateLabel = formatPreviewDate(expense.date);
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
                  Showing first 40 · preview includes all {tagResults.length} selected
                </p>
              )}
            </>
          )}

          {message && <p className="mt-2 mb-0 text-sm text-danger">{message}</p>}

          <button
            type="button"
            className="btn-primary btn-full mt-4"
            onClick={handlePreview}
            disabled={!trimmedTag || tagResults.length === 0}
          >
            Preview
          </button>
        </>
      )}
    </section>
  );
}
