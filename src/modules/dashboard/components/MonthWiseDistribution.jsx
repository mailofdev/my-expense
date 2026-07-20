import { useMemo, useState } from 'react';
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
import { setMonthFilter, setDayFilter } from '../store/dashboardSlice';
import { getTodayString } from '../../../core/utils/date';
import { formatINR } from '../../../core/utils/currency';
import {
  DEFAULT_CHART_PERIOD,
  buildSpendDistribution,
  getPeriodMeta,
} from '../utils/chartPeriods';
import ChartPeriodSelector from './ChartPeriodSelector';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function MonthWiseDistribution() {
  const dispatch = useDispatch();
  const expenses = useSelector((state) => state.dashboard.expenses);
  const { filterMonth, filterYear, filterDate } = useSelector((state) => state.dashboard);
  const [period, setPeriod] = useState(DEFAULT_CHART_PERIOD);
  const periodMeta = getPeriodMeta(period);

  const distribution = useMemo(
    () => buildSpendDistribution(expenses, period),
    [expenses, period]
  );

  const activeKey = useMemo(() => {
    if (!distribution.length) return '';
    if (distribution[0].type === 'month') {
      return `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
    }
    if (distribution[0].type === 'day') {
      return filterDate;
    }
    return distribution.find(
      (item) =>
        !dayjs(filterDate).isBefore(item.startDate, 'day') &&
        !dayjs(filterDate).isAfter(item.endDate, 'day')
    )?.key;
  }, [distribution, filterDate, filterMonth, filterYear]);

  const chartData = useMemo(
    () => ({
      labels: distribution.map((d) => d.label),
      datasets: [
        {
          label: 'Spend',
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
    const item = distribution[elements[0].index];
    if (!item) return;

    if (item.type === 'month') {
      dispatch(setMonthFilter({ month: item.month, year: item.year }));
      const d = dayjs(`${item.year}-${String(item.month).padStart(2, '0')}-01`);
      const date = d.isSame(dayjs(), 'month') ? getTodayString() : d.format('YYYY-MM-DD');
      dispatch(setDayFilter({ date }));
      return;
    }

    const date = item.type === 'day' ? item.date : item.endDate;
    if (dayjs(date).isAfter(dayjs(), 'day')) return;
    dispatch(setDayFilter({ date }));
  };

  return (
    <section className="card">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="card-title mb-1">Spending trend</h2>
          <p className="card-desc mb-0">Last {periodMeta.title}. Tap a bar to view it.</p>
        </div>
        <ChartPeriodSelector value={period} onChange={setPeriod} />
      </div>

      {hasAnyData ? (
        <div className="chart-box h-[240px] min-h-[240px] cursor-pointer sm:h-[260px]">
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
                  ticks: {
                    maxRotation: 45,
                    minRotation: distribution.length > 8 ? 45 : 0,
                    font: { size: 10 },
                    maxTicksLimit: period === '1m' ? 10 : undefined,
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
