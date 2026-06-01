import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import DashboardHeader from '../components/DashboardHeader';
import DashboardTabs from '../components/DashboardTabs';
import DateToolbar from '../components/DateToolbar';
import OverviewHero from '../components/OverviewHero';
import AddExpenseForm from '../components/AddExpenseForm';
import DailyExpenseLedger from '../components/DailyExpenseLedger';
import WalletTracker from '../components/WalletTracker';
import BudgetManager from '../components/BudgetManager';
import ExpenseAnalyzer from '../components/ExpenseAnalyzer';
import HabitImprover from '../components/HabitImprover';
import { fetchDashboardData, clearDashboardError } from '../store/dashboardSlice';

const DATE_TABS = ['overview', 'analyzer'];

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { loading, loaded, error } = useSelector((state) => state.dashboard);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchDashboardData(user.uid));
    }
  }, [user?.uid, dispatch]);

  useEffect(() => {
    return () => dispatch(clearDashboardError());
  }, [dispatch]);

  if (loading && !loaded) {
    return <LoadingSpinner message="Loading…" />;
  }

  const showDateToolbar = DATE_TABS.includes(activeTab);

  return (
    <div className="min-h-screen min-h-dvh bg-bg">
      <DashboardHeader />
      <main className="mx-auto w-full max-w-lg px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:max-w-xl sm:px-6 sm:pb-10">
        {error && (
          <div className="alert-error mb-4 flex items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              className="border-0 bg-transparent text-xl text-inherit"
              onClick={() => dispatch(clearDashboardError())}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {showDateToolbar && (
          <div className="mt-5">
            <DateToolbar compact={activeTab === 'overview'} />
          </div>
        )}

        <div className="mt-5 flex flex-col gap-5 sm:gap-6">
          {activeTab === 'overview' && (
            <>
              <OverviewHero />
              <AddExpenseForm />
              <DailyExpenseLedger />
            </>
          )}

          {activeTab === 'wallet' && <WalletTracker />}
          {activeTab === 'budget' && <BudgetManager />}
          {activeTab === 'analyzer' && <ExpenseAnalyzer />}
          {activeTab === 'habits' && <HabitImprover />}
        </div>
      </main>
    </div>
  );
}
