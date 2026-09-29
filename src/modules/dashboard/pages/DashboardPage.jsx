import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import DashboardTabs from '../components/DashboardTabs';
import DateToolbar from '../components/DateToolbar';
import OverviewHero from '../components/OverviewHero';
import ExpenseSearch from '../components/ExpenseSearch';
import HomeReminders from '../components/HomeReminders';
import GettingStarted from '../components/GettingStarted';
import AddExpenseForm from '../components/AddExpenseForm';
import DailyExpenseLedger from '../components/DailyExpenseLedger';
import RecurringPanel from '../components/RecurringPanel';
import SavingsHabit from '../components/SavingsHabit';
import WalletTracker from '../components/WalletTracker';
import ExpenseAnalyzer from '../components/ExpenseAnalyzer';
import SettingsHub from '../components/SettingsHub';
import HelpHub from '../components/HelpHub';
import AdminPage from '../../admin/pages/AdminPage';
import {
  fetchDashboardData,
  clearDashboardError,
  setDayFilter,
  selectTotalSpent,
  selectDueRepeatSignature,
  applyDueRepeats,
} from '../store/dashboardSlice';
import { userService } from '../../auth/services/userService';
import { tabFromUrl, urlFromTab } from '../utils/tabs';
import dayjs from 'dayjs';

const DATE_TABS = ['overview', 'wallet', 'analyzer'];

export default function DashboardPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const { loading, loaded, error } = useSelector((state) => state.dashboard);
  const monthSpent = useSelector(selectTotalSpent);
  const dueRepeatSignature = useSelector(selectDueRepeatSignature);
  const repeatAttempt = useRef('');
  const requestedTab = tabFromUrl(searchParams.get('tab'));
  const activeTab = requestedTab === 'admin' && user?.role !== 'admin' ? 'overview' : requestedTab;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const handleTabChange = (tab, extras = {}) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', urlFromTab(tab));
    if (extras.section) {
      next.set('section', extras.section);
    } else if (tab !== 'settings' && tab !== 'help') {
      next.delete('section');
    } else if (searchParams.get('section') === 'calculator') {
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
      userService.recordLastSeen(user.uid);
    }
  }, [user?.uid, dispatch]);

  useEffect(() => {
    if (!user?.uid || !loaded || !dueRepeatSignature) return undefined;
    if (repeatAttempt.current === dueRepeatSignature) return undefined;
    repeatAttempt.current = dueRepeatSignature;
    dispatch(applyDueRepeats({ uid: user.uid }));
    return undefined;
  }, [user?.uid, loaded, dueRepeatSignature, dispatch]);

  useEffect(() => {
    return () => dispatch(clearDashboardError());
  }, [dispatch]);

  if (loading && !loaded) {
    return (
      <div className="min-h-screen min-h-dvh">
        <DashboardHeader />
        <main className="mx-auto w-full max-w-lg px-4 pt-4 sm:max-w-xl sm:px-6" role="status" aria-live="polite">
          <div className="h-12 animate-pulse rounded-full bg-surface-2" />
          <div className="mt-4 h-44 animate-pulse rounded-lg bg-surface" />
          <div className="mt-4 h-28 animate-pulse rounded-lg bg-surface" />
          <p className="mt-4 text-center text-sm text-muted">Loading your money…</p>
        </main>
      </div>
    );
  }

  const showDateToolbar = DATE_TABS.includes(activeTab);
  const goToIncome = () => handleTabChange('wallet');
  const goToToday = () => handleTabChange('overview');
  const goToGroups = () => handleTabChange('settings', { section: 'groups' });
  const goToCalculator = () => handleTabChange('wallet', { section: 'calculator' });

  return (
    <div className="min-h-screen min-h-dvh">
      <DashboardHeader />
      <main
        className={`mx-auto w-full px-4 pb-[var(--dock-clearance)] pt-1 sm:px-6 ${
          activeTab === 'admin' ? 'max-w-content' : 'max-w-lg sm:max-w-xl'
        }`}
      >
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
              <OverviewHero onAddIncome={goToIncome} />
              <GettingStarted />
              <AddExpenseForm onGoToMoney={goToIncome} onOpenGroups={goToGroups} />
              <RecurringPanel compact />
              <HomeReminders onGoToMoney={goToIncome} />
              {monthSpent > 0 && <SavingsHabit compact />}
              <ExpenseSearch onOpenDay={openExpenseDay} />
              <DailyExpenseLedger onOpenGroups={goToGroups} />
            </>
          )}

          {activeTab === 'wallet' && (
            <WalletTracker
              onGoToHome={goToToday}
              openCalculator={searchParams.get('section') === 'calculator'}
            />
          )}
          {activeTab === 'analyzer' && (
            <ExpenseAnalyzer
              onOpenDay={openExpenseDay}
              onAddExpense={goToToday}
              onEditLimits={goToCalculator}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsHub section={searchParams.get('section') || ''} />
          )}
          {activeTab === 'help' && (
            <HelpHub
              section={searchParams.get('section') || 'whats-new'}
              onSectionChange={(id) => handleTabChange('help', { section: id })}
              onDone={goToToday}
            />
          )}
          {activeTab === 'admin' && <AdminPage embedded />}
        </div>
      </main>
      <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
