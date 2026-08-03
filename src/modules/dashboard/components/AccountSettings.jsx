import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  MAX_ACCOUNTS,
  createAccountId,
  openingsForDesiredBalances,
} from '../utils/accounts';
import { updateFinanceSettings, selectAccountsWithBalances } from '../store/dashboardSlice';

/**
 * Manage banks: name + current amount. Save writes accounts + openings
 * so live balances match what you enter.
 */
export default function AccountSettings() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { expenses, walletTransactions, saving } = useSelector((state) => state.dashboard);
  const { accounts: liveAccounts } = useSelector(selectAccountsWithBalances);

  const [rows, setRows] = useState([]);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setRows(
      liveAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        kind: account.kind || 'other',
        amount: String(Math.round(account.balance)),
      }))
    );
  }, [liveAccounts]);

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setMessage('');
  };

  const removeRow = (id) => {
    if (rows.length <= 1) {
      setMessage('Keep at least one bank.');
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== id));
    setMessage('');
  };

  const handleAdd = (e) => {
    e.preventDefault();
    setMessage('');
    const name = newName.trim();
    if (!name) {
      setMessage('Enter a bank name.');
      return;
    }
    if (rows.length >= MAX_ACCOUNTS) {
      setMessage(`You can add up to ${MAX_ACCOUNTS} banks.`);
      return;
    }
    const amount = newAmount === '' ? 0 : Number(newAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setMessage('Enter a valid amount.');
      return;
    }
    const lower = name.toLowerCase();
    if (rows.some((row) => row.name.trim().toLowerCase() === lower)) {
      setMessage('That bank name already exists.');
      return;
    }

    const nextRows = [
      ...rows,
      {
        id: createAccountId(),
        name,
        kind: 'other',
        amount: String(Math.round(amount)),
      },
    ];
    setRows(nextRows);
    setNewName('');
    setNewAmount('');
    persistRows(nextRows, 'Bank added.');
  };

  const persistRows = (sourceRows, successMessage = 'Banks saved.') => {
    const cleaned = [];
    const desiredById = {};
    const seen = new Set();

    for (const row of sourceRows) {
      const name = row.name.trim();
      if (!name) {
        setMessage('Every bank needs a name.');
        return;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
        setMessage('Bank names must be unique.');
        return;
      }
      seen.add(key);
      const amount = row.amount === '' ? 0 : Number(row.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        setMessage('Enter valid amounts.');
        return;
      }
      cleaned.push({
        id: row.id,
        name,
        kind: row.kind || 'other',
      });
      desiredById[row.id] = amount;
    }

    if (!cleaned.length) {
      setMessage('Add at least one bank.');
      return;
    }

    const accountOpenings = openingsForDesiredBalances({
      accounts: cleaned,
      expenses,
      walletTransactions,
      desiredById,
    });

    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: { accounts: cleaned, accountOpenings },
      })
    ).then((result) => {
      if (!result.error) {
        setMessage(successMessage);
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not save.');
      }
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    setMessage('');
    persistRows(rows);
  };

  return (
    <section className="card">
      <h2 className="card-title mb-1">Banks</h2>
      <p className="card-desc mb-3">
        Add each bank with its current balance. Income, expenses, and transfers update these
        amounts.
      </p>

      <form className="space-y-3" onSubmit={handleSave}>
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-end gap-2 border-b border-edge/40 pb-3 last:border-0"
          >
            <div className="min-w-[8rem] flex-1">
              <label className="mb-1 block text-xs text-muted" htmlFor={`bank-name-${row.id}`}>
                Bank name
              </label>
              <input
                id={`bank-name-${row.id}`}
                className="input"
                type="text"
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
                placeholder="e.g. HDFC Salary"
              />
            </div>
            <div className="w-[7.5rem]">
              <label className="mb-1 block text-xs text-muted" htmlFor={`bank-amt-${row.id}`}>
                Amount ₹
              </label>
              <input
                id={`bank-amt-${row.id}`}
                className="input"
                type="number"
                min="0"
                inputMode="numeric"
                value={row.amount}
                onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <button
              type="button"
              className="btn-outline btn-sm shrink-0"
              onClick={() => removeRow(row.id)}
              disabled={rows.length <= 1 || saving}
              aria-label={`Remove ${row.name}`}
            >
              Remove
            </button>
          </div>
        ))}

        <button type="submit" className="btn-primary btn-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save banks'}
        </button>
      </form>

      <form className="mt-4 space-y-3 border-t border-edge/50 pt-4" onSubmit={handleAdd}>
        <p className="m-0 text-sm font-medium">Add bank</p>
        <input
          className="input"
          type="text"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setMessage('');
          }}
          placeholder="Bank name"
          aria-label="New bank name"
        />
        <input
          className="input"
          type="number"
          min="0"
          inputMode="numeric"
          value={newAmount}
          onChange={(e) => {
            setNewAmount(e.target.value);
            setMessage('');
          }}
          placeholder="Amount ₹"
          aria-label="New bank amount"
        />
        <button
          type="submit"
          className="btn-outline btn-full"
          disabled={saving || rows.length >= MAX_ACCOUNTS}
        >
          {saving ? 'Saving…' : 'Save bank'}
        </button>
        <p className="m-0 text-xs text-muted">Up to {MAX_ACCOUNTS} banks.</p>
      </form>

      {message && (
        <p
          className={`mb-0 mt-3 text-sm ${
            message === 'Banks saved.' || message === 'Bank added.'
              ? 'text-success'
              : 'text-danger'
          }`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
