import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import { selectMonthlyReview } from '../store/dashboardSlice';

function changeLine(label, delta) {
  if (!delta) return `${label} matches last month`;
  const amount = formatINR(Math.abs(delta));
  return delta > 0 ? `${label} is ${amount} more` : `${label} is ${amount} less`;
}

export default function MonthlyReview() {
  const review = useSelector(selectMonthlyReview);
  const hasActivity = review.income > 0 || review.spent > 0;

  return (
    <section className="card">
      <h2 className="card-title mb-1">Monthly review</h2>
      <p className="card-desc">{review.monthLabel}</p>

      {!hasActivity && (
        <p className="m-0 text-sm text-muted">Add income and expenses to see how this month went.</p>
      )}

      {hasActivity && (
        <div className="space-y-4">
          {review.outlook && <p className="m-0 text-sm font-medium text-ink">{review.outlook}</p>}

          <dl className="m-0 grid grid-cols-3 gap-3">
            <div>
              <dt className="m-0 text-[11px] uppercase tracking-[0.12em] text-muted">Income</dt>
              <dd className="m-0 mt-1 text-sm font-semibold tabular-nums">{formatINR(review.income)}</dd>
            </div>
            <div>
              <dt className="m-0 text-[11px] uppercase tracking-[0.12em] text-muted">Spent</dt>
              <dd className="m-0 mt-1 text-sm font-semibold tabular-nums">{formatINR(review.spent)}</dd>
            </div>
            <div>
              <dt className="m-0 text-[11px] uppercase tracking-[0.12em] text-muted">Left</dt>
              <dd
                className={`m-0 mt-1 text-sm font-semibold tabular-nums ${
                  review.left < 0 ? 'text-danger' : ''
                }`}
              >
                {formatINR(review.left)}
              </dd>
            </div>
          </dl>

          <div>
            <p className="section-label">Planned savings</p>
            <p className="m-0 text-sm text-ink">
              Savings {formatINR(review.plannedSavings)} · Investment {formatINR(review.plannedInvestment)}
            </p>
          </div>

          <div>
            <p className="section-label">Biggest spending</p>
            {review.top.length > 0 ? (
              <ul className="m-0 list-none space-y-1 p-0">
                {review.top.map((row) => (
                  <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{row.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatINR(row.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-muted">No expenses in {review.monthLabel}.</p>
            )}
          </div>

          {review.comparison.hasPrevious && (
            <div>
              <p className="section-label">Versus {review.previousLabel}</p>
              <ul className="m-0 list-none space-y-1 p-0 text-sm text-muted">
                <li>{changeLine('Income', review.comparison.incomeDelta)}</li>
                <li>{changeLine('Spending', review.comparison.spentDelta)}</li>
                <li>{changeLine('Money left', review.comparison.leftDelta)}</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
