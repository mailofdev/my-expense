import { useDispatch, useSelector } from 'react-redux';
import { formatINR, formatINRCompact } from '../../../core/utils/currency';
import {
  selectDayTotal,
  selectFilteredDayLabel,
  selectIsTodaySelected,
  selectInAppReminders,
  selectMonthWalletRemaining,
  selectMonthWalletFunded,
  selectMonthWalletUsagePercent,
  selectFilteredMonthLabel,
  selectTotalSpent,
  selectMonthSavingsSnapshot,
  applyDueRecurringExpenses,
  selectDueRecurringExpenses,
} from '../store/dashboardSlice';

export default function OverviewHero({ onTabChange }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving } = useSelector((state) => state.dashboard);
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const isToday = useSelector(selectIsTodaySelected);
  const walletRemaining = useSelector(selectMonthWalletRemaining);
  const walletFunded = useSelector(selectMonthWalletFunded);
  const walletUsagePercent = useSelector(selectMonthWalletUsagePercent);
  const monthSpent = useSelector(selectTotalSpent);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const savings = useSelector(selectMonthSavingsSnapshot);
  const reminders = useSelector(selectInAppReminders).slice(0, 2);
  const dueRecurring = useSelector(selectDueRecurringExpenses);

  const walletBarPercent = walletFunded > 0 ? Math.min(100, walletUsagePercent) : 0;

  const handleLogRecurring = () => {
    if (!dueRecurring.length || !user?.uid) return;
    const total = dueRecurring.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const names = dueRecurring.map((item) => item.title).join(', ');
    const proceed = window.confirm(
      `Log ${dueRecurring.length} due bill${dueRecurring.length > 1 ? 's' : ''} today?\n\n${names}\nTotal: ${formatINR(total)}`
    );
    if (!proceed) return;
    dispatch(applyDueRecurringExpenses({ uid: user.uid }));
  };

  const handleReminderClick = (reminder) => {
    if (reminder.action === 'wallet' && onTabChange) {
      onTabChange('wallet');
      return;
    }
    if (reminder.action === 'log-recurring') {
      handleLogRecurring();
      return;
    }
    if (reminder.action === 'settings' && onTabChange) {
      onTabChange('settings');
    }
  };

  return (
    <section className="px-0.5">
      <p className="section-label m-0">{isToday ? 'Today' : dayLabel}</p>
      <p className="text-glow m-0 text-[clamp(2.25rem,10vw,3rem)] font-bold leading-none tracking-tight text-primary">
        {formatINR(dayTotal)}
      </p>

      <div className="mt-4 space-y-2">
        <div className="rounded-lg bg-surface-2/40 px-3 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="m-0 text-xs text-muted">Wallet</p>
            {walletFunded > 0 ? (
              <p
                className={`m-0 text-sm font-semibold ${
                  walletRemaining < 0 ? 'text-danger' : 'text-[#f0f4f2]'
                }`}
              >
                {formatINRCompact(walletRemaining)} left
              </p>
            ) : (
              <button
                type="button"
                className="border-0 bg-transparent p-0 text-sm font-semibold text-primary"
                onClick={() => onTabChange?.('wallet')}
              >
                Add income
              </button>
            )}
          </div>
          {walletFunded > 0 && (
            <>
              <div className="mb-1.5 mt-2 h-1 overflow-hidden rounded-full bg-surface">
                <div
                  className={`h-full rounded-full transition-all ${
                    walletRemaining < 0
                      ? 'bg-danger'
                      : walletUsagePercent >= 80
                        ? 'bg-accent'
                        : 'bg-primary'
                  }`}
                  style={{ width: `${walletBarPercent}%` }}
                />
              </div>
              <p className="m-0 text-xs text-muted">
                {formatINRCompact(monthSpent)} / {formatINRCompact(walletFunded)}
              </p>
            </>
          )}
        </div>

        {savings.hasIncome && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2/40 px-3 py-2.5">
            <p className="m-0 text-xs text-muted">
              {monthLabel} saved
              <span className="text-muted/80"> · goal {savings.goalPercent}%</span>
            </p>
            <p
              className={`m-0 text-sm font-semibold tabular-nums ${
                savings.saved < 0
                  ? 'text-danger'
                  : savings.goalMet
                    ? 'text-success'
                    : 'text-[#f0f4f2]'
              }`}
            >
              {savings.saved < 0 ? '−' : ''}
              {formatINRCompact(Math.abs(savings.saved))}
            </p>
          </div>
        )}
      </div>

      {!!reminders.length && (
        <div className="mt-3 space-y-1.5">
          {reminders.map((reminder) =>
            reminder.action ? (
              <button
                key={reminder.id}
                type="button"
                className={`m-0 w-full rounded-md border px-3 py-2 text-left text-xs ${
                  reminder.tone === 'danger'
                    ? 'border-danger/40 bg-danger/10 text-red-200'
                    : reminder.tone === 'warning'
                      ? 'border-accent/40 bg-accent/10 text-yellow-100'
                      : 'border-edge/50 bg-surface-2/50 text-muted'
                }`}
                onClick={() => handleReminderClick(reminder)}
                disabled={reminder.action === 'log-recurring' && saving}
              >
                {reminder.text}
              </button>
            ) : (
              <p
                key={reminder.id}
                className={`m-0 rounded-md border px-3 py-2 text-xs ${
                  reminder.tone === 'danger'
                    ? 'border-danger/40 bg-danger/10 text-red-200'
                    : reminder.tone === 'warning'
                      ? 'border-accent/40 bg-accent/10 text-yellow-100'
                      : 'border-edge/50 bg-surface-2/50 text-muted'
                }`}
              >
                {reminder.text}
              </p>
            )
          )}
        </div>
      )}
    </section>
  );
}
