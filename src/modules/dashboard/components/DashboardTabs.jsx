import { useRef } from 'react';

const TABS = [
  {
    id: 'overview',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 10.5V20h11V10.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'wallet',
    label: 'Money',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3.5" y="6" width="17" height="12.5" rx="2" />
        <path d="M3.5 10h17" />
        <circle cx="16.5" cy="14.25" r="1.15" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'analyzer',
    label: 'Charts',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'More',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="6.5" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
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
              <span className="dashboard-tabs__icon">{tab.icon}</span>
              <span className="dashboard-tabs__label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
