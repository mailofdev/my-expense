import { useSelector } from 'react-redux';
import {
  selectIsFilterCurrentMonth,
  selectMonthWalletFunded,
  selectTotalSpent,
} from '../store/dashboardSlice';

/** Nudge on Money tab after income is added but no expenses yet. */
export default function MoneyNextStep({ onGoToHome, onGoToBudgets }) {
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);
  const monthFunded = useSelector(selectMonthWalletFunded);
  const monthSpent = useSelector(selectTotalSpent);

  if (!isCurrentMonth || monthFunded <= 0 || monthSpent > 0) return null;

  return (
    <section className="rounded-lg border border-success/30 bg-success/10 px-3 py-3">
      <p className="m-0 text-sm font-medium text-[#f0f4f2]">Income added.</p>
      <p className="m-0 mt-1 text-xs text-muted">
        Optional: set category limits from this salary, then log purchases on Home.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {onGoToBudgets && (
          <button
            type="button"
            className="border-0 bg-transparent p-0 text-xs font-semibold text-primary"
            onClick={onGoToBudgets}
          >
            Set budgets →
          </button>
        )}
        <button
          type="button"
          className="border-0 bg-transparent p-0 text-xs font-semibold text-primary"
          onClick={onGoToHome}
        >
          Open Home →
        </button>
      </div>
    </section>
  );
}
