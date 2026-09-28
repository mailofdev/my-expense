import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import { getCategoryLimitWarningText } from '../../../core/constants/finance';
import { selectCategoryLimitStatuses } from '../store/dashboardSlice';

export default function CategoryLimitStatus({ variant = 'full', onEdit }) {
  const rows = useSelector(selectCategoryLimitStatuses);

  if (!rows.length) {
    if (variant === 'compact') return null;
    return (
      <section className="card">
        <h2 className="card-title mb-1">Category limits</h2>
        <p className="m-0 text-sm text-muted">No monthly limits yet. Add them in Tools if you want a heads-up.</p>
        {onEdit && (
          <button type="button" className="btn-outline btn-sm mt-3" onClick={onEdit}>
            Set limits
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="card">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="card-title mb-0">{variant === 'compact' ? 'Limits' : 'Category limits'}</h2>
        {onEdit && (
          <button type="button" className="border-0 bg-transparent p-0 text-xs font-semibold text-primary" onClick={onEdit}>
            Edit
          </button>
        )}
      </div>
      <ul className="m-0 list-none space-y-3 p-0">
        {rows.map((row) => (
          <li key={row.category}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{row.category}</span>
              <span className="shrink-0 tabular-nums text-muted">
                {formatINR(row.spent)} / {formatINR(row.limit)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className={`h-full rounded-full ${row.level >= 100 ? 'bg-danger' : row.level >= 75 ? 'bg-accent' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, row.percent)}%` }}
              />
            </div>
            {row.level ? (
              <p className={`mb-0 mt-1 text-xs ${row.level >= 100 ? 'text-danger' : 'text-muted'}`}>
                {getCategoryLimitWarningText(row.category, row.level, row.spent, row.limit)}
              </p>
            ) : (
              <p className="mb-0 mt-1 text-xs text-muted">{row.percent}% used</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
