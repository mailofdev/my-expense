import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR, ledgerAmountClass } from '../../../core/utils/currency';
import { getTodayString } from '../../../core/utils/date';
import { getAccountById, getDefaultAccountId, formatAccountOptionLabel, isCashAccount } from '../utils/accounts';
import { resolveLedgerDayKey } from '../utils/moneyFlows';
import {
  addWalletFunds,
  updateWalletCredit,
  removeWalletCredit,
  selectFilterMonthKey,
  selectFilteredMonthLabel,
  selectMonthIncome,
  selectMonthIncomeEntries,
  selectIsFilterCurrentMonth,
  selectAccounts,
  selectFilterDate,
} from '../store/dashboardSlice';

export default function AddIncomeForm() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving } = useSelector((state) => state.dashboard);
  const accounts = useSelector(selectAccounts);
  const cashAccounts = accounts.filter(isCashAccount);
  const monthKey = useSelector(selectFilterMonthKey);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const monthIncome = useSelector(selectMonthIncome);
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);
  const incomeEntries = useSelector(selectMonthIncomeEntries);
  const filterDate = useSelector(selectFilterDate);

  const defaultAccountId = getDefaultAccountId(cashAccounts);
  const salaryAccountId =
    cashAccounts.find((a) => a.kind === 'salary')?.id || defaultAccountId;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState(salaryAccountId);
  const [date, setDate] = useState(filterDate || getTodayString());
  const [message, setMessage] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editAccountId, setEditAccountId] = useState(salaryAccountId);
  const [editDate, setEditDate] = useState(filterDate || getTodayString());

  useEffect(() => {
    setAccountId((prev) => {
      if (accounts.some((a) => a.id === prev && isCashAccount(a))) return prev;
      return salaryAccountId;
    });
  }, [accounts, salaryAccountId]);

  useEffect(() => {
    if (!editingId) {
      setDate(filterDate || getTodayString());
    }
  }, [filterDate, editingId]);

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditAmount(String(entry.amount));
    setEditNote(entry.note || '');
    setEditAccountId(entry.accountId || defaultAccountId);
    setEditDate(resolveLedgerDayKey(entry, filterDate || getTodayString()));
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditNote('');
    setEditAccountId(salaryAccountId);
    setEditDate(filterDate || getTodayString());
  };

  const handleSaveEdit = (entry) => {
    const value = Number(editAmount);
    if (!value || value < 1) {
      setMessage('Enter at least ₹1.');
      return;
    }
    if (!editDate) {
      setMessage('Pick a date.');
      return;
    }

    dispatch(
      updateWalletCredit({
        uid: user.uid,
        txId: entry.id,
        amount: value,
        note: editNote.trim() || 'Income',
        accountId: editAccountId || defaultAccountId,
        date: editDate,
      })
    ).then((result) => {
      if (!result.error) {
        cancelEdit();
        setMessage('Updated.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not update.');
      }
    });
  };

  const handleDelete = (entry) => {
    const proceed = window.confirm(
      `Remove ${entry.note || 'income'} (${formatINR(entry.amount)})?`
    );
    if (!proceed) return;

    if (editingId === entry.id) cancelEdit();
    dispatch(removeWalletCredit({ uid: user.uid, txId: entry.id })).then((result) => {
      if (!result.error) {
        setMessage('Removed.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not remove.');
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('');
    const value = Number(amount);
    if (!value || value < 1) {
      setMessage('Enter at least ₹1.');
      return;
    }
    if (!date) {
      setMessage('Pick a date.');
      return;
    }

    dispatch(
      addWalletFunds({
        uid: user.uid,
        amount: value,
        note: note.trim() || 'Income',
        monthKey,
        source: 'income',
        accountId: accountId || defaultAccountId,
        date,
      })
    ).then((result) => {
      if (!result.error) {
        setAmount('');
        setNote('');
        setDate(filterDate || getTodayString());
        const accountName = accounts.find((a) => a.id === accountId)?.name || 'account';
        setMessage(`+${formatINR(value)} → ${accountName}`);
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not add money.');
      }
    });
  };

  return (
    <section className="card">
      <h2 className="card-title mb-1">Add income</h2>
      <p className="card-desc mb-3">
        {monthIncome > 0
          ? `${formatINR(monthIncome)} added this month. More income = more to spend.`
          : 'Start by adding your salary or any money you received this month.'}
      </p>

      {!isCurrentMonth && (
        <p className="mb-3 mt-0 text-xs text-muted">Applies to {monthLabel}.</p>
      )}

      <form className="space-y-3" onSubmit={handleSubmit}>
        <input
          className="input"
          type="number"
          min="1"
          inputMode="numeric"
          placeholder="Amount ₹"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setMessage('');
          }}
          aria-label="Amount"
        />

        {cashAccounts.length > 1 && (
          <select
            className="input"
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setMessage('');
            }}
            aria-label="Deposit to account"
          >
            {cashAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                Into {formatAccountOptionLabel(account)}
              </option>
            ))}
          </select>
        )}

        <input
          className="input"
          type="date"
          max={getTodayString()}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setMessage('');
          }}
          aria-label="Income date"
        />

        <input
          className="input"
          type="text"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setMessage('');
          }}
          placeholder="Note (optional) — Salary, freelance…"
          aria-label="Note"
        />

        <button type="submit" className="btn-primary btn-full" disabled={saving || editingId}>
          {saving && !editingId ? 'Adding…' : 'Add income'}
        </button>
      </form>

      {incomeEntries.length > 0 && (
        <ul className="m-0 mt-4 list-none space-y-1 border-t border-edge/50 p-0 pt-3">
          {incomeEntries.map((entry) => {
            const isEditing = editingId === entry.id;
            const accountName = getAccountById(
              accounts,
              entry.accountId || defaultAccountId
            )?.name;
            const entryDay = resolveLedgerDayKey(entry);

            return (
              <li key={entry.id} className="rounded-sm py-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      className="input py-2 text-sm"
                      type="number"
                      min="1"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      aria-label="Edit amount"
                      autoFocus
                    />
                    {cashAccounts.length > 1 && (
                      <select
                        className="input py-2 text-sm"
                        value={editAccountId}
                        onChange={(e) => setEditAccountId(e.target.value)}
                        aria-label="Edit account"
                      >
                        {cashAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            Into {formatAccountOptionLabel(account)}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      className="input py-2 text-sm"
                      type="date"
                      max={getTodayString()}
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      aria-label="Edit income date"
                    />
                    <input
                      className="input py-2 text-sm"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Note"
                      aria-label="Edit note"
                    />
                    <div className="flex justify-end gap-2">
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
                        onClick={() => handleSaveEdit(entry)}
                        disabled={saving || !(Number(editAmount) >= 1) || !editDate}
                      >
                        {saving ? '…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-medium">
                        {entry.note || 'Income'}
                      </p>
                      <p className="m-0 text-xs text-muted">
                        {accountName ? `${accountName} · ` : ''}
                        {entryDay ? dayjs(entryDay).format('D MMM') : monthLabel}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${ledgerAmountClass('income')}`}>
                      +{formatINR(entry.amount)}
                    </span>
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-sm text-muted hover:bg-primary/10 hover:text-primary"
                      disabled={saving || editingId !== null}
                      onClick={() => startEdit(entry)}
                      aria-label={`Edit ${entry.note || 'income'}`}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-lg text-muted hover:bg-danger/10 hover:text-danger"
                      disabled={saving || editingId !== null}
                      onClick={() => handleDelete(entry)}
                      aria-label={`Remove ${entry.note || 'income'}`}
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

      {message && (
        <p
          className={`mb-0 mt-2 text-sm ${
            message.startsWith('Could') || message.startsWith('Enter') || message.startsWith('Pick')
              ? 'text-danger'
              : 'text-success'
          }`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
