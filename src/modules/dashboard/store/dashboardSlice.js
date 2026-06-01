import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import {
  CATEGORY_COLORS,
  CATEGORIES,
  PAYMENT_MODES,
  DEFAULT_HABITS,
} from '../../../core/constants/finance';
import {
  getNowMonthYear,
  getTodayString,
  isInMonthYear,
  formatMonthYearLabel,
  formatDayLabel,
  resolveFilterDateForMonth,
} from '../../../core/utils/date';
import { expenseService } from '../services/expenseService';
import { walletService } from '../services/walletService';
import { userService } from '../../auth/services/userService';

const getErrorMessage = (error) =>
  error?.message || 'Something went wrong. Please try again.';

export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchAll',
  async (uid, { rejectWithValue }) => {
    try {
      const [profile, expenses, walletTransactions] = await Promise.all([
        userService.getProfile(uid),
        expenseService.fetchAll(uid),
        walletService.fetchTransactions(uid),
      ]);
      return { profile, expenses, walletTransactions };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const addExpense = createAsyncThunk(
  'dashboard/addExpense',
  async ({ uid, expense }, { rejectWithValue }) => {
    try {
      const created = await expenseService.create(uid, expense);
      const newBalance = await walletService.adjustBalance(uid, -expense.amount);
      return { expense: created, walletBalance: newBalance };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const removeExpense = createAsyncThunk(
  'dashboard/removeExpense',
  async ({ uid, expenseId, amount }, { rejectWithValue }) => {
    try {
      await expenseService.remove(uid, expenseId);
      const newBalance = await walletService.adjustBalance(uid, amount);
      return { expenseId, walletBalance: newBalance };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const addWalletFunds = createAsyncThunk(
  'dashboard/addWalletFunds',
  async ({ uid, amount, note }, { rejectWithValue }) => {
    try {
      const result = await walletService.addFunds(uid, { amount, note });
      return result;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateFinanceSettings = createAsyncThunk(
  'dashboard/updateFinanceSettings',
  async ({ uid, updates }, { rejectWithValue }) => {
    try {
      await userService.updateProfile(uid, updates);
      return updates;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const markWeeklyReview = createAsyncThunk(
  'dashboard/markWeeklyReview',
  async ({ uid, habits }, { rejectWithValue }) => {
    try {
      const updatedHabits = {
        ...habits,
        lastWeeklyReview: dayjs().format('YYYY-MM-DD'),
      };
      await userService.updateProfile(uid, { habits: updatedHabits });
      return updatedHabits;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const initialMonthYear = getNowMonthYear();

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    filterMonth: initialMonthYear.month,
    filterYear: initialMonthYear.year,
    filterDate: getTodayString(),
    walletBalance: 0,
    monthlyBudget: 0,
    monthlyIncome: 0,
    categoryBudgets: {},
    habits: { ...DEFAULT_HABITS },
    expenses: [],
    walletTransactions: [],
    categories: CATEGORIES,
    categoryColors: CATEGORY_COLORS,
    paymentModes: PAYMENT_MODES,
    loading: false,
    saving: false,
    error: null,
    loaded: false,
  },
  reducers: {
    setMonthFilter(state, action) {
      const { month, year } = action.payload;
      state.filterMonth = month;
      state.filterYear = year;
      state.filterDate = resolveFilterDateForMonth(month, year, state.filterDate);
    },
    setDayFilter(state, action) {
      const date = action.payload.date;
      state.filterDate = date;
      const d = dayjs(date);
      state.filterMonth = d.month() + 1;
      state.filterYear = d.year();
    },
    resetDashboard(state) {
      const now = getNowMonthYear();
      state.filterMonth = now.month;
      state.filterYear = now.year;
      state.filterDate = getTodayString();
      state.walletBalance = 0;
      state.monthlyBudget = 0;
      state.monthlyIncome = 0;
      state.categoryBudgets = {};
      state.habits = { ...DEFAULT_HABITS };
      state.expenses = [];
      state.walletTransactions = [];
      state.loading = false;
      state.saving = false;
      state.error = null;
      state.loaded = false;
    },
    clearDashboardError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        const { profile, expenses, walletTransactions } = action.payload;
        if (profile) {
          state.walletBalance = profile.walletBalance ?? 0;
          state.monthlyBudget = profile.monthlyBudget ?? 0;
          state.monthlyIncome = profile.monthlyIncome ?? 0;
          state.categoryBudgets = profile.categoryBudgets ?? {};
          state.habits = profile.habits ?? { ...DEFAULT_HABITS };
        }
        state.expenses = expenses;
        state.walletTransactions = walletTransactions;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(addExpense.pending, (state) => {
        state.saving = true;
      })
      .addCase(addExpense.fulfilled, (state, action) => {
        state.saving = false;
        state.expenses.unshift(action.payload.expense);
        state.walletBalance = action.payload.walletBalance;
        state.habits.expensesLoggedThisWeek =
          (state.habits.expensesLoggedThisWeek || 0) + 1;
      })
      .addCase(addExpense.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(removeExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter((e) => e.id !== action.payload.expenseId);
        state.walletBalance = action.payload.walletBalance;
      })

      .addCase(addWalletFunds.pending, (state) => {
        state.saving = true;
      })
      .addCase(addWalletFunds.fulfilled, (state, action) => {
        state.saving = false;
        state.walletBalance = action.payload.walletBalance;
        state.walletTransactions.unshift({
          ...action.payload.transaction,
          createdAt: new Date().toISOString(),
        });
      })
      .addCase(addWalletFunds.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(updateFinanceSettings.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateFinanceSettings.fulfilled, (state, action) => {
        state.saving = false;
        Object.assign(state, action.payload);
      })
      .addCase(updateFinanceSettings.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(markWeeklyReview.fulfilled, (state, action) => {
        state.habits = action.payload;
      });
  },
});

export const { resetDashboard, clearDashboardError, setMonthFilter, setDayFilter } =
  dashboardSlice.actions;
export default dashboardSlice.reducer;

// Selectors
const selectFilter = (state) => ({
  month: state.dashboard.filterMonth,
  year: state.dashboard.filterYear,
});

export const selectFilteredMonthLabel = (state) => {
  const { month, year } = selectFilter(state);
  return formatMonthYearLabel(month, year);
};

export const selectIsFilterCurrentMonth = (state) => {
  const now = getNowMonthYear();
  const { month, year } = selectFilter(state);
  return month === now.month && year === now.year;
};

export const selectFilterDate = (state) => state.dashboard.filterDate;

export const selectMonthExpenses = (state) => {
  const { month, year } = selectFilter(state);
  return state.dashboard.expenses
    .filter((e) => isInMonthYear(e.date, month, year))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
};

export const selectDayExpenses = (state) => {
  const date = state.dashboard.filterDate;
  return state.dashboard.expenses
    .filter((e) => e.date === date)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const selectDayTotal = (state) =>
  selectDayExpenses(state).reduce((sum, e) => sum + e.amount, 0);

export const selectFilteredDayLabel = (state) =>
  formatDayLabel(state.dashboard.filterDate);

export const selectIsTodaySelected = (state) =>
  state.dashboard.filterDate === getTodayString();

export const selectExpensesGroupedByDay = (state) => {
  const monthExpenses = selectMonthExpenses(state);
  const groups = {};

  monthExpenses.forEach((expense) => {
    if (!groups[expense.date]) {
      groups[expense.date] = { date: expense.date, expenses: [], total: 0 };
    }
    groups[expense.date].expenses.push(expense);
    groups[expense.date].total += expense.amount;
  });

  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
};

export const selectMonthDayCalendar = (state) => {
  const { month, year } = selectFilter(state);
  const filterDate = state.dashboard.filterDate;
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  const daysInMonth = start.daysInMonth();
  const today = getTodayString();
  const days = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = start.date(d).format('YYYY-MM-DD');
    const dayExpenses = state.dashboard.expenses.filter((e) => e.date === date);
    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    days.push({
      date,
      dayNum: d,
      weekday: start.date(d).format('dd')[0],
      total,
      count: dayExpenses.length,
      isToday: date === today,
      isSelected: date === filterDate,
      isFuture: dayjs(date).isAfter(dayjs(), 'day'),
    });
  }
  return days;
};

export const selectMonthlyDistribution = (state) => {
  const grouped = {};
  state.dashboard.expenses.forEach((expense) => {
    const key = dayjs(expense.date).format('YYYY-MM');
    grouped[key] = (grouped[key] || 0) + expense.amount;
  });

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = dayjs().subtract(i, 'month');
    const key = d.format('YYYY-MM');
    months.push({
      key,
      label: d.format('MMM YY'),
      month: d.month() + 1,
      year: d.year(),
      amount: grouped[key] || 0,
    });
  }
  return months;
};

export const selectTotalSpent = (state) =>
  selectMonthExpenses(state).reduce((sum, e) => sum + e.amount, 0);

export const selectBudgetRemaining = (state) =>
  state.dashboard.monthlyBudget - selectTotalSpent(state);

export const selectExpensesByCategory = (state) => {
  const grouped = {};
  selectMonthExpenses(state).forEach((expense) => {
    grouped[expense.category] = (grouped[expense.category] || 0) + expense.amount;
  });
  return grouped;
};

export const selectSavingsRate = (state) => {
  const spent = selectTotalSpent(state);
  const income = state.dashboard.monthlyIncome;
  if (!income) return 0;
  return Math.round(((income - spent) / income) * 100);
};

export const selectDailySpendTrend = (state) => {
  const { month, year } = selectFilter(state);
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  const daysInMonth = start.daysInMonth();
  const days = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = start.date(d);
    const key = date.format('YYYY-MM-DD');
    const total = state.dashboard.expenses
      .filter((e) => e.date === key)
      .reduce((sum, e) => sum + e.amount, 0);
    days.push({
      label: String(d),
      amount: total,
      date: key,
      isSelected: key === state.dashboard.filterDate,
    });
  }
  return days;
};

export const selectTopCategories = (state) => {
  const grouped = selectExpensesByCategory(state);
  return Object.entries(grouped)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
};

export const selectHabitInsights = (state) => {
  const spent = selectTotalSpent(state);
  const income = state.dashboard.monthlyIncome;
  const budget = state.dashboard.monthlyBudget;
  const byCategory = selectExpensesByCategory(state);
  const insights = [];

  if (!state.dashboard.loaded) return insights;

  const monthExpenses = selectMonthExpenses(state);
  const monthLabel = selectFilteredMonthLabel(state);

  if (state.dashboard.expenses.length === 0) {
    insights.push({
      type: 'info',
      icon: '📝',
      text: 'Log your first expense to unlock personalized insights.',
    });
    return insights;
  }

  if (monthExpenses.length === 0) {
    insights.push({
      type: 'info',
      icon: '📅',
      text: `No expenses in ${monthLabel}. Pick another month or add an expense for this period.`,
    });
    return insights;
  }

  const dayTotal = selectDayTotal(state);
  const dayLabel = selectFilteredDayLabel(state);
  if (selectIsTodaySelected(state) && dayTotal === 0) {
    insights.push({
      type: 'action',
      icon: '✏️',
      text: 'Log today\'s spends before end of day — small UPI payments add up fast.',
    });
  } else if (dayTotal > 0) {
    insights.push({
      type: 'tip',
      icon: '📒',
      text: `${dayLabel}: ₹${dayTotal.toLocaleString('en-IN')} logged. Keep tracking day by day!`,
    });
  }

  const foodSpend = byCategory.Food || 0;
  if (income > 0 && foodSpend / income > 0.3) {
    insights.push({
      type: 'warning',
      icon: '🍽️',
      text: 'Food spending is over 30% of income. Try meal planning to save more.',
    });
  }

  if (budget > 0 && spent > budget) {
    insights.push({
      type: 'danger',
      icon: '⚠️',
      text: `You've exceeded your monthly budget by ₹${(spent - budget).toLocaleString('en-IN')}.`,
    });
  } else if (budget > 0 && spent > budget * 0.8) {
    insights.push({
      type: 'warning',
      icon: '📊',
      text: 'You have used 80%+ of your budget. Slow down discretionary spends.',
    });
  }

  const upiCount = selectMonthExpenses(state).filter((e) => e.paymentMode === 'UPI').length;
  if (upiCount >= 5) {
    insights.push({
      type: 'tip',
      icon: '📱',
      text: `${upiCount} UPI transactions this month. Review small daily UPI spends on Sundays.`,
    });
  }

  const savingsRate = selectSavingsRate(state);
  const goal = state.dashboard.habits?.savingsGoalPercent ?? 20;
  if (income > 0 && savingsRate < goal) {
    insights.push({
      type: 'tip',
      icon: '🎯',
      text: `Savings rate is ${savingsRate}%. Your goal is ${goal}% — cut one non-essential category.`,
    });
  } else if (income > 0 && savingsRate >= goal) {
    insights.push({
      type: 'success',
      icon: '✅',
      text: `Great job! You're meeting your ${goal}% savings goal.`,
    });
  }

  const lastReview = state.dashboard.habits?.lastWeeklyReview;
  if (!lastReview || dayjs().diff(dayjs(lastReview), 'day') >= 7) {
    insights.push({
      type: 'action',
      icon: '📅',
      text: 'Time for your weekly money review. Check expenses and adjust budget.',
    });
  }

  return insights;
};
