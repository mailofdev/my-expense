import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import { selectSafeToSpend } from '../store/dashboardSlice';

/** One line under left-to-spend when a plan or a bill changes what you can use. */
export default function SpendPlanNote({ className = 'm-0 text-xs leading-relaxed text-muted' }) {
  const snapshot = useSelector(selectSafeToSpend);
  if (!snapshot.hasIncome) return null;

  const parts = [];
  if (snapshot.held > 0) parts.push(`${formatINR(snapshot.held)} planned savings`);
  if (snapshot.upcomingTotal > 0) parts.push(`${formatINR(snapshot.upcomingTotal)} in bills`);
  if (!parts.length) return null;

  return <p className={className}>{parts.join(' · ')}</p>;
}
