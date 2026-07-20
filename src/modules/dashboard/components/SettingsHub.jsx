import CategorySettings from './CategorySettings';
import ExportDataPanel from './ExportDataPanel';

export default function SettingsHub() {
  return (
    <div className="feature-panel">
      <div className="px-1">
        <p className="section-label m-0">Settings</p>
        <p className="m-0 text-sm text-muted">Manage categories and export your data.</p>
      </div>

      <CategorySettings />
      <ExportDataPanel />
    </div>
  );
}
