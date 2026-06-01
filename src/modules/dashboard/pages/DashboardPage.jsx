import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import DashboardHeader from '../components/DashboardHeader';
import DashboardTabs from '../components/DashboardTabs';
import ExpenseSummary from '../components/ExpenseSummary';
import AddExpenseForm from '../components/AddExpenseForm';
import DayPickerStrip from '../components/DayPickerStrip';
import DailyExpenseLedger from '../components/DailyExpenseLedger';
import DailySpendChart from '../components/DailySpendChart';
import WalletTracker from '../components/WalletTracker';
import BudgetManager from '../components/BudgetManager';
import ExpenseAnalyzer from '../components/ExpenseAnalyzer';
import HabitImprover from '../components/HabitImprover';
import MonthYearFilter from '../components/MonthYearFilter';
import MonthWiseDistribution from '../components/MonthWiseDistribution';
import { fetchDashboardData, clearDashboardError } from '../store/dashboardSlice';

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
        <MonthYearFilter />
        <DayPickerStrip />
        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'overview' && (
          <>
            <ExpenseSummary />
            <div className="dashboard__grid dashboard__grid--overview">
              <div className="dashboard__col dashboard__col--wide">
                <AddExpenseForm />
                <DailyExpenseLedger />
              </div>
              <div className="dashboard__col">
                <DailySpendChart />
                <MonthWiseDistribution />
              </div>
            </div>
          </>
        )}

        {activeTab === 'wallet' && <WalletTracker />}
        {activeTab === 'budget' && <BudgetManager />}
        {activeTab === 'analyzer' && <ExpenseAnalyzer />}
        {activeTab === 'habits' && <HabitImprover />}
      </main>
    </div>
  );
}
