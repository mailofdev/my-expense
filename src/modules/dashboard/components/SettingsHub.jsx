import CategorySettings from './CategorySettings';
import ExportDataPanel from './ExportDataPanel';
import ResetMonthPanel from './ResetMonthPanel';

export default function SettingsHub() {
  return (
    <div className="feature-panel">
      <CategorySettings />
      <ExportDataPanel />
      <ResetMonthPanel />
    </div>
  );
}
