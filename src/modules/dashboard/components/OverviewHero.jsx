import { useSelector } from 'react-redux';
import { formatINR, formatINRCompact } from '../../../core/utils/currency';
import SafeToSpend from './SafeToSpend';
import {
  selectDayTotal,
  selectFilteredDayLabel,
  selectFilteredMonthLabel,
  selectIsTodaySelected,
  selectMonthWalletRemaining,
  selectMonthWalletFunded,
  selectMonthIncome,
  selectMonthMoneyBack,
  selectSetAsideParked,
  selectTotalSpent,
} from '../store/dashboardSlice';

function Stat({ label, value, tone = '' }) {
  return (
    <div className="min-w-0 text-center">
      <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={`m-0 mt-1 truncate text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export default function OverviewHero({ onAddIncome }) {
  const dayTotal = useSelector(selectDayTotal);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const isToday = useSelector(selectIsTodaySelected);
  const walletRemaining = useSelector(selectMonthWalletRemaining);
  const walletFunded = useSelector(selectMonthWalletFunded);
  const monthIncome = useSelector(selectMonthIncome);
  const moneyBack = useSelector(selectMonthMoneyBack);
  const monthSpent = useSelector(selectTotalSpent);
  const setAsideParked = useSelector(selectSetAsideParked);
  const income = monthIncome > 0 ? monthIncome : walletFunded;

  if (walletFunded <= 0) {
    return (
      <section className="relative overflow-hidden rounded-lg border border-edge bg-surface px-5 py-5 text-left">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
          {monthLabel}
        </p>
        <p className="m-0 mt-2 text-2xl font-semibold tracking-tight text-ink">No income yet</p>
        <p className="m-0 mt-1.5 text-sm leading-relaxed text-muted">
          Add what you received. Left to spend and safe to spend appear after that.
        </p>
        {onAddIncome && (
          <button type="button" className="btn-primary btn-full mt-4 min-h-11" onClick={onAddIncome}>
            Add income
          </button>
        )}
        {dayTotal > 0 && (
          <p className="m-0 mt-3 text-sm text-muted">
            <span className="font-semibold tabular-nums text-ink">{formatINR(dayTotal)}</span>
            {isToday ? ' already spent today' : ` spent · ${dayLabel}`}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-lg border border-edge bg-surface px-5 py-5">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-32 w-48 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <p className="relative m-0 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
        {monthLabel}
      </p>
      <p className={`hero-amount relative mt-1 text-center ${walletRemaining < 0 ? 'text-danger' : ''}`}>
        {formatINR(walletRemaining)}
      </p>
      <p className="relative m-0 text-center text-sm text-muted">Left to spend</p>
      <SafeToSpend prominent className="relative mt-4 border-t border-edge/60 pt-4 text-center" />
      <dl className="relative m-0 mt-4 grid grid-cols-2 gap-3 border-t border-edge/60 pt-4 sm:grid-cols-4">
        <Stat label="Income" value={formatINRCompact(income)} tone="text-success" />
        {moneyBack > 0 && (
          <Stat label="Received back" value={formatINRCompact(moneyBack)} tone="text-success" />
        )}
        <Stat label="Spent" value={formatINRCompact(monthSpent)} tone="text-danger" />
        <Stat label="Set aside" value={formatINRCompact(setAsideParked)} />
        <Stat
          label="Left"
          value={formatINRCompact(walletRemaining)}
          tone={walletRemaining < 0 ? 'text-danger' : 'text-ink'}
        />
      </dl>
      <p className="relative m-0 mt-3 text-center text-xs text-muted">
        {`Left is income${moneyBack > 0 ? ', plus money back' : ''}, minus spends${
          setAsideParked > 0 ? ', minus money in set-aside accounts' : ''
        }.`}
        {' '}
        <span className="font-semibold tabular-nums text-ink">{formatINR(dayTotal)}</span>
        {isToday ? ' spent today.' : ` spent · ${dayLabel}.`}
      </p>
    </section>
  );
}
