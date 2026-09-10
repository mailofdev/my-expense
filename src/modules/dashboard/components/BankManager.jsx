import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ACCOUNT_KIND_OPTIONS,
  MAX_ACCOUNTS,
  accountKindLabel,
  createAccountId,
} from '../utils/accounts';
import { updateFinanceSettings, selectAccounts } from '../store/dashboardSlice';

/** Add, rename, or remove banks and cards. */
export default function BankManager() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const accounts = useSelector(selectAccounts);
  const { accountOpenings, saving } = useSelector((state) => state.dashboard);

  const [rows, setRows] = useState([]);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState('other');
  const [newCreditLimit, setNewCreditLimit] = useState('');
  const [newDueDay, setNewDueDay] = useState('');
  const [newOpening, setNewOpening] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setRows(
      accounts.map((account) => ({
        id: account.id,
        name: account.name,
        kind: account.kind || 'other',
        creditLimit: account.creditLimit || '',
        dueDay: account.dueDay || '',
      }))
    );
  }, [accounts]);

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setMessage('');
  };

  const removeRow = (id) => {
    if (rows.length <= 1) {
      setMessage('Keep at least one account.');
      return;
    }
    const removed = rows.find((row) => row.id === id);
    const keepName = rows.find((row) => row.id !== id)?.name || 'another account';
    const proceed = window.confirm(
      `Remove ${removed?.name || 'this account'}?\n\nPast expenses and income on it will count under ${keepName}.`
    );
    if (!proceed) return;
    const nextRows = rows.filter((row) => row.id !== id);
    setRows(nextRows);
    persistRows(nextRows, undefined, 'Account removed.');
  };

  const persistRows = (sourceRows, openingsOverride, successMessage = 'Accounts saved.') => {
    const cleaned = [];
    const seen = new Set();

    for (const row of sourceRows) {
      const name = row.name.trim();
      if (!name) {
        setMessage('Every account needs a name.');
        return;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
        setMessage('Account names must be unique.');
        return;
      }
      seen.add(key);

      const kind = row.kind || 'other';
      const entry = { id: row.id, name, kind };
      if (kind === 'credit') {
        const limit = Number(row.creditLimit);
        if (!limit || limit < 1) {
          setMessage(`Set a credit limit for ${name}.`);
          return;
        }
        entry.creditLimit = limit;
        const due = Number(row.dueDay);
        entry.dueDay = due >= 1 && due <= 31 ? due : null;
      }
      cleaned.push(entry);
    }

    if (!cleaned.length) {
      setMessage('Add at least one account.');
      return;
    }

    const openings = { ...(openingsOverride || {}) };
    cleaned.forEach((account) => {
      if (openings[account.id] === undefined) {
        openings[account.id] = Number(accountOpenings?.[account.id]) || 0;
      }
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
      setMessage('Enter a name.');
      return;
    }
    if (rows.length >= MAX_ACCOUNTS) {
      setMessage(`You can add up to ${MAX_ACCOUNTS} accounts.`);
      return;
    }
    if (rows.some((row) => row.name.trim().toLowerCase() === name.toLowerCase())) {
      setMessage('That name already exists.');
      return;
    }
    if (newKind === 'credit') {
      const limit = Number(newCreditLimit);
      if (!limit || limit < 1) {
        setMessage('Enter a credit limit.');
        return;
      }
    }

    const id = createAccountId();
    const entry = {
      id,
      name,
      kind: newKind,
      creditLimit: newKind === 'credit' ? newCreditLimit : '',
      dueDay: newKind === 'credit' ? newDueDay : '',
    };
    const nextRows = [...rows, entry];
    const openingValue = Number(newOpening);
    const openingsOverride = {
      ...Object.fromEntries(
        nextRows.map((row) => [row.id, Number(accountOpenings?.[row.id]) || 0])
      ),
      [id]: Number.isFinite(openingValue) && openingValue > 0 ? openingValue : 0,
    };

    setRows(nextRows);
    setNewName('');
    setNewKind('other');
    setNewCreditLimit('');
    setNewDueDay('');
    setNewOpening('');
    persistRows(
      nextRows,
      openingsOverride,
      newKind === 'credit' ? 'Credit card added.' : newKind === 'debit' ? 'Debit card added.' : 'Bank added.'
    );
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
            Add a bank or card. Pay a credit card with Transfer.
          </p>

          <form className="space-y-3" onSubmit={handleSave}>
            {rows.map((row) => (
              <div
                key={row.id}
                className="space-y-2 rounded-sm border border-edge/50 bg-surface-2/30 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <input
                    className="input py-2 text-sm"
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    placeholder="Account name"
                    aria-label={`Name ${row.name}`}
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted">{accountKindLabel(row.kind)}</span>
                  {row.kind === 'credit' && (
                    <>
                      <label className="flex min-w-[7rem] flex-1 flex-col text-xs text-muted">
                        Limit
                        <input
                          className="input mt-0.5 py-1.5 text-sm"
                          type="number"
                          min="1"
                          step="1"
                          value={row.creditLimit}
                          onChange={(e) => updateRow(row.id, { creditLimit: e.target.value })}
                          aria-label={`Credit limit ${row.name}`}
                        />
                      </label>
                      <label className="flex w-20 flex-col text-xs text-muted">
                        Due day
                        <input
                          className="input mt-0.5 py-1.5 text-sm"
                          type="number"
                          min="1"
                          max="31"
                          value={row.dueDay}
                          onChange={(e) => updateRow(row.id, { dueDay: e.target.value })}
                          aria-label={`Due day ${row.name}`}
                          placeholder="—"
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            ))}
            <button type="submit" className="btn-outline btn-full btn-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          <form className="space-y-2 border-t border-edge/40 pt-3" onSubmit={handleAdd}>
            <p className="m-0 text-xs font-semibold text-[#f0f4f2]">Add account</p>
            <input
              className="input py-2 text-sm"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setMessage('');
              }}
              placeholder="Name · e.g. HDFC Debit"
              aria-label="New account name"
            />
            <select
              className="input py-2 text-sm"
              value={newKind}
              onChange={(e) => {
                setNewKind(e.target.value);
                setMessage('');
              }}
              aria-label="Account type"
            >
              {ACCOUNT_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {newKind === 'credit' ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="label m-0 text-xs">
                  Credit limit
                  <input
                    className="input mt-1 py-2 text-sm"
                    type="number"
                    min="1"
                    step="1"
                    value={newCreditLimit}
                    onChange={(e) => setNewCreditLimit(e.target.value)}
                    placeholder="150000"
                  />
                </label>
                <label className="label m-0 text-xs">
                  Due day (optional)
                  <input
                    className="input mt-1 py-2 text-sm"
                    type="number"
                    min="1"
                    max="31"
                    value={newDueDay}
                    onChange={(e) => setNewDueDay(e.target.value)}
                    placeholder="15"
                  />
                </label>
                <label className="label m-0 col-span-2 text-xs">
                  Starting outstanding (optional)
                  <input
                    className="input mt-1 py-2 text-sm"
                    type="number"
                    min="0"
                    step="1"
                    value={newOpening}
                    onChange={(e) => setNewOpening(e.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>
            ) : (
              <label className="label m-0 text-xs">
                Starting balance (optional)
                <input
                  className="input mt-1 py-2 text-sm"
                  type="number"
                  min="0"
                  step="1"
                  value={newOpening}
                  onChange={(e) => setNewOpening(e.target.value)}
                  placeholder="0"
                />
              </label>
            )}
            <button
              type="submit"
              className="btn-outline btn-full btn-sm"
              disabled={saving || rows.length >= MAX_ACCOUNTS}
            >
              {newKind === 'credit'
                ? 'Add credit card'
                : newKind === 'debit'
                  ? 'Add debit card'
                  : 'Add bank'}
            </button>
          </form>

          {message && (
            <p
              className={`m-0 text-xs ${
                message.endsWith('.') &&
                !message.startsWith('Could') &&
                !message.startsWith('Enter') &&
                !message.startsWith('Keep') &&
                !message.startsWith('That') &&
                !message.startsWith('Set') &&
                !message.startsWith('Every') &&
                !message.startsWith('Add at') &&
                !message.startsWith('You can')
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
