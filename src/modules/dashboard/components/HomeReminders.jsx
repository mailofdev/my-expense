import { useSelector } from 'react-redux';
import { selectInAppReminders } from '../store/dashboardSlice';

const TONE_CLASS = {
  danger: 'border-danger/40 bg-danger/10 text-red-200',
  warning: 'border-accent/40 bg-accent/10 text-yellow-100',
  info: 'border-edge bg-surface-2 text-muted',
};

/** Short alerts on Home — tap to go to Money tab when needed. */
export default function HomeReminders({ onGoToMoney }) {
  const reminders = useSelector(selectInAppReminders);

  if (!reminders.length) return null;

  return (
    <ul className="m-0 list-none space-y-2 p-0">
      {reminders.map((reminder) => {
        const clickable = reminder.action === 'wallet';
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
              onClick={() => onGoToMoney?.()}
            >
              {reminder.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
