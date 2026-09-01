import { useSelector, useDispatch } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  applyDueRecurringExpenses,
  selectDueRecurringExpenses,
  selectInAppReminders,
} from '../store/dashboardSlice';

const TONE_CLASS = {
  danger: 'border-danger/40 bg-danger/10 text-red-200',
  warning: 'border-accent/40 bg-accent/10 text-yellow-100',
  info: 'border-edge bg-surface-2 text-muted',
};

/**
 * Compact Home alerts: due bills, unfunded month, overspend, category limits.
 */
export default function HomeReminders({ onGoToMoney, onGoToSettings }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving } = useSelector((state) => state.dashboard);
  const reminders = useSelector(selectInAppReminders);
  const dueItems = useSelector(selectDueRecurringExpenses);

  if (!reminders.length) return null;

  const handleReminder = (reminder) => {
    if (reminder.action === 'log-recurring') {
      if (!dueItems.length || saving) return;
      const total = dueItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const names = dueItems.map((item) => item.title).join(', ');
      const proceed = window.confirm(
        `Log ${dueItems.length} due bill${dueItems.length > 1 ? 's' : ''} today?\n\n${names}\nTotal: ${formatINR(total)}`
      );
      if (!proceed) return;
      dispatch(applyDueRecurringExpenses({ uid: user.uid }));
      return;
    }
    if (reminder.action === 'wallet') {
      onGoToMoney?.();
      return;
    }
    if (reminder.id?.startsWith('cat-')) {
      onGoToSettings?.();
    }
  };

  return (
    <ul className="m-0 list-none space-y-2 p-0">
      {reminders.map((reminder) => {
        const clickable = Boolean(reminder.action) || reminder.id?.startsWith('cat-');
        const className = `m-0 w-full rounded-sm border px-3 py-2 text-left text-xs ${
          TONE_CLASS[reminder.tone] || TONE_CLASS.info
        } ${clickable ? 'cursor-pointer' : ''}`;

        if (!clickable) {
          return (
            <li key={reminder.id}>
              <p className={className}>{reminder.text}</p>
            </li>
          );
        }

        return (
          <li key={reminder.id}>
            <button
              type="button"
              className={`${className} border-solid`}
              onClick={() => handleReminder(reminder)}
              disabled={saving && reminder.action === 'log-recurring'}
            >
              {reminder.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
