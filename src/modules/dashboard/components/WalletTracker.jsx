import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import { isInMonthYear } from '../../../core/utils/date';
import {
  addWalletFunds,
  selectFilterMonthKey,
  selectFilteredMonthLabel,
  selectMonthWalletFunded,
  selectMonthWalletRemaining,
  selectMonthWalletUsagePercent,
  selectMonthExpenses,
  selectIsFilterCurrentMonth,
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
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);
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
        note: data.note,
        monthKey,
      })
    ).then((result) => {
      if (!result.error) reset();
    });
  };

  const monthTransactions = walletTransactions.filter(
    (tx) => tx.monthKey === monthKey || (!tx.monthKey && isInMonthYear(tx.createdAt?.slice(0, 10), filter.month, filter.year))
  );

  const recentActivity = [
    ...monthTransactions.map((tx) => ({
      id: `tx-${tx.id}`,
      type: tx.type,
      amount: tx.amount,
      label: tx.note || 'Added money',
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
        <p className="section-label m-0">{monthLabel} wallet</p>
        <p className={`text-glow m-0 mt-1 text-[clamp(1.75rem,8vw,2.5rem)] font-bold ${monthFunded > 0 && monthRemaining < 0 ? 'text-danger' : monthFunded > 0 ? 'text-primary' : 'text-muted'}`}>
          {monthFunded > 0 ? formatINR(monthRemaining) : formatINR(0)}
        </p>
        <p className="m-0 mt-2 text-sm text-muted">
          {monthFunded > 0 ? 'Remaining this month' : 'Add this month\'s wallet amount to start'}
        </p>

        {monthFunded > 0 && (
          <div className="mx-auto mt-4 max-w-xs">
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-all ${
                  monthRemaining < 0 ? 'bg-danger' : walletUsagePercent >= 80 ? 'bg-accent' : 'bg-primary'
                }`}
                style={{ width: `${barPercent}%` }}
              />
            </div>
            <p className="m-0 text-xs text-muted">{walletUsagePercent}% of wallet used</p>
          </div>
        )}

        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div>
            <p className="m-0 text-xs text-muted">Funded</p>
            <p className="m-0 font-semibold text-success">{formatINR(monthFunded)}</p>
          </div>
          <div>
            <p className="m-0 text-xs text-muted">Spent</p>
            <p className="m-0 font-semibold">{formatINR(monthSpent)}</p>
          </div>
        </div>

        {monthFunded === 0 && monthSpent === 0 && (
          <p className="m-0 mt-4 rounded-sm border border-edge/60 bg-surface-2/40 px-3 py-2 text-xs text-muted">
            {isCurrentMonth
              ? 'Start the month by adding your wallet amount below.'
              : `No wallet or expenses recorded for ${monthLabel}.`}
          </p>
        )}

        {monthFunded === 0 && monthSpent > 0 && (
          <p className="m-0 mt-4 rounded-sm border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-yellow-100">
            {formatINR(monthSpent)} spent without a funded wallet. Add funds to track remaining balance.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Add money for {monthLabel}</h2>
        <p className="m-0 mb-3 text-xs text-muted">
          Each month starts at ₹0. Last month&apos;s remaining balance does not carry over — add a fresh wallet amount for {monthLabel}.
          {isCurrentMonth && ' You can add more anytime during the month.'}
        </p>
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
            {saving ? 'Adding…' : monthFunded > 0 ? 'Add more' : 'Add to wallet'}
          </button>
        </form>
        {errors.amount && <p className="mt-2 text-xs text-red-300">{errors.amount.message}</p>}
      </section>

      {recentActivity.length > 0 ? (
        <section className="card">
          <h2 className="card-title">{monthLabel} activity</h2>
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
      ) : (
        <p className="empty-state-sm">No wallet activity for {monthLabel} yet.</p>
      )}
    </div>
  );
}
