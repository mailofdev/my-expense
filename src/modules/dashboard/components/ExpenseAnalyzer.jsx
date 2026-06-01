import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  selectTotalSpent,
  selectMonthExpenses,
  selectTopCategories,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';
import CategoryChart from './CategoryChart';
import DailySpendChart from './DailySpendChart';
import MonthWiseDistribution from './MonthWiseDistribution';
import MonthHistoryList from './MonthHistoryList';

export default function ExpenseAnalyzer() {
  const totalSpent = useSelector(selectTotalSpent);
  const monthExpenses = useSelector(selectMonthExpenses);
  const topCategories = useSelector(selectTopCategories);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  return (
    <div className="feature-panel feature-panel--spaced">
      <div className="analyzer-head">
        <div>
          <h2 className="section-title">Insights</h2>
          <p className="section-subtitle">{monthLabel}</p>
        </div>
        <p className="analyzer-head__total">{formatINR(totalSpent)}</p>
      </div>

      <MonthWiseDistribution />

      <div className="dashboard__grid dashboard__grid--charts">
        <CategoryChart />
        <DailySpendChart />
      </div>

      <MonthHistoryList />

      {topCategories.length > 0 && (
        <section className="card card--subtle">
          <h3 className="card__title">Top categories</h3>
          <ul className="top-categories top-categories--clean">
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
        </section>
      )}

      {monthExpenses.length === 0 && (
        <p className="empty-state">Add expenses to unlock charts and insights</p>
      )}
    </div>
  );
}
