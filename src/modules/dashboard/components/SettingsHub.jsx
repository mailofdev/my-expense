import { useState } from 'react';
import RecurringExpensesPanel from './RecurringExpensesPanel';
import CategorySettings from './CategorySettings';
import SavingsGoalSettings from './SavingsGoalSettings';
import AccountSettings from './AccountSettings';
import ExportDataPanel from './ExportDataPanel';
import DisclosureToggle from '../../../shared/components/DisclosureToggle';

export default function SettingsHub() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="feature-panel">
      <AccountSettings />
      <RecurringExpensesPanel />
      <CategorySettings />

      <DisclosureToggle
        open={showAdvanced}
        onToggle={() => setShowAdvanced((prev) => !prev)}
        title="More settings"
        hintClosed="Savings goal, export"
        hintOpen="Tap to hide"
        controlsId="advanced-settings"
      />
      {showAdvanced && (
        <div id="advanced-settings" className="contents">
          <SavingsGoalSettings />
          <ExportDataPanel />
        </div>
      )}
    </div>
  );
}
