import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR, ledgerAmountClass } from '../../../core/utils/currency';
import { getTodayString } from '../../../core/utils/date';
import { getAccountById, getDefaultAccountId, formatAccountOptionLabel, isCashAccount, isSetAsideAccount } from '../utils/accounts';
import { resolveLedgerDayKey } from '../utils/moneyFlows';
import useConfirm from '../../../shared/hooks/useConfirm';
import {
  addWalletFunds,
  updateWalletCredit,
  removeWalletCredit,
  setWalletCreditKind,
  selectFilterMonthKey,
  selectFilteredMonthLabel,
  selectMonthIncomeEntries,
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
  const incomeEntries = useSelector(selectMonthIncomeEntries);
  const filterDate = useSelector(selectFilterDate);

  const defaultAccountId = getDefaultAccountId(cashAccounts);
  const salaryAccountId =
    cashAccounts.find((a) => a.kind === 'salary')?.id || defaultAccountId;

  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState('income');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState(salaryAccountId);
  const [date, setDate] = useState(filterDate || getTodayString());
  const [message, setMessage] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

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

  const handleKind = async (entry) => {
    const isBack = entry.source === 'money_back';
    const ok = await confirm({
      title: isBack ? 'Count this as income?' : 'Mark as money back?',
      message: isBack
        ? `${entry.note || 'This amount'} (${formatINR(entry.amount)}) will count as income again. Left to spend stays the same.`
        : `${entry.note || 'This amount'} (${formatINR(entry.amount)}) leaves Income and shows as money back. Left to spend stays the same.`,
      confirmLabel: isBack ? 'Count as income' : 'Money back',
    });
    if (!ok) return;
    dispatch(
      setWalletCreditKind({
        uid: user.uid,
        txId: entry.id,
        kind: isBack ? 'income' : 'money_back',
      })
    ).then((result) => {
      if (!result.error) {
        setMessage(isBack ? 'Counted as income.' : 'Marked as money back. Income no longer includes it.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not update.');
      }
    });
  };

  const handleDelete = async (entry) => {
    const isBack = entry.source === 'money_back';
    const ok = await confirm({
      title: isBack ? 'Remove money back?' : 'Remove income?',
      message: isBack
        ? `Remove ${entry.note || 'money back'} (${formatINR(entry.amount)}). Left to spend goes down by this amount. Other income stays.`
        : `Remove ${entry.note || 'income'} (${formatINR(entry.amount)})?`,
      confirmLabel: 'Remove',
    });
    if (!ok) return;

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
        note: note.trim() || (kind === 'money_back' ? 'Money back' : 'Income'),
        monthKey,
        source: kind === 'money_back' ? 'money_back' : 'income',
        accountId: accountId || defaultAccountId,
        date,
      })
    ).then((result) => {
      if (!result.error) {
        setAmount('');
        setNote('');
        setKind('income');
        setDate(filterDate || getTodayString());
        const accountName = accounts.find((a) => a.id === accountId)?.name || 'account';
        setMessage(
          kind === 'money_back'
            ? `+${formatINR(value)} money back → ${accountName}. Not counted as income.`
            : `+${formatINR(value)} → ${accountName}`
        );
        setShowMore(false);
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not add income.');
      }
    });
  };

  return (
    <section className="card">
      {confirmDialog}
      <h2 className="card-title mb-3">Add income</h2>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <p className="m-0 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">This money is</p>
          <div className="flex gap-2">
            <button
              type="button"
              className={`min-h-11 flex-1 rounded-full px-3 text-sm font-medium ${
                kind === 'income' ? 'bg-primary text-on-primary shadow-glow' : 'bg-surface-2 text-ink'
              }`}
              aria-pressed={kind === 'income'}
              onClick={() => setKind('income')}
            >
              Salary
            </button>
            <button
              type="button"
              className={`min-h-11 flex-1 rounded-full px-3 text-sm font-medium ${
                kind === 'money_back' ? 'bg-primary text-on-primary shadow-glow' : 'bg-surface-2 text-ink'
              }`}
              aria-pressed={kind === 'money_back'}
              onClick={() => setKind('money_back')}
            >
              Money back
            </button>
          </div>
          <p className="m-0 mt-1.5 text-xs text-muted">
            {kind === 'money_back'
              ? 'A friend paid their share. Left to spend goes up. Income does not.'
              : 'Salary or other money you earned. This is your Income total.'}
          </p>
        </div>
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

        {isSetAsideAccount(cashAccounts.find((account) => account.id === accountId)) && (
          <p className="m-0 text-xs text-muted">
            This goes into a set-aside account, so it is not added to left to spend.
          </p>
        )}

        <div className="flex items-center gap-2">
          <button type="submit" className="btn-primary min-w-0 flex-1" disabled={saving || editingId}>
            {saving && !editingId ? 'Adding…' : kind === 'money_back' ? 'Add money back' : 'Add income'}
          </button>
          <button
            type="button"
            className={`btn-outline shrink-0 px-3 ${
              showMore || note ? 'border-primary/50 text-primary' : ''
            }`}
            onClick={() => setShowMore((open) => !open)}
            aria-expanded={showMore}
          >
            {showMore ? 'Less' : 'More details'}
          </button>
        </div>

        {showMore && (
          <div className="space-y-3">
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
              placeholder="Note (optional)"
              aria-label="Note"
            />
          </div>
        )}
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
              <li key={entry.id} className="rounded-sm px-1 py-2.5 hover:bg-ink/[0.04]">
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
                    {isSetAsideAccount(cashAccounts.find((account) => account.id === editAccountId)) && (
                      <p className="m-0 text-xs text-muted">
                        This stays in a set-aside account, so it is not part of left to spend.
                      </p>
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
                        {entry.note || (entry.source === 'money_back' ? 'Money back' : 'Income')}
                      </p>
                      <p className="m-0 text-xs text-muted">
                        {entry.source === 'money_back' ? 'Money back · ' : 'Income · '}
                        {accountName ? `${accountName} · ` : ''}
                        {entryDay ? dayjs(entryDay).format('D MMM') : monthLabel}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${ledgerAmountClass('income')}`}>
                      +{formatINR(entry.amount)}
                    </span>
                    <button
                      type="button"
                      className="min-h-11 shrink-0 rounded-full px-2.5 text-xs font-semibold text-primary"
                      disabled={saving || editingId !== null}
                      onClick={() => handleKind(entry)}
                    >
                      {entry.source === 'money_back' ? 'As income' : 'Money back'}
                    </button>
                    <button
                      type="button"
                      className="icon-btn text-sm text-muted hover:bg-primary/10 hover:text-primary"
                      disabled={saving || editingId !== null}
                      onClick={() => startEdit(entry)}
                      aria-label={`Edit ${entry.note || 'income'}`}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn text-lg text-muted hover:bg-danger/10 hover:text-danger"
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
