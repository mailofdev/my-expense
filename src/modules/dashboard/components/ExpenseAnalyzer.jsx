import { useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import {
  selectTotalSpent,
  selectMonthExpenses,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';
import CategoryChart from './CategoryChart';
import MonthWiseDistribution from './MonthWiseDistribution';
import MonthHistoryList from './MonthHistoryList';
import FindExpenses from './FindExpenses';

export default function ExpenseAnalyzer({ onOpenDay }) {
  const expenses = useSelector((state) => state.dashboard.expenses);
  const totalSpent = useSelector(selectTotalSpent);
  const monthExpenses = useSelector(selectMonthExpenses);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  return (
    <div className="feature-panel">
      <div className="px-1">
        <p className="section-label m-0">{monthLabel}</p>
        <p className="m-0 text-sm text-muted">Total spent</p>
        <p className="mt-1 text-2xl font-bold text-primary">{formatINR(totalSpent)}</p>
      </div>

      <FindExpenses onOpenDay={onOpenDay} />

      <MonthWiseDistribution />
      <CategoryChart />

      {monthExpenses.length > 0 && <MonthHistoryList />}

      {monthExpenses.length === 0 && (
        <p className="empty-state">
          {expenses.length === 0
            ? 'Add expenses on Home to see charts here.'
            : `No expenses in ${monthLabel}. Search above or pick another month.`}
        </p>
      )}
    </div>
  );
}
