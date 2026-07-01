import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import { getCategoryColor } from '../../../core/constants/finance';
import {
  removeExpense,
  updateExpense,
  setDayFilter,
  selectDayExpenses,
  selectDayTotal,
  selectFilterDate,
  selectFilteredDayLabel,
  selectIsTodaySelected,
  selectMonthWalletStatsByDate,
} from '../store/dashboardSlice';

export default function DailyExpenseLedger() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, paymentModes, saving } = useSelector((state) => state.dashboard);
  const filterDate = useSelector(selectFilterDate);
  const dayExpenses = useSelector(selectDayExpenses);
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const isToday = useSelector(selectIsTodaySelected);

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState('');

  const editWallet = useSelector((state) =>
    editingId ? selectMonthWalletStatsByDate(state, editDate || filterDate, editingId) : null
  );

  const startEdit = (expense) => {
    setEditingId(expense.id);
    setEditTitle(expense.title);
    setEditAmount(String(expense.amount));
    setEditCategory(expense.category);
    setEditDate(expense.date);
    setEditPaymentMode(expense.paymentMode || paymentModes[0]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditAmount('');
    setEditCategory('');
    setEditDate('');
    setEditPaymentMode('');
  };

  const handleSave = (expense) => {
    const title = editTitle.trim();
    const amount = Number(editAmount);
    const date = editDate;

    if (!title) return;
    if (!amount || amount < 1) return;
    if (!date) return;
    if (dayjs(date).isAfter(dayjs(), 'day')) return;

    const monthChanged = dayjs(date).format('YYYY-MM') !== dayjs(expense.date).format('YYYY-MM');
    const stats = editWallet || { remaining: 0, funded: 0, monthLabel: '' };
    const remainingAfter = stats.remaining - amount;

    if (stats.funded === 0 && amount > 0) {
      const proceed = window.confirm(
        `${stats.monthLabel} wallet is not funded. Save this expense anyway?`
      );
      if (!proceed) return;
    } else if (remainingAfter < 0) {
      const proceed = window.confirm(
        `This will exceed ${stats.monthLabel} wallet by ${formatINR(Math.abs(remainingAfter))}. Save anyway?`
      );
      if (!proceed) return;
    }

    dispatch(
      updateExpense({
        uid: user.uid,
        expenseId: expense.id,
        previousAmount: expense.amount,
        expense: {
          title,
          amount,
          category: editCategory,
          date,
          paymentMode: editPaymentMode,
        },
      })
    ).then((result) => {
      if (!result.error) {
        if (date !== filterDate) {
          dispatch(setDayFilter({ date }));
        }
        if (monthChanged) {
          window.alert(`Expense moved to ${stats.monthLabel} wallet.`);
        }
        cancelEdit();
      }
    });
  };

  const handleDelete = (expense) => {
    if (editingId === expense.id) cancelEdit();
    dispatch(
      removeExpense({
        uid: user.uid,
        expenseId: expense.id,
        amount: expense.amount,
      })
    );
  };

  const title = isToday ? "Today's expenses" : dayLabel;
  const countLabel =
    dayExpenses.length === 0
      ? 'None yet'
      : `${dayExpenses.length} item${dayExpenses.length === 1 ? '' : 's'}`;

  const canSave =
    editTitle.trim() &&
    Number(editAmount) >= 1 &&
    editDate &&
    !dayjs(editDate).isAfter(dayjs(), 'day');

  const editAmountNum = Number(editAmount) || 0;
  const editProjectedRemaining = editWallet ? editWallet.remaining - editAmountNum : 0;
  const editMonthChanged =
    editingId && editDate && dayjs(editDate).format('YYYY-MM') !== dayjs(filterDate).format('YYYY-MM');

  return (
    <section className="card">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="card-title mb-0.5">{title}</h2>
          <p className="m-0 text-sm text-muted">{countLabel}</p>
        </div>
        {dayExpenses.length > 0 && (
          <span className="text-lg font-bold text-primary">{formatINR(dayTotal)}</span>
        )}
      </header>

      {dayExpenses.length === 0 ? (
        <p className="empty-state-sm">Add your first expense above.</p>
      ) : (
        <ul className="m-0 list-none space-y-1 p-0">
          {dayExpenses.map((expense) => {
            const isEditing = editingId === expense.id;

            return (
              <li
                key={expense.id}
                className="rounded-sm py-3 pl-1 pr-0 hover:bg-surface-2/50"
              >
                {isEditing ? (
                  <div className="space-y-2 pr-1">
                    <input
                      className="input py-2 text-sm"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title"
                      aria-label="Expense title"
                      autoFocus
                    />
                    <input
                      className="input py-2 text-sm"
                      type="number"
                      min="1"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="Amount in ₹"
                      aria-label="Expense amount"
                    />
                    <select
                      className="input py-2 text-sm"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      aria-label="Category"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input py-2 text-sm"
                      value={editPaymentMode}
                      onChange={(e) => setEditPaymentMode(e.target.value)}
                      aria-label="Payment method"
                    >
                      {paymentModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input py-2 text-sm"
                      type="date"
                      max={dayjs().format('YYYY-MM-DD')}
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      aria-label="Date"
                    />
                    {editWallet && editAmountNum > 0 && (
                      <p
                        className={`m-0 rounded-sm border px-2 py-1.5 text-xs ${
                          editProjectedRemaining < 0
                            ? 'border-danger/40 bg-danger/10 text-red-200'
                            : editWallet.funded === 0
                              ? 'border-accent/40 bg-accent/10 text-yellow-100'
                              : 'border-edge bg-surface-2 text-muted'
                        }`}
                      >
                        {editWallet.funded === 0
                          ? `${editWallet.monthLabel} wallet not funded`
                          : `${editWallet.monthLabel} wallet: ${formatINR(Math.max(0, editProjectedRemaining))} left after save`}
                        {editMonthChanged && ' · affects different month'}
                      </p>
                    )}
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        onClick={() => handleSave(expense)}
                        disabled={saving || !canSave}
                      >
                        {saving ? '…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: getCategoryColor(expense.category) }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-medium">{expense.title}</p>
                      <p className="m-0 text-xs text-muted">{expense.category}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">
                      {formatINR(expense.amount)}
                    </span>
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-sm text-muted hover:bg-primary/10 hover:text-primary"
                      disabled={saving || editingId !== null}
                      onClick={() => startEdit(expense)}
                      aria-label={`Edit ${expense.title}`}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-lg text-muted hover:bg-danger/10 hover:text-danger"
                      disabled={saving || editingId !== null}
                      onClick={() => handleDelete(expense)}
                      aria-label={`Remove ${expense.title}`}
                    >
                      ×
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
