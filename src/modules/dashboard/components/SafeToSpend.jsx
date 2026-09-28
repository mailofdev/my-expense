import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import { selectSafeToSpend } from '../store/dashboardSlice';

/**
 * Secondary figure under money left.
 * Safe today = (income − spend − planned savings/goals/investment − bills still due) / days left.
 */
export default function SafeToSpend({ className = '', prominent = false }) {
  const snapshot = useSelector(selectSafeToSpend);
  if (!snapshot.hasIncome) return null;

  const daily = snapshot.daily != null;
  const amount = daily ? snapshot.daily : snapshot.safe;
  const over = amount < 0;
  const label = daily
    ? over
      ? `${formatINR(Math.abs(amount))} over safe today`
      : `${formatINR(amount)} safe today`
    : over
      ? `${formatINR(Math.abs(amount))} over safe this month`
      : `${formatINR(amount)} safe this month`;

  const heldBack = [];
  if (snapshot.held > 0) heldBack.push(`${formatINR(snapshot.held)} planned savings`);
  if (snapshot.upcomingTotal > 0) heldBack.push(`${formatINR(snapshot.upcomingTotal)} in bills still due`);
  const heldText = heldBack.length ? `, after ${heldBack.join(' and ')},` : '';

  const explanation = daily
    ? `${formatINR(snapshot.left)} left${heldText} split across ${snapshot.daysLeft} day${snapshot.daysLeft === 1 ? '' : 's'} left.`
    : `${formatINR(snapshot.left)} left${heldText ? heldText.replace(/,$/, '') : ''}.`;

  return (
    <div className={className}>
      <p className={`m-0 font-semibold ${prominent ? 'text-xl tracking-tight' : 'text-sm'} ${over ? 'text-danger' : 'text-ink'}`}>{label}</p>
      <p className="m-0 mt-1 text-xs leading-relaxed text-muted">{explanation}</p>
    </div>
  );
}
