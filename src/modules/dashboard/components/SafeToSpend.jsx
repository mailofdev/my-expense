import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import { selectIsFilterCurrentMonth, selectSafeToSpend } from '../store/dashboardSlice';

export default function SafeToSpend() {
  const snapshot = useSelector(selectSafeToSpend);
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);

  const parts = [];
  if (snapshot.held > 0) parts.push(`${formatINR(snapshot.held)} set aside`);
  if (snapshot.upcomingTotal > 0) {
    parts.push(`${formatINR(snapshot.upcomingTotal)} in upcoming bills`);
  }

  if (!snapshot.hasIncome) {
    return (
      <section className="card text-center">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
          Safe to spend
        </p>
        <p className="m-0 mt-2 text-sm text-muted">
          Add income to see what you can safely spend this month.
        </p>
      </section>
    );
  }

  return (
    <section className="card text-center">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
        Safe to spend
      </p>
      <p
        className={`m-0 mt-1 text-2xl font-semibold tabular-nums tracking-tight ${
          snapshot.safe < 0 ? 'text-danger' : 'text-ink'
        }`}
      >
        {formatINR(snapshot.safe)}
      </p>
      {isCurrentMonth && snapshot.daily != null && (
        <p className="m-0 mt-1 text-sm text-muted">
          {formatINR(snapshot.daily)} a day · {snapshot.daysLeft}{' '}
          {snapshot.daysLeft === 1 ? 'day' : 'days'} left this month
        </p>
      )}
      {parts.length > 0 && (
        <p className="m-0 mt-1 text-xs leading-relaxed text-muted">{parts.join(' · ')}</p>
      )}
    </section>
  );
}
