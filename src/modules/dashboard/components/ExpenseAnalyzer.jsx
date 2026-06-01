import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  selectTotalSpent,
  selectMonthExpenses,
  selectTopCategories,
  selectDailySpendTrend,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';
import CategoryChart from './CategoryChart';
import DailySpendChart from './DailySpendChart';
import MonthWiseDistribution from './MonthWiseDistribution';

export default function ExpenseAnalyzer() {
  const totalSpent = useSelector(selectTotalSpent);
  const monthExpenses = useSelector(selectMonthExpenses);
  const topCategories = useSelector(selectTopCategories);
  const trend = useSelector(selectDailySpendTrend);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  const daysWithSpend = trend.filter((d) => d.amount > 0).length;
  const avgDaily = daysWithSpend > 0 ? Math.round(totalSpent / daysWithSpend) : 0;
  const upiShare =
    monthExpenses.length > 0
      ? Math.round(
          (monthExpenses.filter((e) => e.paymentMode === 'UPI').length / monthExpenses.length) *
            100
        )
      : 0;

  return (
    <div className="feature-panel">
      <section className="analyzer-stats">
        <article className="summary-card summary-card--teal">
          <span className="summary-card__label">{monthLabel}</span>
          <strong className="summary-card__value">{formatINR(totalSpent)}</strong>
          <span className="summary-card__sub">{monthExpenses.length} transactions</span>
        </article>
        <article className="summary-card summary-card--orange">
          <span className="summary-card__label">Avg / Active Day</span>
          <strong className="summary-card__value">{formatINR(avgDaily)}</strong>
          <span className="summary-card__sub">Days with spending this month</span>
        </article>
        <article className="summary-card summary-card--purple">
          <span className="summary-card__label">UPI Share</span>
          <strong className="summary-card__value">{upiShare}%</strong>
          <span className="summary-card__sub">Digital payment usage</span>
        </article>
      </section>

      <MonthWiseDistribution />

      <div className="dashboard__grid">
        <CategoryChart />
        <DailySpendChart />
      </div>

      <section className="card">
        <h3>Top Categories — {monthLabel}</h3>
        {topCategories.length === 0 ? (
          <p className="empty-state">No expenses this month for category breakdown</p>
        ) : (
          <ul className="top-categories">
            {topCategories.map((item, i) => (
              <li key={item.category}>
                <span className="top-categories__rank">#{i + 1}</span>
                <span>{item.category}</span>
                <strong>{formatINR(item.amount)}</strong>
                <span className="top-categories__pct">
                  {totalSpent > 0 ? Math.round((item.amount / totalSpent) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
