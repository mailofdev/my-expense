import { useState } from 'react';
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
          <span className="block text-sm font-semibold text-[#f0f4f2]">{title}</span>
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

export default function SettingsHub() {
  const [openId, setOpenId] = useState('export');

  return (
    <div className="feature-panel">
      <SettingsSection
        id="export"
        title="Search & export"
        hint="Preview, then PDF or CSV"
        openId={openId}
        onToggle={setOpenId}
      >
        <ExportDataPanel embedded />
      </SettingsSection>
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
