import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import dayjs from 'dayjs';
import { setMonthFilter, setDayFilter, selectMonthlyDistribution } from '../store/dashboardSlice';
import { getTodayString } from '../../../core/utils/date';
import { formatINR } from '../../../core/utils/currency';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function MonthWiseDistribution() {
  const dispatch = useDispatch();
  const distribution = useSelector(selectMonthlyDistribution);
  const { filterMonth, filterYear } = useSelector((state) => state.dashboard);
  const activeKey = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;

  const chartData = useMemo(
    () => ({
      labels: distribution.map((d) => d.label),
      datasets: [
        {
          label: 'Monthly spend',
          data: distribution.map((d) => d.amount),
          backgroundColor: distribution.map((d) =>
            d.key === activeKey ? 'rgba(232, 197, 71, 0.9)' : 'rgba(74, 222, 128, 0.45)'
          ),
          borderRadius: 6,
        },
      ],
    }),
    [distribution, activeKey]
  );

  const hasAnyData = distribution.some((d) => d.amount > 0);

  const handleBarClick = (_, elements) => {
    if (!elements?.length) return;
    const index = elements[0].index;
    const item = distribution[index];
    if (item) {
      dispatch(setMonthFilter({ month: item.month, year: item.year }));
      const d = dayjs(`${item.year}-${String(item.month).padStart(2, '0')}-01`);
      const date = d.isSame(dayjs(), 'month') ? getTodayString() : d.format('YYYY-MM-DD');
      dispatch(setDayFilter({ date }));
    }
  };

  return (
    <section className="card month-distribution">
      <h3>Month-wise Distribution</h3>
      <p className="card__desc">Last 12 months — tap a bar to filter that month</p>
      {hasAnyData ? (
        <div className="category-chart__canvas category-chart__canvas--bar month-distribution__chart">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              onClick: handleBarClick,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => ` ${formatINR(ctx.raw)}`,
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (v) => `₹${Number(v) >= 1000 ? `${v / 1000}k` : v}`,
                  },
                },
                x: {
                  ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } },
                },
              },
            }}
          />
        </div>
      ) : (
        <p className="empty-state">Add expenses to see month-wise trends</p>
      )}
    </section>
  );
}
