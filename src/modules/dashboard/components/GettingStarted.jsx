import { useSelector } from 'react-redux';
import {
  selectIsFilterCurrentMonth,
  selectMonthWalletFunded,
  selectTotalSpent,
} from '../store/dashboardSlice';

function Step({ done, number, title, detail, action }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done ? 'bg-success/20 text-success' : 'bg-surface-2 text-muted'
        }`}
        aria-hidden="true"
      >
        {done ? '✓' : number}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`m-0 text-sm font-medium ${done ? 'text-muted line-through' : 'text-[#f0f4f2]'}`}>
          {title}
        </p>
        {!done && detail && <p className="m-0 mt-0.5 text-xs text-muted">{detail}</p>}
        {!done && action}
      </div>
    </li>
  );
}

/** Two-step guide for new users: income first, then expenses. */
export default function GettingStarted({ onGoToMoney }) {
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);
  const monthFunded = useSelector(selectMonthWalletFunded);
  const monthSpent = useSelector(selectTotalSpent);

  if (!isCurrentMonth) return null;
  if (monthFunded > 0 && monthSpent > 0) return null;

  const incomeDone = monthFunded > 0;

  return (
    <section className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-3">
      <p className="section-label m-0 mb-3">Get started this month</p>
      <ol className="m-0 list-none space-y-3 p-0">
        <Step
          done={incomeDone}
          number="1"
          title="Add your income"
          detail="Salary, freelance, or any money you received."
          action={
            <button
              type="button"
              className="mt-2 border-0 bg-transparent p-0 text-xs font-semibold text-primary"
              onClick={onGoToMoney}
            >
              Go to Money →
            </button>
          }
        />
        <Step
          done={monthSpent > 0}
          number="2"
          title="Log what you spend"
          detail={incomeDone ? 'Use the form below for each purchase.' : 'Do this after step 1.'}
        />
      </ol>
    </section>
  );
}
