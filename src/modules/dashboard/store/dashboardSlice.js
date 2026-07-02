import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import {
  CATEGORY_CONFIG,
  CATEGORIES,
  PAYMENT_MODES,
} from '../../../core/constants/finance';
import {
  getNowMonthYear,
  getTodayString,
  isInMonthYear,
  formatMonthYearLabel,
  formatDayLabel,
  resolveFilterDateForMonth,
  getMonthKey,
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
      const monthlyWallets = profile
        ? await walletService.migrateLegacyBalance(uid, profile, expenses, walletTransactions)
        : {};
      return { profile, expenses, walletTransactions, monthlyWallets };
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
      return { expense: created };
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
      return { expenseId };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateExpense = createAsyncThunk(
  'dashboard/updateExpense',
  async ({ uid, expenseId, expense, previousAmount }, { rejectWithValue }) => {
    try {
      const updated = await expenseService.update(uid, expenseId, expense);
      return { expense: updated };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const addWalletFunds = createAsyncThunk(
  'dashboard/addWalletFunds',
  async ({ uid, amount, note, monthKey }, { rejectWithValue }) => {
    try {
      const result = await walletService.addFunds(uid, { amount, note, monthKey });
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

const initialMonthYear = getNowMonthYear();

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    filterMonth: initialMonthYear.month,
    filterYear: initialMonthYear.year,
    filterDate: getTodayString(),
    monthlyWallets: {},
    monthlyBudget: 0,
    expenses: [],
    walletTransactions: [],
    categories: CATEGORIES,
    categoryColors: CATEGORY_CONFIG,
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
      state.monthlyWallets = {};
      state.monthlyBudget = 0;
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
        const { profile, expenses, walletTransactions, monthlyWallets } = action.payload;
        if (profile) {
          state.monthlyWallets = monthlyWallets ?? profile.monthlyWallets ?? {};
          state.monthlyBudget = profile.monthlyBudget ?? 0;
          state.categories = profile.categories?.length ? profile.categories : CATEGORIES;
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
      })
      .addCase(addExpense.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(removeExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter((e) => e.id !== action.payload.expenseId);
      })

      .addCase(updateExpense.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateExpense.fulfilled, (state, action) => {
        state.saving = false;
        const { expense } = action.payload;
        const index = state.expenses.findIndex((e) => e.id === expense.id);
        if (index !== -1) {
          state.expenses[index] = { ...state.expenses[index], ...expense };
        }
      })
      .addCase(updateExpense.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(addWalletFunds.pending, (state) => {
        state.saving = true;
      })
      .addCase(addWalletFunds.fulfilled, (state, action) => {
        state.saving = false;
        state.monthlyWallets = action.payload.monthlyWallets;
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
      });
  },
});

export const {
  resetDashboard,
  clearDashboardError,
  setMonthFilter,
  setDayFilter,
} =
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

export const selectFilterMonthKey = (state) => {
  const { month, year } = selectFilter(state);
  return getMonthKey(month, year);
};

export const selectMonthWalletFunded = (state) => {
  const key = selectFilterMonthKey(state);
  return state.dashboard.monthlyWallets[key] || 0;
};

export const selectMonthWalletRemaining = (state) => {
  const funded = selectMonthWalletFunded(state);
  if (!funded) return 0;
  return funded - selectTotalSpent(state);
};

export const selectMonthWalletStatsByDate = (state, dateStr, excludeExpenseId = null) => {
  const d = dayjs(dateStr);
  const monthKey = getMonthKey(d.month() + 1, d.year());
  const month = d.month() + 1;
  const year = d.year();
  const funded = state.dashboard.monthlyWallets[monthKey] || 0;
  const spent = state.dashboard.expenses
    .filter((e) => isInMonthYear(e.date, month, year) && e.id !== excludeExpenseId)
    .reduce((sum, e) => sum + e.amount, 0);
  const remaining = funded ? funded - spent : 0;
  return { monthKey, monthLabel: formatMonthYearLabel(month, year), funded, spent, remaining };
};

export const selectMonthWalletUsagePercent = (state) => {
  const funded = selectMonthWalletFunded(state);
  if (!funded) return 0;
  const spent = selectTotalSpent(state);
  return Math.round((spent / funded) * 100);
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

export const selectTopCategories = (state) => {
  const grouped = selectExpensesByCategory(state);
  return Object.entries(grouped)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
};

export const selectInAppReminders = (state) => {
  const reminders = [];
  if (state.dashboard.monthlyBudget > 0) {
    const remaining = selectBudgetRemaining(state);
    if (remaining < 0) {
      reminders.push({
        id: 'budget-over',
        tone: 'danger',
        text: `Budget exceeded by ${Math.abs(remaining).toLocaleString('en-IN')}.`,
      });
    }
  }
  const walletFunded = selectMonthWalletFunded(state);
  const walletRemaining = selectMonthWalletRemaining(state);
  const monthSpent = selectTotalSpent(state);
  if (walletFunded === 0 && (selectIsFilterCurrentMonth(state) || monthSpent > 0)) {
    reminders.push({
      id: 'fund-month-wallet',
      tone: 'info',
      action: 'wallet',
      text: selectIsFilterCurrentMonth(state)
        ? 'Add your wallet amount for this month to start tracking spends.'
        : `Fund your wallet for ${selectFilteredMonthLabel(state)} to track that month's balance.`,
    });
  } else if (walletFunded > 0 && walletRemaining < 0) {
    reminders.push({
      id: 'wallet-over',
      tone: 'danger',
      action: 'wallet',
      text: `Wallet overspent by ${Math.abs(walletRemaining).toLocaleString('en-IN')} this month.`,
    });
  } else if (walletFunded > 0 && walletRemaining <= walletFunded * 0.2) {
    reminders.push({
      id: 'wallet-low',
      tone: 'warning',
      action: 'wallet',
      text: `Only ${Math.max(0, walletRemaining).toLocaleString('en-IN')} left in this month's wallet.`,
    });
  }
  return reminders.slice(0, 4);
};
