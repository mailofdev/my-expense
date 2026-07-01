import { useSelector } from 'react-redux';
import { formatINR, formatINRCompact } from '../../../core/utils/currency';
import {
  selectTotalSpent,
  selectBudgetRemaining,
  selectSavingsRate,
  selectMonthWalletRemaining,
  selectFilteredMonthLabel,
  selectDayTotal,
  selectFilteredDayLabel,
  selectIsTodaySelected,
} from '../store/dashboardSlice';

export default function ExpenseSummary() {
  const { monthlyBudget } = useSelector((state) => state.dashboard);
  const totalSpent = useSelector(selectTotalSpent);
  const dayTotal = useSelector(selectDayTotal);
  const budgetRemaining = useSelector(selectBudgetRemaining);
  const savingsRate = useSelector(selectSavingsRate);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const dayLabel = useSelector(selectFilteredDayLabel);
  const isToday = useSelector(selectIsTodaySelected);
  const walletRemaining = useSelector(selectMonthWalletRemaining);
  const budgetUsedPercent =
    monthlyBudget > 0
      ? Math.min(100, Math.round((totalSpent / monthlyBudget) * 100))
      : 0;

  const cards = [
    {
      label: isToday ? 'Spent today' : `Spent on ${dayLabel}`,
      value: formatINR(dayTotal),
      sub: 'Day-by-day tracking',
      accent: 'teal',
    },
    {
      label: `${monthLabel} wallet left`,
      value: formatINR(walletRemaining),
      sub: 'Funded amount minus month spends',
      accent: walletRemaining >= 0 ? 'green' : 'red',
    },
    {
      label: `Month — ${monthLabel}`,
      value: formatINR(totalSpent),
      sub:
        monthlyBudget > 0
          ? `${budgetUsedPercent}% of budget`
          : 'Monthly total',
      accent: 'orange',
    },
    {
      label: 'Budget left',
      value: formatINR(budgetRemaining),
      sub: `Budget: ${formatINRCompact(monthlyBudget)} · Savings ${savingsRate}%`,
      accent: budgetRemaining >= 0 ? 'purple' : 'red',
    },
  ];

  return (
    <section className="expense-summary">
      {cards.map((card) => (
        <article key={card.label} className={`summary-card summary-card--${card.accent}`}>
          <span className="summary-card__label">{card.label}</span>
          <strong className="summary-card__value">{card.value}</strong>
          <span className="summary-card__sub">{card.sub}</span>
        </article>
      ))}
    </section>
  );
}
