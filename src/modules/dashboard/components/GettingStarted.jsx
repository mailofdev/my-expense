import { useSelector } from 'react-redux';
import {
  selectIsFilterCurrentMonth,
  selectMonthWalletFunded,
  selectTotalSpent,
} from '../store/dashboardSlice';

/** One line after income exists and before the first spend. Not stored on the profile. */
export default function GettingStarted() {
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);
  const monthFunded = useSelector(selectMonthWalletFunded);
  const monthSpent = useSelector(selectTotalSpent);

  if (!isCurrentMonth) return null;
  if (monthFunded > 0 && monthSpent > 0) return null;

  const incomeDone = monthFunded > 0;

  if (!incomeDone) return null;

  return (
    <p className="m-0 px-1 text-sm text-muted">
      Income is in. Log a spend below to see where it went.
    </p>
  );
}
