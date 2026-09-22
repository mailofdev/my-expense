import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import DashboardHeader from '../components/DashboardHeader';
import DashboardTabs from '../components/DashboardTabs';
import DateToolbar from '../components/DateToolbar';
import OverviewHero from '../components/OverviewHero';
import HomeReminders from '../components/HomeReminders';
import GettingStarted from '../components/GettingStarted';
import AddExpenseForm from '../components/AddExpenseForm';
import DailyExpenseLedger from '../components/DailyExpenseLedger';
import SafeToSpend from '../components/SafeToSpend';
import RecurringPanel from '../components/RecurringPanel';
import WalletTracker from '../components/WalletTracker';
import ExpenseAnalyzer from '../components/ExpenseAnalyzer';
import SettingsHub from '../components/SettingsHub';
import {
  fetchDashboardData,
  clearDashboardError,
  setDayFilter,
  selectMonthWalletFunded,
  selectIsFilterCurrentMonth,
} from '../store/dashboardSlice';
import { tabFromUrl, urlFromTab } from '../utils/tabs';
import dayjs from 'dayjs';

const DATE_TABS = ['overview', 'wallet', 'analyzer'];

export default function DashboardPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const { loading, loaded, error } = useSelector((state) => state.dashboard);
  const monthFunded = useSelector(selectMonthWalletFunded);
  const isCurrentMonth = useSelector(selectIsFilterCurrentMonth);
  const activeTab = tabFromUrl(searchParams.get('tab'));
  const startHomeWithGuide = isCurrentMonth && monthFunded === 0;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const handleTabChange = (tab, extras = {}) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', urlFromTab(tab));
    if (extras.section) {
      next.set('section', extras.section);
    } else if (tab !== 'settings') {
      next.delete('section');
    }
    setSearchParams(next, { replace: true });
  };

  const openExpenseDay = (dateStr) => {
    const d = dayjs(dateStr);
    if (!dateStr || !d.isValid()) return;
    dispatch(setDayFilter({ date: d.format('YYYY-MM-DD') }));
    handleTabChange('overview');
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
  const goToIncome = () => handleTabChange('wallet');
  const goToToday = () => handleTabChange('overview');
  const goToSearch = () => handleTabChange('settings', { section: 'export' });
  const goToGroups = () => handleTabChange('settings', { section: 'groups' });

  return (
    <div className="min-h-screen min-h-dvh">
      <DashboardHeader />
      <main className="mx-auto w-full max-w-lg px-4 pb-[var(--dock-clearance)] pt-1 sm:max-w-xl sm:px-6">
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

        {showDateToolbar && (
          <div className="date-toolbar-sticky">
            <DateToolbar variant={activeTab === 'overview' ? 'day' : 'month'} />
          </div>
        )}

        <div className="mt-3 flex flex-col gap-4 sm:gap-5">
          {activeTab === 'overview' && (
            <>
              {startHomeWithGuide ? (
                <>
                  <GettingStarted onGoToMoney={goToIncome} />
                  <OverviewHero />
                  <SafeToSpend />
                  <AddExpenseForm onGoToMoney={goToIncome} onOpenGroups={goToGroups} />
                </>
              ) : (
                <>
                  <AddExpenseForm onGoToMoney={goToIncome} onOpenGroups={goToGroups} />
                  <OverviewHero />
                  <SafeToSpend />
                  <RecurringPanel compact />
                  <GettingStarted onGoToMoney={goToIncome} />
                  <HomeReminders onGoToMoney={goToIncome} />
                </>
              )}
              <DailyExpenseLedger
                onFindExpenses={goToSearch}
                onOpenGroups={goToGroups}
              />
            </>
          )}

          {activeTab === 'wallet' && <WalletTracker onGoToHome={goToToday} />}
          {activeTab === 'analyzer' && (
            <ExpenseAnalyzer onOpenDay={openExpenseDay} onAddExpense={goToToday} />
          )}
          {activeTab === 'settings' && (
            <SettingsHub section={searchParams.get('section') || ''} />
          )}
        </div>
      </main>
      <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
