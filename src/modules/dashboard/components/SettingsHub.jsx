import CategorySettings from './CategorySettings';
import ExportDataPanel from './ExportDataPanel';

export default function SettingsHub() {
  return (
    <div className="feature-panel">
      <CategorySettings />
      <ExportDataPanel />
    </div>
  );
}
