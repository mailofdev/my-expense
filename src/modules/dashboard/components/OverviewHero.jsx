import { useSelector } from 'react-redux';
import { formatINR, formatINRCompact } from '../../../core/utils/currency';
import {
  selectDayTotal,
  selectFilteredDayLabel,
  selectIsTodaySelected,
  selectMonthWalletRemaining,
  selectMonthWalletFunded,
  selectMonthWalletUsagePercent,
  selectTotalSpent,
  selectMonthSavingsSnapshot,
} from '../store/dashboardSlice';

export default function OverviewHero({ onTabChange }) {
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const isToday = useSelector(selectIsTodaySelected);
  const walletRemaining = useSelector(selectMonthWalletRemaining);
  const walletFunded = useSelector(selectMonthWalletFunded);
  const walletUsagePercent = useSelector(selectMonthWalletUsagePercent);
  const monthSpent = useSelector(selectTotalSpent);
  const savings = useSelector(selectMonthSavingsSnapshot);

  const walletBarPercent = walletFunded > 0 ? Math.min(100, walletUsagePercent) : 0;
  const savingsBarPercent = savings.hasIncome
    ? Math.min(100, Math.max(0, savings.progressTowardGoal))
    : 0;

  return (
    <section className="px-0.5">
      <p className="section-label m-0">{isToday ? 'Today' : dayLabel}</p>
      <p className="text-glow m-0 text-[clamp(2.25rem,10vw,3rem)] font-bold leading-none tracking-tight text-primary">
        {formatINR(dayTotal)}
      </p>
      <p className="m-0 mt-1 text-sm text-muted">spent</p>

      <div className="mt-4 rounded-lg bg-surface-2/40 px-3 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="m-0 text-xs text-muted">Month budget</p>
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
              {formatINRCompact(monthSpent)} spent of {formatINRCompact(walletFunded)}
            </p>
          </>
        )}

        {savings.hasIncome && (
          <div className="mt-3 border-t border-edge/40 pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="m-0 text-xs text-muted">Savings goal</p>
              <p
                className={`m-0 text-sm font-semibold ${
                  savings.goalMet ? 'text-success' : savings.saved < 0 ? 'text-danger' : 'text-[#f0f4f2]'
                }`}
              >
                {savings.savingsRate}% of income
              </p>
            </div>
            <div className="mb-1.5 mt-2 h-1 overflow-hidden rounded-full bg-surface">
              <div
                className={`h-full rounded-full transition-all ${
                  savings.goalMet ? 'bg-success' : savings.saved < 0 ? 'bg-danger' : 'bg-accent'
                }`}
                style={{ width: `${savingsBarPercent}%` }}
              />
            </div>
            <p className="m-0 text-xs text-muted">
              {formatINRCompact(Math.max(0, savings.saved))} saved · goal {savings.goalPercent}%
              {savings.goalMet ? ' · on track' : ''}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
