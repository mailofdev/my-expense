import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import { addWalletFunds } from '../store/dashboardSlice';

export default function WalletTracker() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { walletBalance, walletTransactions, saving, expenses } = useSelector(
    (state) => state.dashboard
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { amount: '', note: '' },
  });

  const onAddFunds = (data) => {
    dispatch(
      addWalletFunds({
        uid: user.uid,
        amount: Number(data.amount),
        note: data.note,
      })
    ).then((result) => {
      if (!result.error) reset();
    });
  };

  const recentActivity = [
    ...walletTransactions.map((tx) => ({
      id: `tx-${tx.id}`,
      type: tx.type,
      amount: tx.amount,
      label: tx.note || 'Wallet top-up',
      date: tx.createdAt,
    })),
    ...expenses.slice(0, 10).map((e) => ({
      id: `exp-${e.id}`,
      type: 'debit',
      amount: e.amount,
      label: e.title,
      date: e.date,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 15);

  return (
    <div className="feature-panel">
      <section className="card wallet-hero">
        <span className="wallet-hero__label">Current Wallet Balance</span>
        <strong className="wallet-hero__balance">{formatINR(walletBalance)}</strong>
        <p className="wallet-hero__hint">Add money when salary arrives or you receive refunds</p>
      </section>

      <section className="card">
        <h3>Add Money to Wallet</h3>
        <form className="inline-form" onSubmit={handleSubmit(onAddFunds)}>
          <input
            type="number"
            placeholder="Amount (₹)"
            min="1"
            {...register('amount', { required: 'Amount required', min: { value: 1, message: 'Min ₹1' } })}
          />
          <input
            placeholder="Note (e.g. Salary)"
            {...register('note')}
          />
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Adding...' : 'Add Funds'}
          </button>
        </form>
        {errors.amount && <p className="form-field__error">{errors.amount.message}</p>}
      </section>

      <section className="card">
        <h3>Wallet Activity</h3>
        {recentActivity.length === 0 ? (
          <p className="empty-state">No activity yet. Add funds or log an expense.</p>
        ) : (
          <ul className="activity-list">
            {recentActivity.map((item) => (
              <li key={item.id} className="activity-list__item">
                <span className={`activity-list__badge activity-list__badge--${item.type}`}>
                  {item.type === 'credit' ? '+' : '−'}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <span>{dayjs(item.date).format('D MMM YYYY')}</span>
                </div>
                <span className={item.type === 'credit' ? 'text-success' : 'text-danger'}>
                  {item.type === 'credit' ? '+' : '−'}
                  {formatINR(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
