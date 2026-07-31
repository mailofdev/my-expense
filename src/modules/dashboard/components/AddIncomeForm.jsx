import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  addWalletFunds,
  selectFilterMonthKey,
  selectFilteredMonthLabel,
  selectMonthIncome,
  selectMonthWalletFunded,
  selectIsFilterCurrentMonth,
} from '../store/dashboardSlice';

const SOURCES = ['Salary', 'Freelance', 'Other'];

export default function AddIncomeForm() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving } = useSelector((state) => state.dashboard);
  const monthKey = useSelector(selectFilterMonthKey);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const monthIncome = useSelector(selectMonthIncome);
  const monthFunded = useSelector(selectMonthWalletFunded);
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Salary');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('');
    const value = Number(amount);
    if (!value || value < 1) {
      setMessage('Enter at least ₹1.');
      return;
    }

    dispatch(
      addWalletFunds({
        uid: user.uid,
        amount: value,
        note: source,
        monthKey,
        source: 'income',
      })
    ).then((result) => {
      if (!result.error) {
        setAmount('');
        setMessage(`+${formatINR(value)} added`);
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not add income.');
      }
    });
  };

  return (
    <section className="card">
      <h2 className="card-title mb-1">Add income</h2>
      <p className="card-desc mb-3">
        {monthLabel}
        {monthIncome > 0 ? ` · ${formatINR(monthIncome)} in` : ''}
        {!monthFunded ? ' · funds your wallet' : ''}
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
                source === item
                  ? 'border-primary bg-primary/15 text-[#f0f4f2]'
                  : 'border-edge/60 bg-transparent text-muted hover:text-[#f0f4f2]'
              }`}
              onClick={() => setSource(item)}
              aria-pressed={source === item}
            >
              {item}
            </button>
          ))}
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
          aria-label="Income amount"
        />

        <button type="submit" className="btn-primary btn-full" disabled={saving}>
          {saving ? 'Adding…' : `Add ${source.toLowerCase()}`}
        </button>
      </form>

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
