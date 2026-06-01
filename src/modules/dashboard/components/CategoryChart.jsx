import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor } from '../../../core/constants/finance';
import { selectExpensesByCategory, selectFilteredMonthLabel } from '../store/dashboardSlice';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryChart() {
  const expensesByCategory = useSelector(selectExpensesByCategory);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  const chartData = useMemo(() => {
    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);
    const colors = labels.map((label) => getCategoryColor(label));

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
  }, [expensesByCategory]);

  const hasData = chartData.labels.length > 0;

  return (
    <section className="card">
      <h2 className="card-title">By category</h2>
      <p className="card-desc">{monthLabel}</p>
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
        <p className="empty-state-sm">No expenses this month for category breakdown</p>
      )}
    </section>
  );
}
