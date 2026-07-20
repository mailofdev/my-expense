import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { getTodayString } from '../../../core/utils/date';
import { formatINR } from '../../../core/utils/currency';
import {
  downloadExpenseCsv,
  filterExpensesByDateRange,
} from '../utils/exportExpenses';

function getDefaultRange(filterMonth, filterYear) {
  const today = getTodayString();
  const startDate = dayjs(`${filterYear}-${String(filterMonth).padStart(2, '0')}-01`).format(
    'YYYY-MM-DD'
  );
  const monthEnd = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
  const endDate = dayjs(monthEnd).isAfter(dayjs(today), 'day') ? today : monthEnd;
  return { startDate, endDate };
}

export default function ExportDataPanel() {
  const expenses = useSelector((state) => state.dashboard.expenses);
  const { filterMonth, filterYear } = useSelector((state) => state.dashboard);
  const today = getTodayString();

  const defaults = getDefaultRange(filterMonth, filterYear);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const next = getDefaultRange(filterMonth, filterYear);
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    setMessage('');
  }, [filterMonth, filterYear]);

  const rangeValid = startDate && endDate && !dayjs(startDate).isAfter(dayjs(endDate), 'day');

  const filtered = rangeValid
    ? filterExpensesByDateRange(expenses, startDate, endDate)
    : [];

  const total = filtered.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

  const handleExport = () => {
    setMessage('');
    if (!rangeValid) {
      setMessage('End date must be on or after start date.');
      return;
    }
    if (filtered.length === 0) {
      setMessage('No expenses in this date range.');
      return;
    }
    downloadExpenseCsv(filtered, startDate, endDate);
  };

  return (
    <section className="card">
      <h2 className="card-title">Export data</h2>
      <p className="card-desc">Download expenses for a date range as a spreadsheet file.</p>

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
          {filtered.length} expense{filtered.length === 1 ? '' : 's'} · {formatINR(total)}
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
