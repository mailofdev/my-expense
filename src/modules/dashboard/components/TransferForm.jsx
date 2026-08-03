import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  transferBetweenAccounts,
  selectAccountsWithBalances,
} from '../store/dashboardSlice';

export default function TransferForm() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving } = useSelector((state) => state.dashboard);
  const { accounts } = useSelector(selectAccountsWithBalances);

  const salary = accounts.find((a) => a.kind === 'salary') || accounts[0];
  const savings = accounts.find((a) => a.kind === 'savings') || accounts[1] || accounts[0];

  const [amount, setAmount] = useState('');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!accounts.length) return;
    setFromId((prev) => (accounts.some((a) => a.id === prev) ? prev : salary?.id || accounts[0].id));
    setToId((prev) =>
      accounts.some((a) => a.id === prev) ? prev : savings?.id || accounts[1]?.id || accounts[0].id
    );
  }, [accounts, salary?.id, savings?.id]);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccount = accounts.find((a) => a.id === toId);

  const handleSwap = () => {
    setFromId(toId);
    setToId(fromId);
    setMessage('');
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

    dispatch(
      transferBetweenAccounts({
        uid: user.uid,
        amount: value,
        fromAccountId: fromId,
        toAccountId: toId,
        note: note.trim() || undefined,
      })
    ).then((result) => {
      if (!result.error) {
        setAmount('');
        setNote('');
        setMessage(
          `Moved ${formatINR(value)} · ${fromAccount?.name} → ${toAccount?.name}`
        );
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Transfer failed.');
      }
    });
  };

  if (accounts.length < 2) return null;

  return (
    <section className="card">
      <h2 className="card-title mb-1">Transfer</h2>
      <p className="card-desc mb-3">
        Move money between your accounts. Does not count as income or expense.
      </p>

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
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-md border border-edge/60 bg-transparent text-muted hover:text-[#f0f4f2]"
            onClick={handleSwap}
            aria-label="Swap accounts"
          >
            ⇄
          </button>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="transfer-to">
              To
            </label>
            <select
              id="transfer-to"
              className="input"
              value={toId}
              onChange={(e) => {
                setToId(e.target.value);
                setMessage('');
              }}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
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
          aria-label="Transfer amount"
        />

        <input
          className="input"
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Transfer note"
        />

        <button type="submit" className="btn-outline btn-full" disabled={saving}>
          {saving ? 'Moving…' : 'Transfer'}
        </button>
      </form>

      {message && (
        <p
          className={`mb-0 mt-2 text-sm ${
            message.includes('Moved') ? 'text-success' : 'text-danger'
          }`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
