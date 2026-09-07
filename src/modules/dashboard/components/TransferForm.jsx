import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR, ledgerAmountClass } from '../../../core/utils/currency';
import { getTodayString } from '../../../core/utils/date';
import { getAccountById, formatAccountOptionLabel, isCreditAccount, isCashAccount } from '../utils/accounts';
import { resolveLedgerDayKey } from '../utils/moneyFlows';
import {
  transferBetweenAccounts,
  updateWalletTransfer,
  removeWalletTransfer,
  selectAccountsWithBalances,
  selectFilterDate,
  selectMonthTransferEntries,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';

export default function TransferForm() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving } = useSelector((state) => state.dashboard);
  const { accounts } = useSelector(selectAccountsWithBalances);
  const filterDate = useSelector(selectFilterDate);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const transferEntries = useSelector(selectMonthTransferEntries);

  const salary = accounts.find((a) => a.kind === 'salary') || accounts.find(isCashAccount) || accounts[0];
  const savings =
    accounts.find((a) => a.kind === 'savings') ||
    accounts.find((a) => a.kind === 'debit') ||
    accounts.find((a) => isCashAccount(a) && a.id !== salary?.id) ||
    accounts[1] ||
    accounts[0];
  const defaultCredit = accounts.find(isCreditAccount);

  const [amount, setAmount] = useState('');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(filterDate || getTodayString());
  const [message, setMessage] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editFromId, setEditFromId] = useState('');
  const [editToId, setEditToId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState(filterDate || getTodayString());

  useEffect(() => {
    if (!accounts.length) return;
    setFromId((prev) =>
      accounts.some((a) => a.id === prev && isCashAccount(a))
        ? prev
        : salary?.id || accounts.find(isCashAccount)?.id || accounts[0].id
    );
    setToId((prev) =>
      accounts.some((a) => a.id === prev)
        ? prev
        : defaultCredit?.id || savings?.id || accounts[1]?.id || accounts[0].id
    );
  }, [accounts, salary?.id, savings?.id, defaultCredit?.id]);

  useEffect(() => {
    if (!editingId) {
      setDate(filterDate || getTodayString());
    }
  }, [filterDate, editingId]);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccount = accounts.find((a) => a.id === toId);

  const handleSwap = () => {
    setFromId(toId);
    setToId(fromId);
    setMessage('');
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditAmount(String(entry.amount));
    setEditFromId(entry.fromAccountId || salary?.id || accounts[0]?.id || '');
    setEditToId(entry.toAccountId || savings?.id || accounts[1]?.id || accounts[0]?.id || '');
    setEditNote(entry.note && entry.note !== 'Transfer' ? entry.note : '');
    setEditDate(resolveLedgerDayKey(entry, filterDate || getTodayString()));
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditFromId('');
    setEditToId('');
    setEditNote('');
    setEditDate(filterDate || getTodayString());
  };

  const handleSaveEdit = (entry) => {
    const value = Number(editAmount);
    if (!value || value < 1) {
      setMessage('Enter at least ₹1.');
      return;
    }
    if (!editFromId || !editToId || editFromId === editToId) {
      setMessage('Pick two different accounts.');
      return;
    }
    if (!editDate) {
      setMessage('Pick a date.');
      return;
    }

    const toAcc = getAccountById(accounts, editToId);
    const fromAcc = getAccountById(accounts, editFromId);
    if (isCreditAccount(toAcc) && isCreditAccount(fromAcc)) {
      setMessage('Pay a credit card from a bank or debit card.');
      return;
    }

    dispatch(
      updateWalletTransfer({
        uid: user.uid,
        txId: entry.id,
        amount: value,
        fromAccountId: editFromId,
        toAccountId: editToId,
        note:
          editNote.trim() ||
          (isCreditAccount(toAcc) ? 'Card payment' : 'Transfer'),
        date: editDate,
      })
    ).then((result) => {
      if (!result.error) {
        cancelEdit();
        setMessage('Transfer updated.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not update.');
      }
    });
  };

  const handleDelete = (entry) => {
    const fromName = getAccountById(accounts, entry.fromAccountId)?.name || 'Bank';
    const toName = getAccountById(accounts, entry.toAccountId)?.name || 'Bank';
    const proceed = window.confirm(
      `Remove transfer ${fromName} → ${toName} (${formatINR(entry.amount)})?`
    );
    if (!proceed) return;

    if (editingId === entry.id) cancelEdit();
    dispatch(removeWalletTransfer({ uid: user.uid, txId: entry.id })).then((result) => {
      if (!result.error) {
        setMessage('Transfer removed.');
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
    if (!fromId || !toId || fromId === toId) {
      setMessage('Pick two different accounts.');
      return;
    }
    if (!date) {
      setMessage('Pick a date.');
      return;
    }

    const payingCard = isCreditAccount(toAccount);
    if (payingCard && isCreditAccount(fromAccount)) {
      setMessage('Pay a credit card from a bank or debit card.');
      return;
    }

    dispatch(
      transferBetweenAccounts({
        uid: user.uid,
        amount: value,
        fromAccountId: fromId,
        toAccountId: toId,
        note: note.trim() || (payingCard ? 'Card payment' : undefined),
        date,
      })
    ).then((result) => {
      if (!result.error) {
        setAmount('');
        setNote('');
        setDate(filterDate || getTodayString());
        setMessage(
          payingCard
            ? `Paid ${formatINR(value)} toward ${toAccount?.name}`
            : `Moved ${formatINR(value)} · ${fromAccount?.name} → ${toAccount?.name}`
        );
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Transfer failed.');
      }
    });
  };

  if (accounts.length < 2) return null;

  const successMessage =
    message.includes('Moved') ||
    message.includes('Paid') ||
    message.includes('updated') ||
    message.includes('removed');

  return (
    <div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="transfer-from">
              From
            </label>
            <select
              id="transfer-from"
              className="input"
              value={fromId}
              onChange={(e) => {
                setFromId(e.target.value);
                setMessage('');
              }}
              disabled={Boolean(editingId)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {formatAccountOptionLabel(account)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-md border border-edge/60 bg-transparent text-muted hover:text-[#f0f4f2]"
            onClick={handleSwap}
            aria-label="Swap accounts"
            disabled={Boolean(editingId)}
          >
            ⇄
          </button>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="transfer-to">
              {isCreditAccount(toAccount) ? 'Pay card' : 'To'}
            </label>
            <select
              id="transfer-to"
              className="input"
              value={toId}
              onChange={(e) => {
                setToId(e.target.value);
                setMessage('');
              }}
              disabled={Boolean(editingId)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {formatAccountOptionLabel(account)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isCreditAccount(toAccount) && (
          <p className="m-0 text-xs text-muted">
            Paying {toAccount.name} reduces outstanding. This is not a new expense.
          </p>
        )}

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
          aria-label="Transfer amount"
          disabled={Boolean(editingId)}
        />

        <input
          className="input"
          type="date"
          max={getTodayString()}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setMessage('');
          }}
          aria-label="Transfer date"
          disabled={Boolean(editingId)}
        />

        <input
          className="input"
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Transfer note"
          disabled={Boolean(editingId)}
        />

        <button type="submit" className="btn-outline btn-full" disabled={saving || editingId}>
          {saving && !editingId ? 'Moving…' : 'Transfer'}
        </button>
      </form>

      {transferEntries.length > 0 && (
        <ul className="m-0 mt-4 list-none space-y-1 border-t border-edge/50 p-0 pt-3">
          {transferEntries.map((entry) => {
            const isEditing = editingId === entry.id;
            const fromName = getAccountById(accounts, entry.fromAccountId)?.name || 'Bank';
            const toName = getAccountById(accounts, entry.toAccountId)?.name || 'Bank';
            const entryDay = resolveLedgerDayKey(entry);

            return (
              <li key={entry.id} className="rounded-sm py-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="input py-2 text-sm"
                        value={editFromId}
                        onChange={(e) => setEditFromId(e.target.value)}
                        aria-label="Edit from bank"
                      >
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            From {formatAccountOptionLabel(account)}
                          </option>
                        ))}
                      </select>
                      <select
                        className="input py-2 text-sm"
                        value={editToId}
                        onChange={(e) => setEditToId(e.target.value)}
                        aria-label="Edit to bank"
                      >
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            To {formatAccountOptionLabel(account)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      className="input py-2 text-sm"
                      type="number"
                      min="1"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      aria-label="Edit transfer amount"
                      autoFocus
                    />
                    <input
                      className="input py-2 text-sm"
                      type="date"
                      max={getTodayString()}
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      aria-label="Edit transfer date"
                    />
                    <input
                      className="input py-2 text-sm"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Note"
                      aria-label="Edit transfer note"
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
                        disabled={
                          saving ||
                          !(Number(editAmount) >= 1) ||
                          !editDate ||
                          !editFromId ||
                          !editToId ||
                          editFromId === editToId
                        }
                      >
                        {saving ? '…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-medium">
                        {fromName} → {toName}
                      </p>
                      <p className="m-0 text-xs text-muted">
                        {entryDay ? dayjs(entryDay).format('D MMM') : monthLabel}
                        {entry.note && entry.note !== 'Transfer' ? ` · ${entry.note}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${ledgerAmountClass('transfer')}`}>
                      ↔{formatINR(entry.amount)}
                    </span>
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-sm text-muted hover:bg-primary/10 hover:text-primary"
                      disabled={saving || editingId !== null}
                      onClick={() => startEdit(entry)}
                      aria-label={`Edit transfer ${fromName} to ${toName}`}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-lg text-muted hover:bg-danger/10 hover:text-danger"
                      disabled={saving || editingId !== null}
                      onClick={() => handleDelete(entry)}
                      aria-label={`Remove transfer ${fromName} to ${toName}`}
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
        <p className={`mb-0 mt-2 text-sm ${successMessage ? 'text-success' : 'text-danger'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
