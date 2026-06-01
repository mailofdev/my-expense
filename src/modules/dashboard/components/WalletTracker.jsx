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
      <section className="card py-8 text-center">
        <span className="text-xs uppercase tracking-wider text-muted">Current Wallet Balance</span>
        <strong className="text-glow my-2 block text-[clamp(1.75rem,8vw,2.25rem)] text-primary">
          {formatINR(walletBalance)}
        </strong>
        <p className="m-0 text-sm text-muted">Add money when salary arrives or you receive refunds</p>
      </section>

      <section className="card">
        <h3 className="card-title">Add Money to Wallet</h3>
        <form
          className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={handleSubmit(onAddFunds)}
        >
          <input
            className="input"
            type="number"
            placeholder="Amount (₹)"
            min="1"
            {...register('amount', { required: 'Amount required', min: { value: 1, message: 'Min ₹1' } })}
          />
          <input className="input" placeholder="Note (e.g. Salary)" {...register('note')} />
          <button type="submit" className="btn-primary md:px-6" disabled={saving}>
            {saving ? 'Adding...' : 'Add Funds'}
          </button>
        </form>
        {errors.amount && <p className="mt-2 text-xs text-red-300">{errors.amount.message}</p>}
      </section>

      <section className="card">
        <h3 className="card-title">Wallet Activity</h3>
        {recentActivity.length === 0 ? (
          <p className="empty-state">No activity yet. Add funds or log an expense.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {recentActivity.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 border-b border-edge py-3 last:border-0"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    item.type === 'credit'
                      ? 'bg-success/20 text-success'
                      : 'bg-danger/20 text-danger'
                  }`}
                >
                  {item.type === 'credit' ? '+' : '−'}
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{item.label}</strong>
                  <span className="text-xs text-muted">{dayjs(item.date).format('D MMM YYYY')}</span>
                </div>
                <span
                  className={`shrink-0 font-semibold ${
                    item.type === 'credit' ? 'text-success' : 'text-danger'
                  }`}
                >
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
