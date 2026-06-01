const TABS = [
  { id: 'overview', label: 'Overview', icon: '📋' },
  { id: 'wallet', label: 'Wallet', icon: '👛' },
  { id: 'budget', label: 'Budget', icon: '🎯' },
  { id: 'analyzer', label: 'Analyzer', icon: '📊' },
  { id: 'habits', label: 'Habits', icon: '💡' },
];

export default function DashboardTabs({ activeTab, onTabChange }) {
  return (
    <nav className="dashboard-tabs" aria-label="Dashboard sections">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`dashboard-tabs__btn ${activeTab === tab.id ? 'dashboard-tabs__btn--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-label={tab.label}
          title={tab.label}
        >
          <span className="dashboard-tabs__icon" aria-hidden="true">{tab.icon}</span>
          <span className="dashboard-tabs__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
