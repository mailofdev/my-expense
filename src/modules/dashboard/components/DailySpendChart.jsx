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
import {
  selectDailySpendTrend,
  selectFilteredMonthLabel,
  setDayFilter,
} from '../store/dashboardSlice';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function DailySpendChart() {
  const dispatch = useDispatch();
  const trend = useSelector(selectDailySpendTrend);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  const chartData = useMemo(
    () => ({
      labels: trend.map((d) => d.label),
      datasets: [
        {
          label: 'Daily spend',
          data: trend.map((d) => d.amount),
          backgroundColor: trend.map((d) =>
            d.isSelected
              ? 'rgba(232, 197, 71, 0.95)'
              : d.amount > 0
                ? 'rgba(74, 222, 128, 0.55)'
                : 'rgba(100, 116, 139, 0.25)'
          ),
          borderRadius: 4,
        },
      ],
    }),
    [trend]
  );

  const hasData = trend.some((d) => d.amount > 0);

  const handleChartClick = (_, elements) => {
    if (!elements?.length) return;
    const day = trend[elements[0].index];
    if (day?.date) dispatch(setDayFilter({ date: day.date }));
  };

  return (
    <section className="card">
      <h3 className="card-title">Daily spending — {monthLabel}</h3>
      <p className="card-desc">Tap a bar to open that day&apos;s ledger</p>
      {hasData ? (
        <div className="chart-box cursor-pointer">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              onClick: handleChartClick,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { callback: (v) => `₹${v}` },
                },
                x: {
                  ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 16 },
                },
              },
            }}
          />
        </div>
      ) : (
        <p className="empty-state-sm">No daily spending recorded this month yet</p>
      )}
    </section>
  );
}
