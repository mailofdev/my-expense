import RecurringExpensesPanel from './RecurringExpensesPanel';
import CategorySettings from './CategorySettings';
import SavingsGoalSettings from './SavingsGoalSettings';
import AccountSettings from './AccountSettings';
import ExportDataPanel from './ExportDataPanel';

export default function SettingsHub() {
  return (
    <div className="feature-panel">
      <AccountSettings />
      <RecurringExpensesPanel />
      <CategorySettings />
      <SavingsGoalSettings />
      <ExportDataPanel />
    </div>
  );
}
