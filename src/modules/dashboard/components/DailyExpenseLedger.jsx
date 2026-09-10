import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatINR, ledgerAmountClass } from '../../../core/utils/currency';
import { getCategoryColor } from '../../../core/constants/finance';
import {
  removeExpense,
  updateExpense,
  selectDayExpenses,
  selectDayTotal,
  selectFilteredDayLabel,
  selectIsTodaySelected,
  selectAccounts,
  selectDefaultAccountId,
  selectVisibleCategories,
  selectMainCategories,
  selectPeopleGroups,
} from '../store/dashboardSlice';
import { getAccountById, formatAccountOptionLabel } from '../utils/accounts';
import {
  normalizeTags,
  resolveMainCategoryName,
} from '../utils/categories';
import { formatSplitSummary } from '../utils/groups';
import TagInput from './TagInput';
import ExpenseSplitFields, {
  resolveSplitPayload,
  splitUiFromExpense,
} from './ExpenseSplitFields';

const EMPTY_SPLIT = { enabled: false, groupId: '', paidBy: '', memberIds: [] };

export default function DailyExpenseLedger({ onFindExpenses }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { paymentModes, saving, categoryColors } = useSelector((state) => state.dashboard);
  const categories = useSelector(selectVisibleCategories);
  const mainCategories = useSelector(selectMainCategories);
  const peopleGroups = useSelector(selectPeopleGroups);
  const accounts = useSelector(selectAccounts);
  const defaultAccountId = useSelector(selectDefaultAccountId);
  const showBankPicker = accounts.length > 1;
  const dayExpenses = useSelector(selectDayExpenses);
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const isToday = useSelector(selectIsTodaySelected);

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editSplitUi, setEditSplitUi] = useState(EMPTY_SPLIT);

  const startEdit = (expense) => {
    setEditingId(expense.id);
    setEditTitle(expense.title);
    setEditAmount(String(expense.amount));
    setEditCategory(resolveMainCategoryName(expense.category, mainCategories));
    setEditAccountId(expense.accountId || defaultAccountId);
    const tags = normalizeTags(expense.tags);
    setEditTags(tags.map((tag) => `#${tag}`).join(' '));
    setEditSplitUi(splitUiFromExpense(expense.split, peopleGroups));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditAmount('');
    setEditCategory('');
    setEditAccountId('');
    setEditTags('');
    setEditSplitUi(EMPTY_SPLIT);
  };

  const handleSave = (expense) => {
    const title = editTitle.trim();
    const amount = Number(editAmount);
    if (!title || !amount || amount < 1) return;

    const split = resolveSplitPayload(editSplitUi, amount, peopleGroups);
    if (editSplitUi.enabled && !split) return;

    dispatch(
      updateExpense({
        uid: user.uid,
        expenseId: expense.id,
        previousAmount: expense.amount,
        expense: {
          title,
          amount,
          category: editCategory,
          subcategory: expense.subcategory || '',
          tags: normalizeTags(editTags),
          date: expense.date,
          paymentMode: expense.paymentMode || paymentModes[0],
          accountId: editAccountId || defaultAccountId,
          split: editSplitUi.enabled ? split : null,
        },
      })
    ).then((result) => {
      if (!result.error) cancelEdit();
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

  const canSave = editTitle.trim() && Number(editAmount) >= 1;

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
            const category = resolveMainCategoryName(expense.category, mainCategories);
            const tags = normalizeTags(expense.tags);
            const bankName = showBankPicker
              ? getAccountById(accounts, expense.accountId || defaultAccountId)?.name
              : null;
            const splitLabel = formatSplitSummary(expense.split, peopleGroups, expense.amount);

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
                      placeholder="Amount ₹"
                      aria-label="Expense amount"
                    />
                    <div className={`grid gap-2 ${showBankPicker ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <select
                        className="input py-2 text-sm"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        aria-label="Category"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {showBankPicker && (
                        <select
                          className="input py-2 text-sm"
                          value={editAccountId}
                          onChange={(e) => setEditAccountId(e.target.value)}
                          aria-label="Paid from"
                        >
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {formatAccountOptionLabel(account)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <TagInput
                      className="input py-2 text-sm"
                      value={editTags}
                      onChange={setEditTags}
                      placeholder="Tag · #trip"
                      aria-label="Tags"
                    />
                    <ExpenseSplitFields
                      amount={Number(editAmount) || 0}
                      value={editSplitUi}
                      onChange={setEditSplitUi}
                    />
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
                        background: getCategoryColor(category, categoryColors, categories),
                      }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-medium">{expense.title}</p>
                      <p className="m-0 text-xs text-muted">
                        {category}
                        {tags.length ? ` · ${tags.map((tag) => `#${tag}`).join(' ')}` : ''}
                        {bankName ? ` · ${bankName}` : ''}
                        {splitLabel ? ` · ${splitLabel}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${ledgerAmountClass('debit')}`}>
                      −{formatINR(expense.amount)}
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
          className="mt-3 w-full border-0 bg-transparent p-0 text-center text-xs text-muted hover:text-primary"
          onClick={onFindExpenses}
        >
          Search or export
        </button>
      )}
    </section>
  );
}
