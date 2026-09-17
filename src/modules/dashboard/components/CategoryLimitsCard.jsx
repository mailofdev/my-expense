import { useSelector } from 'react-redux';
import { formatINR, formatINRCompact } from '../../../core/utils/currency';
import {
  selectCategoryLimitStatuses,
  selectCategoryBudgetPlan,
} from '../store/dashboardSlice';

function barClass(level, percent) {
  if (level >= 100 || percent >= 100) return 'bg-danger';
  if (level >= 90 || percent >= 90) return 'bg-accent';
  if (level >= 75 || percent >= 75) return 'bg-accent';
  return 'bg-primary';
}

/** Compact progress for categories that have a monthly limit. */
export default function CategoryLimitsCard({ onManageBudgets }) {
  const statuses = useSelector(selectCategoryLimitStatuses);
  const plan = useSelector(selectCategoryBudgetPlan);

  if (!statuses.length) {
    if (plan.income <= 0) return null;
    return (
      <section className="card">
        <h2 className="card-title mb-2">Category limits</h2>
        <p className="m-0 text-sm text-muted">
          Set limits from your salary so each category has a clear cap.
        </p>
        {onManageBudgets && (
          <button
            type="button"
            className="mt-3 border-0 bg-transparent p-0 text-xs font-semibold text-primary"
            onClick={onManageBudgets}
          >
            Set budgets →
          </button>
        )}
      </section>
    );
  }

  const sorted = [...statuses].sort((a, b) => b.percent - a.percent);

  return (
    <section className="card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="card-title mb-1">Category limits</h2>
          <p className="m-0 text-xs text-muted">
            {formatINRCompact(plan.spendable)} spendable after {plan.savingsPercent}% savings
          </p>
        </div>
        {onManageBudgets && (
          <button
            type="button"
            className="shrink-0 border-0 bg-transparent p-0 text-xs font-semibold text-primary"
            onClick={onManageBudgets}
          >
            Edit
          </button>
        )}
      </div>

      <ul className="m-0 list-none space-y-3 p-0">
        {sorted.map((item) => {
          const width = Math.min(100, item.percent);
          const left = Math.max(0, item.remaining);
          return (
            <li key={item.category}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="m-0 truncate text-sm text-[#f0f4f2]">{item.category}</p>
                <p
                  className={`m-0 shrink-0 text-xs font-medium ${
                    item.remaining < 0 ? 'text-danger' : 'text-muted'
                  }`}
                >
                  {item.remaining < 0
                    ? `${formatINR(Math.abs(item.remaining))} over`
                    : `${formatINRCompact(left)} left`}
                </p>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                <div
                  className={`h-full rounded-full transition-all ${barClass(item.level, item.percent)}`}
                  style={{
                    width: `${width}%`,
                    backgroundColor: item.level >= 75 ? undefined : item.color,
                  }}
                />
              </div>
              <p className="m-0 mt-1 text-[11px] text-muted">
                {formatINRCompact(item.spent)} of {formatINRCompact(item.limit)}
                {item.level ? ` · ${item.level}%` : ''}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
