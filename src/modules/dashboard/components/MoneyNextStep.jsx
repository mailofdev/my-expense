import { useSelector } from 'react-redux';
import {
  selectIsFilterCurrentMonth,
  selectMonthWalletFunded,
  selectTotalSpent,
} from '../store/dashboardSlice';

/** Nudge on Money tab after income is added but no expenses yet. */
export default function MoneyNextStep({ onGoToHome }) {
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);
  const monthFunded = useSelector(selectMonthWalletFunded);
  const monthSpent = useSelector(selectTotalSpent);

  if (!isCurrentMonth || monthFunded <= 0 || monthSpent > 0) return null;

  return (
    <section className="rounded-lg border border-success/30 bg-success/10 px-3 py-3">
      <p className="m-0 text-sm font-medium text-[#f0f4f2]">Income added — you&apos;re set for this month.</p>
      <p className="m-0 mt-1 text-xs text-muted">Next, log each purchase on Home so you can track spending.</p>
      <button
        type="button"
        className="mt-2 border-0 bg-transparent p-0 text-xs font-semibold text-primary"
        onClick={onGoToHome}
      >
        Go to Home →
      </button>
    </section>
  );
}
