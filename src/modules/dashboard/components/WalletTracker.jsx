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
      label: tx.note || 'Added money',
      date: tx.createdAt,
    })),
    ...expenses.slice(0, 8).map((e) => ({
      id: `exp-${e.id}`,
      type: 'debit',
      amount: e.amount,
      label: e.title,
      date: e.date,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12);

  return (
    <div className="feature-panel">
      <section className="card text-center">
        <p className="section-label m-0">Wallet balance</p>
        <p className="text-glow m-0 mt-1 text-[clamp(1.75rem,8vw,2.5rem)] font-bold text-primary">
          {formatINR(walletBalance)}
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">Add money</h2>
        <form className="space-y-3" onSubmit={handleSubmit(onAddFunds)}>
          <input
            className="input"
            type="number"
            placeholder="Amount (₹)"
            min="1"
            {...register('amount', { required: 'Enter amount', min: { value: 1, message: 'Min ₹1' } })}
          />
          <input className="input" placeholder="Note (optional)" {...register('note')} />
          <button type="submit" className="btn-primary btn-full" disabled={saving}>
            {saving ? 'Adding…' : 'Add to wallet'}
          </button>
        </form>
        {errors.amount && <p className="mt-2 text-xs text-red-300">{errors.amount.message}</p>}
      </section>

      {recentActivity.length > 0 && (
        <section className="card">
          <h2 className="card-title">Recent</h2>
          <ul className="m-0 list-none space-y-0 p-0">
            {recentActivity.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 border-t border-edge/60 py-3 first:border-0 first:pt-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm">{item.label}</p>
                  <p className="m-0 text-xs text-muted">{dayjs(item.date).format('D MMM')}</p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    item.type === 'credit' ? 'text-success' : 'text-[#f0f4f2]'
                  }`}
                >
                  {item.type === 'credit' ? '+' : '−'}
                  {formatINR(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
