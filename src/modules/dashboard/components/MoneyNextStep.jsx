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
    <section className="relative overflow-hidden rounded-lg border border-success/30 bg-gradient-to-br from-success/15 via-surface to-surface px-4 py-4">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-success/80">
        Next step
      </p>
      <p className="m-0 mt-2 text-sm font-semibold text-ink">Income added.</p>
      <p className="m-0 mt-1 text-sm leading-relaxed text-muted">
        Log expenses on Today to track spending.
      </p>
      <button type="button" className="btn-primary btn-full mt-3" onClick={onGoToHome}>
        Add an expense
      </button>
    </section>
  );
}
