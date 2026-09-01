import { useRef } from 'react';

const TABS = [
  { id: 'overview', label: 'Home' },
  { id: 'wallet', label: 'Money' },
  { id: 'analyzer', label: 'Charts' },
  { id: 'settings', label: 'Settings' },
];

export default function DashboardTabs({ activeTab, onTabChange }) {
  const tabRefs = useRef([]);

  const focusTabAt = (index) => {
    const next = (index + TABS.length) % TABS.length;
    tabRefs.current[next]?.focus();
    onTabChange(TABS[next].id);
  };

  const handleKeyDown = (event, index) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTabAt(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTabAt(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTabAt(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTabAt(TABS.length - 1);
    }
  };

  return (
    <nav className="dashboard-tabs" aria-label="Sections">
      <div className="dashboard-tabs__track" role="tablist" aria-orientation="horizontal">
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`dashboard-tabs__tab ${isActive ? 'is-active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className="dashboard-tabs__label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
