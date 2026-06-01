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
    <div className="feature-panel">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-lg font-bold sm:text-xl">Insights</h2>
          <p className="mt-1 text-sm text-muted">{monthLabel}</p>
        </div>
        <p className="m-0 text-xl font-bold text-primary sm:text-2xl">{formatINR(totalSpent)}</p>
      </div>

      <MonthWiseDistribution />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryChart />
        <DailySpendChart />
      </div>

      <MonthHistoryList />

      {topCategories.length > 0 && (
        <section className="card card-subtle">
          <h3 className="card-title">Top categories</h3>
          <ul className="m-0 list-none p-0">
            {topCategories.map((item, i) => (
              <li
                key={item.category}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-edge py-2.5 last:border-0 sm:gap-4"
              >
                <span className="text-sm font-bold text-primary">#{i + 1}</span>
                <span className="truncate text-sm">{item.category}</span>
                <strong className="text-sm">{formatINR(item.amount)}</strong>
                <span className="text-xs text-muted">
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
