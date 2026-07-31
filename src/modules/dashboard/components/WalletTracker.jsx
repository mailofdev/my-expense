import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import { isInMonthYear } from '../../../core/utils/date';
import AddIncomeForm from './AddIncomeForm';
import {
  addWalletFunds,
  selectFilterMonthKey,
  selectFilteredMonthLabel,
  selectMonthWalletFunded,
  selectMonthWalletRemaining,
  selectMonthWalletUsagePercent,
  selectMonthExpenses,
  selectMonthIncome,
} from '../store/dashboardSlice';

export default function WalletTracker() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { walletTransactions, saving } = useSelector((state) => state.dashboard);
  const monthKey = useSelector(selectFilterMonthKey);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const monthFunded = useSelector(selectMonthWalletFunded);
  const monthRemaining = useSelector(selectMonthWalletRemaining);
  const walletUsagePercent = useSelector(selectMonthWalletUsagePercent);
  const monthExpenses = useSelector(selectMonthExpenses);
  const monthIncome = useSelector(selectMonthIncome);
  const monthSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const filter = useSelector((state) => ({
    month: state.dashboard.filterMonth,
    year: state.dashboard.filterYear,
  }));

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { amount: '', note: '' },
  });

  const onAddFunds = (data) => {
    dispatch(
      addWalletFunds({
        uid: user.uid,
        amount: Number(data.amount),
        note: data.note?.trim() || 'Top-up',
        monthKey,
        source: 'manual',
      })
    ).then((result) => {
      if (!result.error) reset({ amount: '', note: '' });
    });
  };

  const monthTransactions = walletTransactions.filter(
    (tx) =>
      tx.monthKey === monthKey ||
      (!tx.monthKey && isInMonthYear(tx.createdAt?.slice(0, 10), filter.month, filter.year))
  );

  const recentActivity = [
    ...monthTransactions.map((tx) => ({
      id: `tx-${tx.id}`,
      type: tx.type,
      amount: tx.amount,
      label: tx.source === 'income' ? tx.note || 'Income' : tx.note || 'Top-up',
      date: tx.createdAt,
    })),
    ...monthExpenses.slice(0, 8).map((e) => ({
      id: `exp-${e.id}`,
      type: 'debit',
      amount: e.amount,
      label: e.title,
      date: e.date,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12);

  const barPercent = monthFunded > 0 ? Math.min(100, walletUsagePercent) : 0;

  return (
    <div className="feature-panel">
      <section className="card text-center">
        <p className="section-label m-0">{monthLabel}</p>
        <p
          className={`text-glow m-0 mt-1 text-[clamp(1.75rem,8vw,2.5rem)] font-bold ${
            monthFunded > 0 && monthRemaining < 0
              ? 'text-danger'
              : monthFunded > 0
                ? 'text-primary'
                : 'text-muted'
          }`}
        >
          {monthFunded > 0 ? formatINR(monthRemaining) : formatINR(0)}
        </p>
        <p className="m-0 mt-1 text-sm text-muted">
          {monthFunded > 0 ? 'left in wallet' : 'No funds yet'}
        </p>

        {monthFunded > 0 && (
          <div className="mx-auto mt-4 max-w-xs">
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-all ${
                  monthRemaining < 0
                    ? 'bg-danger'
                    : walletUsagePercent >= 80
                      ? 'bg-accent'
                      : 'bg-primary'
                }`}
                style={{ width: `${barPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div>
            <p className="m-0 text-xs text-muted">Income</p>
            <p className="m-0 font-semibold text-success">{formatINR(monthIncome)}</p>
          </div>
          <div>
            <p className="m-0 text-xs text-muted">Funded</p>
            <p className="m-0 font-semibold">{formatINR(monthFunded)}</p>
          </div>
          <div>
            <p className="m-0 text-xs text-muted">Spent</p>
            <p className="m-0 font-semibold">{formatINR(monthSpent)}</p>
          </div>
        </div>
      </section>

      <AddIncomeForm />

      <section className="card">
        <h2 className="card-title mb-1">Top up</h2>
        <p className="card-desc mb-3">Extra money that isn&apos;t salary.</p>
        <form className="space-y-3" onSubmit={handleSubmit(onAddFunds)}>
          <input
            className="input"
            type="number"
            placeholder="Amount ₹"
            min="1"
            {...register('amount', {
              required: 'Enter amount',
              min: { value: 1, message: 'Min ₹1' },
            })}
          />
          <input className="input" placeholder="Note (optional)" {...register('note')} />
          <button type="submit" className="btn-outline btn-full" disabled={saving}>
            {saving ? 'Adding…' : 'Add to wallet'}
          </button>
        </form>
        {errors.amount && <p className="mt-2 text-xs text-red-300">{errors.amount.message}</p>}
      </section>

      {recentActivity.length > 0 ? (
        <section className="card">
          <h2 className="card-title">Activity</h2>
          <ul className="m-0 list-none space-y-0 p-0">
            {recentActivity.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 border-t border-edge/50 py-3 first:border-0 first:pt-0"
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
      ) : (
        <p className="empty-state-sm">No activity yet.</p>
      )}
    </div>
  );
}
