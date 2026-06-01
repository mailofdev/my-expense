const TABS = [
  { id: 'overview', label: 'Home' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'budget', label: 'Budget' },
  { id: 'analyzer', label: 'Charts' },
  { id: 'habits', label: 'Tips' },
];

export default function DashboardTabs({ activeTab, onTabChange }) {
  return (
    <nav
      className="scrollbar-hide flex gap-1 overflow-x-auto"
      aria-label="Sections"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-primary text-bg'
              : 'bg-surface-2 text-muted hover:text-[#f0f4f2]'
          }`}
          onClick={() => onTabChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
