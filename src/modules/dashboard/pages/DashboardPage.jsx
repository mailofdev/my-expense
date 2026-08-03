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
import ExpenseAnalyzer from '../components/ExpenseAnalyzer';
import SettingsHub from '../components/SettingsHub';
import { fetchDashboardData, clearDashboardError, setMonthFilter, setDayFilter } from '../store/dashboardSlice';
import { getNowMonthYear, getTodayString } from '../../../core/utils/date';
import dayjs from 'dayjs';

const DATE_TABS = ['overview', 'wallet', 'analyzer'];

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { loading, loaded, error } = useSelector((state) => state.dashboard);
  const [activeTab, setActiveTab] = useState('overview');

  const handleTabChange = (tab) => {
    if (tab === 'wallet') {
      const now = getNowMonthYear();
      dispatch(setMonthFilter({ month: now.month, year: now.year }));
      dispatch(setDayFilter({ date: getTodayString() }));
    }
    setActiveTab(tab);
  };

  const openExpenseDay = (dateStr) => {
    const d = dayjs(dateStr);
    if (!dateStr || !d.isValid()) return;
    dispatch(setDayFilter({ date: d.format('YYYY-MM-DD') }));
    setActiveTab('overview');
  };

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
      <main className="mx-auto w-full max-w-lg px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-3 sm:max-w-xl sm:px-6 sm:pb-10">
        {error && (
          <div className="alert-error mb-3 flex items-center justify-between gap-2">
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

        <div className="dashboard-tabs-sticky">
          <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {showDateToolbar && (
          <div className="mt-4">
            <DateToolbar />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-4 sm:gap-5">
          {activeTab === 'overview' && (
            <>
              <OverviewHero onTabChange={handleTabChange} />
              <AddExpenseForm onGoToWallet={() => handleTabChange('wallet')} />
              <DailyExpenseLedger onFindExpenses={() => handleTabChange('analyzer')} />
            </>
          )}

          {activeTab === 'wallet' && <WalletTracker />}
          {activeTab === 'analyzer' && <ExpenseAnalyzer onOpenDay={openExpenseDay} />}
          {activeTab === 'settings' && <SettingsHub />}
        </div>
      </main>
    </div>
  );
}
