import { useSelector } from 'react-redux';
import { formatINR, formatINRCompact } from '../../../core/utils/currency';
import {
  selectDayTotal,
  selectFilteredDayLabel,
  selectIsTodaySelected,
  selectTotalSpent,
  selectBudgetRemaining,
} from '../store/dashboardSlice';

export default function OverviewHero() {
  const { walletBalance, monthlyBudget } = useSelector((state) => state.dashboard);
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const isToday = useSelector(selectIsTodaySelected);
  const monthTotal = useSelector(selectTotalSpent);
  const budgetLeft = useSelector(selectBudgetRemaining);
  const budgetPercent =
    monthlyBudget > 0 ? Math.min(100, Math.round((monthTotal / monthlyBudget) * 100)) : 0;

  return (
    <section className="rounded-lg border border-edge bg-gradient-to-br from-surface-2 to-surface p-5 shadow-card sm:p-6">
      <p className="m-0 text-xs uppercase tracking-wider text-muted">
        {isToday ? 'Spent today' : dayLabel}
      </p>
      <p className="text-glow m-0 mb-4 text-[clamp(2rem,8vw,2.75rem)] font-bold leading-tight text-primary">
        {formatINR(dayTotal)}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-sm bg-black/20 px-3 py-2">
          <span className="text-[0.7rem] uppercase tracking-wide text-muted">Wallet</span>
          <strong className="mt-0.5 block text-sm">{formatINRCompact(walletBalance)}</strong>
        </div>
        <div className="rounded-sm bg-black/20 px-3 py-2">
          <span className="text-[0.7rem] uppercase tracking-wide text-muted">This month</span>
          <strong className="mt-0.5 block text-sm">{formatINRCompact(monthTotal)}</strong>
        </div>
        <div className="rounded-sm bg-black/20 px-3 py-2">
          <span className="text-[0.7rem] uppercase tracking-wide text-muted">Budget left</span>
          <strong className={`mt-0.5 block text-sm ${budgetLeft < 0 ? 'text-danger' : ''}`}>
            {formatINRCompact(Math.abs(budgetLeft))}
          </strong>
        </div>
      </div>
      {monthlyBudget > 0 && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
      )}
    </section>
  );
}
