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

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryChart() {
  const expenses = useSelector((state) => state.dashboard.expenses);
  const categoryColors = useSelector((state) => state.dashboard.categoryColors);
  const [period, setPeriod] = useState(DEFAULT_CHART_PERIOD);
  const periodMeta = getPeriodMeta(period);

  const expensesByCategory = useMemo(() => {
    const filtered = filterExpensesByPeriod(expenses, period);
    return groupExpensesByCategory(filtered);
  }, [expenses, period]);

  const chartData = useMemo(() => {
    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);
    const colors = labels.map((label) => getCategoryColor(label, categoryColors));

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    };
  }, [expensesByCategory, categoryColors]);

  const hasData = chartData.labels.length > 0;

  return (
    <section className="card">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="card-title mb-1">By category</h2>
          <p className="card-desc mb-0">Last {periodMeta.title}</p>
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
              plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } },
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
        <p className="empty-state-sm">No expenses in this period for category breakdown</p>
      )}
    </section>
  );
}
