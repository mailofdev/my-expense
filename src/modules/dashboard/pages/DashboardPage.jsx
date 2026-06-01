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
    <div className="dashboard">
      <DashboardHeader />
      <main className="dashboard__main">
        {error && (
          <div className="alert alert--error dashboard__alert">
            {error}
            <button type="button" onClick={() => dispatch(clearDashboardError())}>×</button>
          </div>
        )}

        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {showDateToolbar && <DateToolbar />}

        <div className="dashboard__content">
          {activeTab === 'overview' && (
            <div className="dashboard-overview">
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
