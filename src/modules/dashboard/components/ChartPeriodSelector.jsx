import { CHART_PERIODS } from '../utils/chartPeriods';

export default function ChartPeriodSelector({ value, onChange, className = '' }) {
  return (
    <div
      className={`scrollbar-hide flex gap-1 overflow-x-auto ${className}`}
      role="tablist"
      aria-label="Time period"
    >
      {CHART_PERIODS.map((period) => {
        const active = period.id === value;
        return (
          <button
            key={period.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={period.title}
            className={`shrink-0 rounded-sm px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? 'bg-primary text-bg'
                : 'bg-surface-2 text-muted hover:text-[#f0f4f2]'
            }`}
            onClick={() => onChange(period.id)}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
