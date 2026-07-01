import { useSelector } from 'react-redux';
import { formatINR, formatINRCompact } from '../../../core/utils/currency';
import {
  selectDayTotal,
  selectFilteredDayLabel,
  selectIsTodaySelected,
  selectBudgetRemaining,
  selectInAppReminders,
  selectMonthWalletRemaining,
  selectMonthWalletFunded,
  selectMonthWalletUsagePercent,
  selectFilteredMonthLabel,
  selectTotalSpent,
} from '../store/dashboardSlice';

export default function OverviewHero({ onTabChange }) {
  const { monthlyBudget } = useSelector((state) => state.dashboard);
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const isToday = useSelector(selectIsTodaySelected);
  const budgetLeft = useSelector(selectBudgetRemaining);
  const walletRemaining = useSelector(selectMonthWalletRemaining);
  const walletFunded = useSelector(selectMonthWalletFunded);
  const walletUsagePercent = useSelector(selectMonthWalletUsagePercent);
  const monthSpent = useSelector(selectTotalSpent);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const reminders = useSelector(selectInAppReminders);

  const walletBarPercent = walletFunded > 0 ? Math.min(100, walletUsagePercent) : 0;

  const handleReminderClick = (reminder) => {
    if (reminder.action === 'wallet' && onTabChange) {
      onTabChange('wallet');
    }
  };

  return (
    <section className="px-1 py-2 sm:px-2">
      <p className="section-label m-0">
        {isToday ? 'Spent today' : dayLabel}
      </p>
      <p className="text-glow m-0 text-[clamp(2.25rem,10vw,3rem)] font-bold leading-none tracking-tight text-primary">
        {formatINR(dayTotal)}
      </p>

      <div className="mt-4 rounded-sm border border-edge/60 bg-surface-2/30 px-3 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="m-0 text-xs text-muted">{monthLabel} wallet</p>
          {walletFunded > 0 ? (
            <p className={`m-0 text-sm font-semibold ${walletRemaining < 0 ? 'text-danger' : 'text-[#f0f4f2]'}`}>
              {formatINRCompact(walletRemaining)} left
            </p>
          ) : (
            <p className="m-0 text-sm font-semibold text-muted">Not funded</p>
          )}
        </div>
        {walletFunded > 0 ? (
          <>
            <div className="mb-2 mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-all ${
                  walletRemaining < 0 ? 'bg-danger' : walletUsagePercent >= 80 ? 'bg-accent' : 'bg-primary'
                }`}
                style={{ width: `${walletBarPercent}%` }}
              />
            </div>
            <p className="m-0 text-xs text-muted">
              {formatINRCompact(monthSpent)} spent of {formatINRCompact(walletFunded)} funded
            </p>
          </>
        ) : (
          <p className="m-0 mt-1 text-xs text-muted">
            Not funded yet.{' '}
            {onTabChange && (
              <button
                type="button"
                className="border-0 bg-transparent p-0 font-semibold text-primary underline"
                onClick={() => onTabChange('wallet')}
              >
                Add wallet amount
              </button>
            )}
          </p>
        )}
      </div>

      {monthlyBudget > 0 && (
        <p className="mt-3 text-sm text-muted">
          Budget left{' '}
          <strong className={`font-semibold ${budgetLeft < 0 ? 'text-danger' : 'text-[#f0f4f2]'}`}>
            {formatINRCompact(Math.abs(budgetLeft))}
          </strong>
        </p>
      )}

      {!!reminders.length && (
        <div className="mt-4 space-y-2">
          {reminders.map((reminder) => (
            reminder.action ? (
              <button
                key={reminder.id}
                type="button"
                className={`m-0 w-full rounded-sm border px-3 py-2 text-left text-xs ${
                  reminder.tone === 'danger'
                    ? 'border-danger/40 bg-danger/10 text-red-200'
                    : reminder.tone === 'warning'
                      ? 'border-accent/40 bg-accent/10 text-yellow-100'
                      : 'border-edge bg-surface-2 text-muted'
                }`}
                onClick={() => handleReminderClick(reminder)}
              >
                {reminder.text}
              </button>
            ) : (
              <p
                key={reminder.id}
                className={`m-0 rounded-sm border px-3 py-2 text-xs ${
                  reminder.tone === 'danger'
                    ? 'border-danger/40 bg-danger/10 text-red-200'
                    : reminder.tone === 'warning'
                      ? 'border-accent/40 bg-accent/10 text-yellow-100'
                      : 'border-edge bg-surface-2 text-muted'
                }`}
              >
                {reminder.text}
              </p>
            )
          ))}
        </div>
      )}
    </section>
  );
}
