import { useEffect, useState } from 'react';
import GuidePanel from './GuidePanel';
import WhatsNewPanel from './WhatsNewPanel';

const PAGES = [
  { id: 'whats-new', label: 'What’s new' },
  { id: 'guide', label: 'Guide' },
];

export default function HelpHub({ section = 'whats-new', onSectionChange, onDone }) {
  const initial = section === 'guide' ? 'guide' : 'whats-new';
  const [page, setPage] = useState(initial);

  useEffect(() => {
    if (section === 'guide' || section === 'whats-new') setPage(section);
  }, [section]);

  const selectPage = (id) => {
    setPage(id);
    onSectionChange?.(id);
  };

  return (
    <div className="feature-panel">
      <p className="m-0 px-0.5 text-sm text-muted">What changed, and how each screen works.</p>
      <div className="flex gap-2">
        {PAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`min-h-11 flex-1 rounded-full px-3 text-sm font-medium ${
              page === item.id ? 'bg-primary text-on-primary shadow-glow' : 'bg-surface text-ink'
            }`}
            aria-pressed={page === item.id}
            onClick={() => selectPage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section className="card">
        {page === 'guide' ? <GuidePanel onDone={onDone} /> : <WhatsNewPanel />}
      </section>
    </div>
  );
}
