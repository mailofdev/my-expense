import { useSelector } from 'react-redux';
import { formatINR, formatINRCompact } from '../../../core/utils/currency';
import {
  selectDayTotal,
  selectFilteredDayLabel,
  selectIsTodaySelected,
  selectBudgetRemaining,
} from '../store/dashboardSlice';

export default function OverviewHero() {
  const { walletBalance, monthlyBudget } = useSelector((state) => state.dashboard);
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const isToday = useSelector(selectIsTodaySelected);
  const budgetLeft = useSelector(selectBudgetRemaining);

  return (
    <section className="px-1 py-2 sm:px-2">
      <p className="section-label m-0">
        {isToday ? 'Spent today' : dayLabel}
      </p>
      <p className="text-glow m-0 text-[clamp(2.25rem,10vw,3rem)] font-bold leading-none tracking-tight text-primary">
        {formatINR(dayTotal)}
      </p>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span>
          Wallet <strong className="ml-1 font-semibold text-[#f0f4f2]">{formatINRCompact(walletBalance)}</strong>
        </span>
        {monthlyBudget > 0 && (
          <span>
            Budget left{' '}
            <strong
              className={`ml-1 font-semibold ${budgetLeft < 0 ? 'text-danger' : 'text-[#f0f4f2]'}`}
            >
              {formatINRCompact(Math.abs(budgetLeft))}
            </strong>
          </span>
        )}
      </p>
    </section>
  );
}
