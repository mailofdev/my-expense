import { useSelector } from 'react-redux';
import {
  selectIsFilterCurrentMonth,
  selectMonthWalletFunded,
  selectTotalSpent,
} from '../store/dashboardSlice';

function Step({ done, current, number, title, detail, action }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? 'bg-success/20 text-success'
            : current
              ? 'bg-primary text-on-primary shadow-glow'
              : 'bg-surface-2 text-muted'
        }`}
        aria-hidden="true"
      >
        {done ? '✓' : number}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className={`m-0 text-sm font-semibold ${done ? 'text-muted line-through' : 'text-ink'}`}>
          {title}
        </p>
        {!done && detail && <p className="m-0 mt-0.5 text-sm leading-relaxed text-muted">{detail}</p>}
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
    <section
      className={`relative overflow-hidden rounded-lg border px-4 py-4 sm:px-5 sm:py-5 ${
        incomeDone
          ? 'border-success/25 bg-success/5'
          : 'border-primary/35 bg-gradient-to-br from-primary/20 via-surface to-surface shadow-glow'
      }`}
    >
      {!incomeDone && (
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl"
          aria-hidden="true"
        />
      )}
      <p
        className={`relative m-0 mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] ${
          incomeDone ? 'text-success/80' : 'text-primary'
        }`}
      >
        {incomeDone ? 'Next step' : 'Start here'}
      </p>
      <ol className="relative m-0 list-none space-y-4 p-0">
        <Step
          done={incomeDone}
          current={!incomeDone}
          number="1"
          title="Add income"
          detail="Salary, or any money you received this month."
          action={
            <button type="button" className="btn-primary btn-full mt-3" onClick={onGoToMoney}>
              Add income
            </button>
          }
        />
        <Step
          done={monthSpent > 0}
          current={incomeDone && monthSpent <= 0}
          number="2"
          title="Add an expense"
          detail={incomeDone ? 'Use Add expense to log what you spent.' : 'Do this after adding income.'}
        />
      </ol>
    </section>
  );
}
