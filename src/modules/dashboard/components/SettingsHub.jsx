import { useEffect, useState } from 'react';
import GroupsSettings from './GroupsSettings';
import ExportDataPanel from './ExportDataPanel';
import ResetMonthPanel from './ResetMonthPanel';

function SettingsSection({ id, title, hint, openId, onToggle, children }) {
  const open = openId === id;
  return (
    <section className="card p-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => onToggle(open ? '' : id)}
        aria-expanded={open}
        aria-controls={`settings-${id}`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          {!open && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
        </span>
        <span className="shrink-0 text-lg leading-none text-muted" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div id={`settings-${id}`} className="border-t border-edge/50 px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </section>
  );
}

export default function SettingsHub({ section = '' }) {
  const [openId, setOpenId] = useState(section || '');

  useEffect(() => {
    if (section) setOpenId(section);
  }, [section]);

  return (
    <div className="feature-panel">
      <p className="m-0 px-0.5 text-sm text-muted">Search, split bills, or download.</p>
      <SettingsSection
        id="groups"
        title="People groups"
        hint="Split with friends"
        openId={openId}
        onToggle={setOpenId}
      >
        <GroupsSettings embedded />
      </SettingsSection>
      <SettingsSection
        id="export"
        title="Find & download"
        hint="Search, then PDF or CSV"
        openId={openId}
        onToggle={setOpenId}
      >
        <ExportDataPanel embedded />
      </SettingsSection>
      <SettingsSection
        id="reset"
        title="Reset this month"
        hint="Clear and start over"
        openId={openId}
        onToggle={setOpenId}
      >
        <ResetMonthPanel embedded />
      </SettingsSection>
    </div>
  );
}
