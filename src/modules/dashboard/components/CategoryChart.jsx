import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor } from '../../../core/constants/finance';
import {
  DEFAULT_CHART_PERIOD,
  filterExpensesByPeriod,
  getPeriodMeta,
  groupExpensesByCategory,
} from '../utils/chartPeriods';
import ChartPeriodSelector from './ChartPeriodSelector';
import {
  selectMainCategories,
  selectMonthExpenses,
  selectVisibleCategories,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';
import { resolveMainCategoryName, shortCategoryLabel } from '../utils/categories';
import { useTheme } from '../../../shared/theme/ThemeProvider';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryChart() {
  const { isDark } = useTheme();
  const expenses = useSelector((state) => state.dashboard.expenses);
  const monthExpenses = useSelector(selectMonthExpenses);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const categoryColors = useSelector((state) => state.dashboard.categoryColors);
  const categories = useSelector(selectVisibleCategories);
  const mainCategories = useSelector(selectMainCategories);
  const [period, setPeriod] = useState(DEFAULT_CHART_PERIOD);
  const periodMeta = getPeriodMeta(period);

  const expensesByCategory = useMemo(() => {
    const source = period === 'month' ? monthExpenses : filterExpensesByPeriod(expenses, period);
    const filtered = source.map((expense) => ({
      ...expense,
      category: resolveMainCategoryName(expense.category, mainCategories),
    }));
    return groupExpensesByCategory(filtered);
  }, [expenses, monthExpenses, period, mainCategories]);

  const chartData = useMemo(() => {
    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);
    const colors = labels.map((label) => getCategoryColor(label, categoryColors, categories));

    return {
      labels: labels.map((label) => shortCategoryLabel(label)),
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: isDark ? '#101714' : '#fffdf8',
          borderWidth: 3,
          hoverOffset: 4,
        },
      ],
    };
  }, [expensesByCategory, categoryColors, categories, isDark]);

  const hasData = chartData.labels.length > 0;
  const periodCopy =
    period === 'month' ? monthLabel : period === 'week' ? 'This week' : `Last ${periodMeta.title}`;

  return (
    <section className="card">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="card-title mb-1">By category</h2>
          <p className="card-desc mb-0">{periodCopy}</p>
        </div>
        <ChartPeriodSelector value={period} onChange={setPeriod} />
      </div>

      {hasData ? (
        <div className="chart-box">
          <Doughnut
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '68%',
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    boxWidth: 10,
                    padding: 16,
                    color: isDark ? '#9bb0a6' : '#5f6b64',
                    font: { size: 12 },
                  },
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) => ` ₹${ctx.raw.toLocaleString('en-IN')}`,
                  },
                },
              },
            }}
          />
        </div>
      ) : (
        <p className="empty-state-sm">No expenses in this period</p>
      )}
    </section>
  );
}
