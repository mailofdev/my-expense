import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { selectExpensesByCategory, selectFilteredMonthLabel } from '../store/dashboardSlice';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryChart() {
  const expensesByCategory = useSelector(selectExpensesByCategory);
  const categoryColors = useSelector((state) => state.dashboard.categoryColors);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  const chartData = useMemo(() => {
    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);
    const colors = labels.map((label) => categoryColors[label] || '#6b7280');

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
    <section className="category-chart card">
      <h3>By Category — {monthLabel}</h3>
      {hasData ? (
        <div className="category-chart__canvas">
          <Doughnut
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const value = ctx.raw;
                      return ` ₹${value.toLocaleString('en-IN')}`;
                    },
                  },
                },
              },
            }}
          />
        </div>
      ) : (
        <p className="empty-state">No expenses this month for category breakdown</p>
      )}
    </section>
  );
}
