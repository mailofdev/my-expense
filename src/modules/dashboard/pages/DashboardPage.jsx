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
    return <LoadingSpinner message="Loading your finances..." />;
  }

  const showDateToolbar = DATE_TABS.includes(activeTab);

  return (
    <div
      className="min-h-screen min-h-dvh"
      style={{
        background:
          'radial-gradient(ellipse 60% 40% at 100% 0%, rgba(232, 197, 71, 0.08), transparent), #0a0f0d',
      }}
    >
      <DashboardHeader />
      <main className="mx-auto w-full max-w-content px-3 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-8 sm:pt-4">
        {error && (
          <div className="alert-error mb-3 flex items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              className="border-0 bg-transparent text-xl text-inherit"
              onClick={() => dispatch(clearDashboardError())}
            >
              ×
            </button>
          </div>
        )}

        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {showDateToolbar && <div className="mt-3"><DateToolbar /></div>}

        <div className="mt-3 flex flex-col gap-3 sm:gap-4">
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-3 sm:gap-4">
              <OverviewHero />
              <AddExpenseForm />
              <DailyExpenseLedger />
            </div>
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
