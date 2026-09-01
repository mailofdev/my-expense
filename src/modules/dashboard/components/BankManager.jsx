import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MAX_ACCOUNTS, createAccountId } from '../utils/accounts';
import { updateFinanceSettings, selectAccounts } from '../store/dashboardSlice';

/** Add or rename banks. Balances update automatically from income, expenses, and transfers. */
export default function BankManager() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const accounts = useSelector(selectAccounts);
  const { accountOpenings, saving } = useSelector((state) => state.dashboard);

  const [rows, setRows] = useState([]);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setRows(
      accounts.map((account) => ({
        id: account.id,
        name: account.name,
        kind: account.kind || 'other',
      }))
    );
  }, [accounts]);

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setMessage('');
  };

  const removeRow = (id) => {
    if (rows.length <= 1) {
      setMessage('Keep at least one bank.');
      return;
    }
    const removed = rows.find((row) => row.id === id);
    const keepName = rows.find((row) => row.id !== id)?.name || 'another bank';
    const proceed = window.confirm(
      `Remove ${removed?.name || 'this bank'}?\n\nPast expenses and income on it will count under ${keepName}.`
    );
    if (!proceed) return;
    const nextRows = rows.filter((row) => row.id !== id);
    setRows(nextRows);
    persistRows(nextRows, 'Bank removed.');
  };

  const persistRows = (sourceRows, successMessage = 'Banks saved.') => {
    const cleaned = [];
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
      cleaned.push({
        id: row.id,
        name,
        kind: row.kind || 'other',
      });
    }

    if (!cleaned.length) {
      setMessage('Add at least one bank.');
      return;
    }

    const openings = {};
    cleaned.forEach((account) => {
      openings[account.id] = Number(accountOpenings?.[account.id]) || 0;
    });

    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: { accounts: cleaned, accountOpenings: openings },
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
    if (rows.some((row) => row.name.trim().toLowerCase() === name.toLowerCase())) {
      setMessage('That bank name already exists.');
      return;
    }

    const nextRows = [
      ...rows,
      { id: createAccountId(), name, kind: 'other' },
    ];
    setRows(nextRows);
    setNewName('');
    persistRows(nextRows, 'Bank added.');
  };

  return (
    <div className="mt-3 border-t border-edge/50 pt-3">
      <button
        type="button"
        className="border-0 bg-transparent p-0 text-xs font-semibold text-primary"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? 'Hide' : 'Manage accounts'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="m-0 text-xs text-muted">
            Rename or add accounts. Balances update from income and expenses.
          </p>

          <form className="space-y-2" onSubmit={handleSave}>
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                <input
                  className="input py-2 text-sm"
                  type="text"
                  value={row.name}
                  onChange={(e) => updateRow(row.id, { name: e.target.value })}
                  placeholder="Bank name"
                  aria-label={`Bank name ${row.name}`}
                />
                <button
                  type="button"
                  className="btn-outline btn-sm shrink-0"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1 || saving}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="submit" className="btn-outline btn-full btn-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save names'}
            </button>
          </form>

          <form className="space-y-2 border-t border-edge/40 pt-3" onSubmit={handleAdd}>
            <input
              className="input py-2 text-sm"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setMessage('');
              }}
              placeholder="New bank name"
              aria-label="New bank name"
            />
            <button
              type="submit"
              className="btn-outline btn-full btn-sm"
              disabled={saving || rows.length >= MAX_ACCOUNTS}
            >
              Add bank
            </button>
          </form>

          {message && (
            <p
              className={`m-0 text-xs ${
                message.endsWith('.') &&
                !message.startsWith('Could') &&
                !message.startsWith('Enter') &&
                !message.startsWith('Keep') &&
                !message.startsWith('That')
                  ? 'text-success'
                  : 'text-danger'
              }`}
            >
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
