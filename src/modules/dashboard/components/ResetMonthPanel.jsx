import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  formatMonthYearLabel,
  getMonthKey,
  getNowMonthYear,
  isInMonthYear,
} from '../../../core/utils/date';
import { resetCurrentMonth } from '../store/dashboardSlice';

function isTxInMonth(tx, month, year, monthKey) {
  if (tx.monthKey === monthKey) return true;
  const dayKey = tx.date || (tx.createdAt ? String(tx.createdAt).slice(0, 10) : null);
  return dayKey && isInMonthYear(dayKey, month, year);
}

export default function ResetMonthPanel() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving, expenses, walletTransactions } = useSelector((state) => state.dashboard);
  const { month, year } = getNowMonthYear();
  const monthKey = getMonthKey(month, year);
  const monthLabel = formatMonthYearLabel(month, year);

  const [message, setMessage] = useState('');

  const counts = useMemo(() => {
    const monthExpenses = (expenses || []).filter((expense) =>
      isInMonthYear(expense.date, month, year)
    );
    const incomeEntries = (walletTransactions || []).filter(
      (tx) =>
        tx.type === 'credit' &&
        tx.source === 'income' &&
        isTxInMonth(tx, month, year, monthKey)
    );
    const transferEntries = (walletTransactions || []).filter(
      (tx) => tx.type === 'transfer' && isTxInMonth(tx, month, year, monthKey)
    );
    return {
      expenses: monthExpenses.length,
      income: incomeEntries.length,
      transfers: transferEntries.length,
    };
  }, [expenses, walletTransactions, month, year, monthKey]);

  const totalItems = counts.expenses + counts.income + counts.transfers;
  const hasData = totalItems > 0;

  const handleReset = () => {
    if (!user?.uid || saving) return;
    setMessage('');

    if (!hasData) {
      setMessage('Nothing to reset for this month.');
      return;
    }

    const summary = [
      counts.income > 0 ? `${counts.income} income` : null,
      counts.expenses > 0 ? `${counts.expenses} expense${counts.expenses === 1 ? '' : 's'}` : null,
      counts.transfers > 0 ? `${counts.transfers} transfer${counts.transfers === 1 ? '' : 's'}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const proceed = window.confirm(
      `Reset ${monthLabel}?\n\nThis will permanently delete ${summary}.\n\nYou can add income and expenses again from scratch.`
    );
    if (!proceed) return;

    dispatch(resetCurrentMonth({ uid: user.uid })).then((result) => {
      if (!result.error) {
        setMessage('Month reset. You can start fresh.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not reset month.');
      }
    });
  };

  return (
    <section className="card">
      <h2 className="card-title mb-1">Reset this month</h2>
      <p className="card-desc mb-3">
        Clear all income and expenses for <strong>{monthLabel}</strong> and start over. Past months
        are not affected.
      </p>

      {hasData ? (
        <p className="m-0 mb-3 text-sm text-muted">
          {counts.income} income · {counts.expenses} expenses
          {counts.transfers > 0 ? ` · ${counts.transfers} transfers` : ''}
        </p>
      ) : (
        <p className="m-0 mb-3 text-sm text-muted">No income or expenses this month yet.</p>
      )}

      {message && (
        <p
          className={`mb-3 mt-0 text-sm ${
            message === 'Month reset. You can start fresh.' ? 'text-success' : 'text-danger'
          }`}
        >
          {message}
        </p>
      )}

      <button
        type="button"
        className="btn-outline btn-full border-danger/50 text-danger hover:bg-danger/10"
        onClick={handleReset}
        disabled={saving || !hasData}
      >
        {saving ? 'Resetting…' : `Reset ${monthLabel}`}
      </button>
    </section>
  );
}
