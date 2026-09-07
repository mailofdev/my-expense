import CategorySettings from './CategorySettings';
import GroupsSettings from './GroupsSettings';
import ExportDataPanel from './ExportDataPanel';
import ResetMonthPanel from './ResetMonthPanel';

export default function SettingsHub() {
  return (
    <div className="feature-panel">
      <CategorySettings />
      <GroupsSettings />
      <ExportDataPanel />
      <ResetMonthPanel />
    </div>
  );
}
