import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import {
  getCategoryColor,
  getCategoryLimitLevel,
  getCategoryLimitWarningText,
} from '../../../core/constants/finance';
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
  selectCategorySpentByDate,
  selectAccounts,
  selectDefaultAccountId,
  selectVisibleCategories,
  selectMainCategories,
  selectSubcategories,
} from '../store/dashboardSlice';
import { getAccountById } from '../utils/accounts';
import {
  collectExpenseTags,
  getMainByName,
  getSubcategoriesForMain,
  normalizeTags,
  resolveMainCategoryName,
} from '../utils/categories';

export default function DailyExpenseLedger({ onFindExpenses }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { paymentModes, saving, categoryColors, categoryBudgets } = useSelector(
    (state) => state.dashboard
  );
  const categories = useSelector(selectVisibleCategories);
  const mainCategories = useSelector(selectMainCategories);
  const subcategoriesMap = useSelector(selectSubcategories);
  const accounts = useSelector(selectAccounts);
  const defaultAccountId = useSelector(selectDefaultAccountId);
  const filterDate = useSelector(selectFilterDate);
  const dayExpenses = useSelector(selectDayExpenses);
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const isToday = useSelector(selectIsTodaySelected);

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState('');
  const [editAccountId, setEditAccountId] = useState('');

  const editWallet = useSelector((state) =>
    editingId ? selectMonthWalletStatsByDate(state, editDate || filterDate, editingId) : null
  );
  const editCategorySpent = useSelector((state) =>
    editingId ? selectCategorySpentByDate(state, editCategory, editDate || filterDate) : 0
  );

  const editMain = getMainByName(mainCategories, editCategory);
  const editSubOptions = getSubcategoriesForMain(subcategoriesMap, editMain?.id);

  const startEdit = (expense) => {
    setEditingId(expense.id);
    setEditTitle(expense.title);
    setEditAmount(String(expense.amount));
    setEditCategory(resolveMainCategoryName(expense.category, mainCategories));
    setEditSubcategory(expense.subcategory || '');
    setEditTags((expense.tags || []).map((tag) => `#${tag}`).join(' '));
    setEditDate(expense.date);
    setEditPaymentMode(expense.paymentMode || paymentModes[0]);
    setEditAccountId(expense.accountId || defaultAccountId);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditAmount('');
    setEditCategory('');
    setEditSubcategory('');
    setEditTags('');
    setEditDate('');
    setEditPaymentMode('');
    setEditAccountId('');
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

    const limit = Number(categoryBudgets?.[editCategory]) || 0;
    if (limit > 0) {
      const sameMonth =
        dayjs(date).format('YYYY-MM') === dayjs(expense.date).format('YYYY-MM');
      const sameBucket = sameMonth && expense.category === editCategory;
      const baseSpent = sameBucket
        ? Math.max(0, editCategorySpent - Number(expense.amount))
        : editCategorySpent;
      const after = baseSpent + amount;
      const beforeLevel = getCategoryLimitLevel(baseSpent, limit);
      const afterLevel = getCategoryLimitLevel(after, limit);
      if (afterLevel != null && (afterLevel !== beforeLevel || afterLevel >= 100)) {
        const proceed = window.confirm(
          `${getCategoryLimitWarningText(editCategory, afterLevel, after, limit)}\n\nSave anyway?`
        );
        if (!proceed) return;
      }
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
          subcategory: editSubcategory || '',
          tags: collectExpenseTags(title, editTags),
          date,
          paymentMode: editPaymentMode,
          accountId: editAccountId || defaultAccountId,
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
                      onChange={(e) => {
                        setEditCategory(e.target.value);
                        setEditSubcategory('');
                      }}
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
                      value={editSubcategory}
                      onChange={(e) => setEditSubcategory(e.target.value)}
                      aria-label="Subcategory"
                    >
                      <option value="">No subcategory</option>
                      {editSubOptions.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input py-2 text-sm"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Tags — #family"
                      aria-label="Tags"
                    />
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
                    <select
                      className="input py-2 text-sm"
                      value={editAccountId}
                      onChange={(e) => setEditAccountId(e.target.value)}
                      aria-label="Paid from account"
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          From {account.name}
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
                      style={{
                        background: getCategoryColor(
                          resolveMainCategoryName(expense.category, mainCategories),
                          categoryColors,
                          categories
                        ),
                      }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-medium">{expense.title}</p>
                      <p className="m-0 text-xs text-muted">
                        {resolveMainCategoryName(expense.category, mainCategories)}
                        {expense.subcategory ? ` · ${expense.subcategory}` : ''}
                        {normalizeTags(expense.tags).length
                          ? ` · ${normalizeTags(expense.tags)
                              .map((tag) => `#${tag}`)
                              .join(' ')}`
                          : ''}
                        {(() => {
                          const name = getAccountById(
                            accounts,
                            expense.accountId || defaultAccountId
                          )?.name;
                          return name ? ` · ${name}` : '';
                        })()}
                      </p>
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

      {onFindExpenses && (
        <button
          type="button"
          className="mt-3 w-full border-0 bg-transparent p-0 text-center text-xs font-semibold text-primary"
          onClick={onFindExpenses}
        >
          Find past expenses
        </button>
      )}
    </section>
  );
}
