import RecurringExpensesPanel from './RecurringExpensesPanel';
import CategorySettings from './CategorySettings';
import SavingsGoalSettings from './SavingsGoalSettings';
import ExportDataPanel from './ExportDataPanel';

export default function SettingsHub() {
  return (
    <div className="feature-panel">
      <RecurringExpensesPanel />
      <CategorySettings />
      <SavingsGoalSettings />
      <ExportDataPanel />
    </div>
  );
}
