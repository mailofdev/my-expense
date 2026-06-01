const TABS = [
  { id: 'overview', label: 'Overview', icon: '📋' },
  { id: 'wallet', label: 'Wallet', icon: '👛' },
  { id: 'budget', label: 'Budget', icon: '🎯' },
  { id: 'analyzer', label: 'Analyzer', icon: '📊' },
  { id: 'habits', label: 'Habits', icon: '💡' },
];

export default function DashboardTabs({ activeTab, onTabChange }) {
  return (
    <nav
      className="scrollbar-hide flex gap-1 overflow-x-auto rounded border border-edge bg-surface p-1.5"
      aria-label="Dashboard sections"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`flex min-h-[44px] flex-1 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-sm border-0 px-3 py-2 text-sm font-medium transition-all sm:px-4 ${
            activeTab === tab.id
              ? 'bg-surface-2 text-primary shadow-sm'
              : 'bg-transparent text-muted hover:text-[#f0f4f2]'
          }`}
          onClick={() => onTabChange(tab.id)}
          aria-label={tab.label}
          title={tab.label}
        >
          <span className="text-lg" aria-hidden="true">
            {tab.icon}
          </span>
          <span className="max-[479px]:hidden">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
