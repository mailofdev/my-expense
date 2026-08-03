import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import { getAccountById, getDefaultAccountId } from '../utils/accounts';
import {
  addWalletFunds,
  updateWalletCredit,
  removeWalletCredit,
  selectFilterMonthKey,
  selectFilteredMonthLabel,
  selectMonthIncome,
  selectMonthIncomeEntries,
  selectMonthWalletFunded,
  selectIsFilterCurrentMonth,
  selectAccounts,
} from '../store/dashboardSlice';

const SOURCES = ['Salary', 'Freelance', 'Other'];

const resolveSourceType = (note) => {
  if (SOURCES.includes(note)) return note;
  return 'Other';
};

export default function AddIncomeForm() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving } = useSelector((state) => state.dashboard);
  const accounts = useSelector(selectAccounts);
  const monthKey = useSelector(selectFilterMonthKey);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const monthIncome = useSelector(selectMonthIncome);
  const monthFunded = useSelector(selectMonthWalletFunded);
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);
  const incomeEntries = useSelector(selectMonthIncomeEntries);

  const defaultAccountId = getDefaultAccountId(accounts);
  const salaryAccountId =
    accounts.find((a) => a.kind === 'salary')?.id || defaultAccountId;

  const [amount, setAmount] = useState('');
  const [sourceType, setSourceType] = useState('Salary');
  const [customSource, setCustomSource] = useState('');
  const [accountId, setAccountId] = useState(salaryAccountId);
  const [message, setMessage] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editSourceType, setEditSourceType] = useState('Salary');
  const [editCustomSource, setEditCustomSource] = useState('');
  const [editAccountId, setEditAccountId] = useState(salaryAccountId);

  useEffect(() => {
    setAccountId((prev) => {
      if (accounts.some((a) => a.id === prev)) return prev;
      return salaryAccountId;
    });
  }, [accounts, salaryAccountId]);

  const isOther = sourceType === 'Other';
  const resolvedSource = isOther ? customSource.trim() : sourceType;
  const submitLabel = resolvedSource
    ? `Add ${resolvedSource.toLowerCase()}`
    : 'Add income';

  const editIsOther = editSourceType === 'Other';
  const editResolvedSource = editIsOther ? editCustomSource.trim() : editSourceType;

  const handleSourceChange = (item) => {
    setSourceType(item);
    setMessage('');
    if (item === 'Salary') {
      setAccountId(salaryAccountId);
    }
  };

  const startEdit = (entry) => {
    const note = entry.note || 'Salary';
    const type = resolveSourceType(note);
    setEditingId(entry.id);
    setEditAmount(String(entry.amount));
    setEditSourceType(type);
    setEditCustomSource(type === 'Other' ? note : '');
    setEditAccountId(entry.accountId || defaultAccountId);
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditSourceType('Salary');
    setEditCustomSource('');
    setEditAccountId(salaryAccountId);
  };

  const handleSaveEdit = (entry) => {
    const value = Number(editAmount);
    if (!value || value < 1) {
      setMessage('Enter at least ₹1.');
      return;
    }
    if (editIsOther && !editResolvedSource) {
      setMessage('Enter a source name.');
      return;
    }

    dispatch(
      updateWalletCredit({
        uid: user.uid,
        txId: entry.id,
        amount: value,
        note: editResolvedSource,
        accountId: editAccountId || defaultAccountId,
      })
    ).then((result) => {
      if (!result.error) {
        cancelEdit();
        setMessage('Income updated.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not update income.');
      }
    });
  };

  const handleDelete = (entry) => {
    const label = entry.note || 'Income';
    const proceed = window.confirm(
      `Remove ${label} (${formatINR(entry.amount)})?\n\nThis also reduces this month’s wallet funding.`
    );
    if (!proceed) return;

    if (editingId === entry.id) cancelEdit();
    dispatch(removeWalletCredit({ uid: user.uid, txId: entry.id })).then((result) => {
      if (!result.error) {
        setMessage('Income removed.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not remove income.');
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
    if (isOther && !resolvedSource) {
      setMessage('Enter a source name.');
      return;
    }

    dispatch(
      addWalletFunds({
        uid: user.uid,
        amount: value,
        note: resolvedSource,
        monthKey,
        source: 'income',
        accountId: accountId || defaultAccountId,
      })
    ).then((result) => {
      if (!result.error) {
        setAmount('');
        if (isOther) setCustomSource('');
        const accountName = accounts.find((a) => a.id === accountId)?.name || 'account';
        setMessage(`+${formatINR(value)} → ${accountName}`);
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not add income.');
      }
    });
  };

  const canSaveEdit =
    Number(editAmount) >= 1 &&
    (!editIsOther || Boolean(editResolvedSource));

  return (
    <section className="card">
      <h2 className="card-title mb-1">Add income</h2>
      <p className="card-desc mb-3">
        {monthLabel}
        {monthIncome > 0 ? ` · ${formatINR(monthIncome)} in` : ''}
        {!monthFunded ? ' · funds your spend wallet' : ''}
      </p>

      {!isCurrentMonth && (
        <p className="mb-3 mt-0 text-xs text-muted">Applies to {monthLabel}.</p>
      )}

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                sourceType === item
                  ? 'border-primary bg-primary/15 text-[#f0f4f2]'
                  : 'border-edge/60 bg-transparent text-muted hover:text-[#f0f4f2]'
              }`}
              onClick={() => handleSourceChange(item)}
              aria-pressed={sourceType === item}
            >
              {item}
            </button>
          ))}
        </div>

        {isOther && (
          <input
            className="input"
            type="text"
            value={customSource}
            onChange={(e) => {
              setCustomSource(e.target.value);
              setMessage('');
            }}
            placeholder="e.g. Gift, Bonus, Rent back"
            aria-label="Custom income source"
            autoFocus
          />
        )}

        <select
          className="input"
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
            setMessage('');
          }}
          aria-label="Deposit to account"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              Into {account.name}
            </option>
          ))}
        </select>

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
          aria-label="Income amount"
        />

        <button type="submit" className="btn-primary btn-full" disabled={saving || editingId}>
          {saving && !editingId ? 'Adding…' : submitLabel}
        </button>
      </form>

      {incomeEntries.length > 0 && (
        <div className="mt-4 border-t border-edge/50 pt-3">
          <p className="mb-2 mt-0 text-xs font-semibold uppercase tracking-wide text-muted">
            This month’s income
          </p>
          <ul className="m-0 list-none space-y-1 p-0">
            {incomeEntries.map((entry) => {
              const isEditing = editingId === entry.id;
              const accountName = getAccountById(
                accounts,
                entry.accountId || defaultAccountId
              )?.name;

              return (
                <li key={entry.id} className="rounded-sm py-2.5">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {SOURCES.map((item) => (
                          <button
                            key={item}
                            type="button"
                            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                              editSourceType === item
                                ? 'border-primary bg-primary/15 text-[#f0f4f2]'
                                : 'border-edge/60 bg-transparent text-muted'
                            }`}
                            onClick={() => {
                              setEditSourceType(item);
                              if (item === 'Salary') setEditAccountId(salaryAccountId);
                              setMessage('');
                            }}
                            aria-pressed={editSourceType === item}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                      {editIsOther && (
                        <input
                          className="input py-2 text-sm"
                          value={editCustomSource}
                          onChange={(e) => {
                            setEditCustomSource(e.target.value);
                            setMessage('');
                          }}
                          placeholder="Source name"
                          aria-label="Edit income source"
                          autoFocus
                        />
                      )}
                      <select
                        className="input py-2 text-sm"
                        value={editAccountId}
                        onChange={(e) => setEditAccountId(e.target.value)}
                        aria-label="Edit deposit account"
                      >
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            Into {account.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input py-2 text-sm"
                        type="number"
                        min="1"
                        value={editAmount}
                        onChange={(e) => {
                          setEditAmount(e.target.value);
                          setMessage('');
                        }}
                        aria-label="Edit income amount"
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
                          disabled={saving || !canSaveEdit}
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
                          {entry.createdAt
                            ? dayjs(entry.createdAt).format('D MMM')
                            : monthLabel}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-success">
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
        </div>
      )}

      {message && (
        <p
          className={`mb-0 mt-2 text-sm ${
            message.startsWith('Could') || message.startsWith('Enter')
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
