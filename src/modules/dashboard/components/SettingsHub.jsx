import CategorySettings from './CategorySettings';
import RecurringExpensesPanel from './RecurringExpensesPanel';
import ExportDataPanel from './ExportDataPanel';

export default function SettingsHub() {
  return (
    <div className="feature-panel">
      <RecurringExpensesPanel />
      <CategorySettings />
      <ExportDataPanel />
    </div>
  );
}
