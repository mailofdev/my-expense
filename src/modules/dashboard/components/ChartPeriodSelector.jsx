import { CHART_UI_PERIODS } from '../utils/chartPeriods';

export default function ChartPeriodSelector({ value, onChange, className = '' }) {
  return (
    <div
      className={`flex w-full gap-0.5 rounded-full border border-edge bg-surface-2/80 p-1 sm:w-auto ${className}`}
      role="tablist"
      aria-label="Time period"
    >
      {CHART_UI_PERIODS.map((period) => {
        const active = period.id === value;
        return (
          <button
            key={period.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={period.title}
            className={`min-h-9 min-w-0 flex-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors sm:flex-none sm:px-3 ${
              active
                ? 'bg-primary text-on-primary shadow-glow'
                : 'bg-transparent text-muted hover:text-ink'
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
