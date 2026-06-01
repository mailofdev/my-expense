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
    <section className="overview-hero">
      <div className="overview-hero__main">
        <p className="overview-hero__label">{isToday ? 'Spent today' : dayLabel}</p>
        <p className="overview-hero__amount">{formatINR(dayTotal)}</p>
      </div>
      <div className="overview-hero__stats">
        <div className="overview-hero__stat">
          <span>Wallet</span>
          <strong>{formatINRCompact(walletBalance)}</strong>
        </div>
        <div className="overview-hero__stat">
          <span>This month</span>
          <strong>{formatINRCompact(monthTotal)}</strong>
        </div>
        <div className="overview-hero__stat">
          <span>Budget left</span>
          <strong className={budgetLeft < 0 ? 'text-danger' : ''}>
            {formatINRCompact(Math.abs(budgetLeft))}
          </strong>
        </div>
      </div>
      {monthlyBudget > 0 && (
        <div className="overview-hero__budget">
          <div className="overview-hero__budget-bar" style={{ width: `${budgetPercent}%` }} />
        </div>
      )}
    </section>
  );
}
