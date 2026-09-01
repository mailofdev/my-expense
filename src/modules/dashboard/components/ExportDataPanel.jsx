import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { getNowMonthYear, getTodayString } from '../../../core/utils/date';
import { formatINR } from '../../../core/utils/currency';
import {
  buildLedgerRows,
  downloadLedgerCsv,
  summarizeLedgerRows,
} from '../utils/exportExpenses';
import { selectAccounts, selectMainCategories } from '../store/dashboardSlice';

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
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [message, setMessage] = useState('');

  const rangeValid = startDate && endDate && !dayjs(startDate).isAfter(dayjs(endDate), 'day');

  const rows = useMemo(() => {
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

  const summary = useMemo(() => summarizeLedgerRows(rows), [rows]);

  const handleExport = () => {
    setMessage('');
    if (!rangeValid) {
      setMessage('End date must be on or after start date.');
      return;
    }
    if (rows.length === 0) {
      setMessage('No income, expenses, or transfers in this date range.');
      return;
    }
    downloadLedgerCsv(rows, startDate, endDate);
  };

  return (
    <section className="card">
      <h2 className="card-title mb-1">Export data</h2>
      <p className="card-desc mb-3">
        Download income, expenses, and transfers as CSV — same as your Money history.
      </p>
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
          {summary.total} item{summary.total === 1 ? '' : 's'}
          {summary.income > 0 ? ` · ${summary.income} income` : ''}
          {summary.expenses > 0 ? ` · ${summary.expenses} expenses` : ''}
          {summary.transfers > 0 ? ` · ${summary.transfers} transfers` : ''}
          {summary.incomeTotal > 0 ? ` · In ${formatINR(summary.incomeTotal)}` : ''}
          {summary.expenseTotal > 0 ? ` · Out ${formatINR(summary.expenseTotal)}` : ''}
        </p>
      )}

      {message && <p className="mt-2 mb-0 text-sm text-danger">{message}</p>}

      <button
        type="button"
        className="btn-primary btn-full mt-4"
        onClick={handleExport}
        disabled={!rangeValid}
      >
        Export CSV
      </button>
    </section>
  );
}
