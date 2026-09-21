import { useSelector } from 'react-redux';
import { formatINR, formatINRCompact } from '../../../core/utils/currency';
import {
  selectDayTotal,
  selectFilteredDayLabel,
  selectFilteredMonthLabel,
  selectIsTodaySelected,
  selectMonthWalletRemaining,
  selectMonthWalletFunded,
  selectMonthWalletUsagePercent,
  selectTotalSpent,
} from '../store/dashboardSlice';

export default function OverviewHero() {
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const isToday = useSelector(selectIsTodaySelected);
  const walletRemaining = useSelector(selectMonthWalletRemaining);
  const walletFunded = useSelector(selectMonthWalletFunded);
  const walletUsagePercent = useSelector(selectMonthWalletUsagePercent);
  const monthSpent = useSelector(selectTotalSpent);

  const walletBarPercent = walletFunded > 0 ? Math.min(100, walletUsagePercent) : 0;

  if (walletFunded <= 0) {
    return (
      <section className="relative overflow-hidden rounded-lg border border-edge bg-surface px-5 py-5">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl"
          aria-hidden="true"
        />
        <p className="relative m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
          {monthLabel}
        </p>
        <p className="relative m-0 mt-2 text-2xl font-semibold tracking-tight text-ink">
          No income yet
        </p>
        <p className="relative m-0 mt-1.5 text-sm leading-relaxed text-muted">
          Add money you received to see how much you have left this month.
        </p>
        {dayTotal > 0 && (
          <p className="relative m-0 mt-3 text-sm text-muted">
            <span className="font-semibold tabular-nums text-ink">{formatINR(dayTotal)}</span>
            {isToday ? ' spent today' : ` spent · ${dayLabel}`}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-lg border border-edge bg-surface px-5 py-6 text-center">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-40 w-56 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        aria-hidden="true"
      />
      <p className="hero-amount relative">{formatINR(dayTotal)}</p>
      <p className="relative m-0 mt-2 text-sm text-muted">
        {isToday ? 'spent today' : `spent · ${dayLabel}`}
      </p>

      <div className="relative mx-auto mt-5 max-w-xs">
        <div className="flex items-baseline justify-between gap-2">
          <p className="m-0 text-xs text-muted">This month</p>
          <p
            className={`m-0 text-sm font-semibold tabular-nums ${
              walletRemaining < 0 ? 'text-danger' : 'text-ink'
            }`}
          >
            {formatINRCompact(walletRemaining)} left
          </p>
        </div>
        <div className="mb-1.5 mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
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
          {formatINRCompact(monthSpent)} spent of {formatINRCompact(walletFunded)} income
        </p>
      </div>
    </section>
  );
}
