import { useSelector } from 'react-redux';
import {
  selectIsFilterCurrentMonth,
  selectMonthWalletFunded,
  selectTotalSpent,
} from '../store/dashboardSlice';

/** Nudge on Income tab after income is added but no expenses yet. */
export default function MoneyNextStep({ onGoToHome }) {
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);
  const monthFunded = useSelector(selectMonthWalletFunded);
  const monthSpent = useSelector(selectTotalSpent);

  if (!isCurrentMonth || monthFunded <= 0 || monthSpent > 0) return null;

  return (
    <p className="m-0 px-1 text-sm text-muted">
      Income is in.{' '}
      <button type="button" className="border-0 bg-transparent p-0 font-semibold text-primary" onClick={onGoToHome}>
        Log an expense on Today
      </button>
    </p>
  );
}
