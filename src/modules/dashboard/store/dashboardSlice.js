import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import {
  CATEGORY_CONFIG,
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
import {
  calculateGroupDebts,
  computeSplitShares,
  mergeSettlements,
  sharesMatchTotal,
} from '../../../core/utils/split';

const getErrorMessage = (error) =>
  error?.message || 'Something went wrong. Please try again.';

const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeMemberName = (name) => name.trim();

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

export const updateExpense = createAsyncThunk(
  'dashboard/updateExpense',
  async ({ uid, expenseId, expense, previousAmount }, { rejectWithValue }) => {
    try {
      const updated = await expenseService.update(uid, expenseId, expense);
      let walletBalance;
      if (previousAmount !== expense.amount) {
        walletBalance = await walletService.adjustBalance(uid, previousAmount - expense.amount);
      }
      return { expense: updated, walletBalance };
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

export const createSplitGroup = createAsyncThunk(
  'dashboard/createSplitGroup',
  async ({ uid, group }, { getState, rejectWithValue }) => {
    try {
      const groups = getState().dashboard.splitGroups;
      const normalizedMembers = Array.from(
        new Set((group.members || []).map(normalizeMemberName).filter(Boolean))
      );
      if (!normalizedMembers.includes('You')) normalizedMembers.unshift('You');
      const debtState = calculateGroupDebts({ members: normalizedMembers, expenses: [] });
      const newGroup = {
        id: generateId('group'),
        name: group.name?.trim() || 'Untitled Group',
        members: normalizedMembers,
        expenses: [],
        balances: debtState.balances,
        settlements: debtState.simplifiedDebts,
        updatedAt: debtState.updatedAt,
        createdAt: new Date().toISOString(),
      };
      const updates = { splitGroups: [newGroup, ...groups] };
      await userService.updateProfile(uid, updates);
      return newGroup;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const addSplitGroupExpense = createAsyncThunk(
  'dashboard/addSplitGroupExpense',
  async ({ uid, groupId, expenseInput }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dashboard;
      const group = state.splitGroups.find((item) => item.id === groupId);
      if (!group) throw new Error('Group not found');

      const amount = Number(expenseInput.amount) || 0;
      if (amount <= 0) throw new Error('Enter a valid amount');

      const participants = (expenseInput.participants?.length
        ? expenseInput.participants
        : group.members
      ).map(normalizeMemberName);

      const paidBy = normalizeMemberName(expenseInput.paidBy || 'You');
      if (!participants.includes(paidBy)) {
        throw new Error('Payer must be included in the split');
      }

      const splitType = expenseInput.splitType || 'equal';
      const shares = computeSplitShares(amount, participants, splitType, expenseInput.splitConfig || {});

      if (!sharesMatchTotal(shares, amount)) {
        throw new Error('Split amounts must add up to the expense total');
      }

      const expense = {
        id: generateId('gexp'),
        title: expenseInput.title?.trim() || 'Shared expense',
        amount,
        paidBy,
        splitType,
        participants,
        shares,
        createdAt: new Date().toISOString(),
      };

      const nextGroups = state.splitGroups.map((item) => {
        if (item.id !== groupId) return item;
        const withExpense = { ...item, expenses: [expense, ...(item.expenses || [])] };
        const debtState = calculateGroupDebts(withExpense);
        const settlements = mergeSettlements(item.settlements, debtState.simplifiedDebts).map(
          (settlement) => ({
            ...settlement,
            dueDate: settlement.dueDate || dayjs().add(7, 'day').format('YYYY-MM-DD'),
          })
        );
        return {
          ...withExpense,
          balances: debtState.balances,
          settlements,
          updatedAt: debtState.updatedAt,
        };
      });

      const activityEntry = {
        id: generateId('act'),
        type: 'split_expense_added',
        text: `${expense.paidBy} added ${expense.title} in ${group.name}`,
        amount: expense.amount,
        createdAt: new Date().toISOString(),
      };
      const updates = {
        splitGroups: nextGroups,
        activityLog: [activityEntry, ...state.activityLog].slice(0, 100),
      };
      await userService.updateProfile(uid, updates);
      return { groupId, expense, updates };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const markSettlementPaid = createAsyncThunk(
  'dashboard/markSettlementPaid',
  async ({ uid, groupId, settlementId }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dashboard;
      const nextGroups = state.splitGroups.map((group) => {
        if (group.id !== groupId) return group;

        const settlement = (group.settlements || []).find((item) => item.id === settlementId);
        if (!settlement || settlement.status === 'paid') return group;

        const payments = [
          ...(group.payments || []),
          {
            id: generateId('pay'),
            from: settlement.from,
            to: settlement.to,
            amount: settlement.amount,
            paidAt: new Date().toISOString(),
          },
        ];

        const withPayments = { ...group, payments };
        const debtState = calculateGroupDebts(withPayments);
        const settlements = mergeSettlements(
          group.settlements.map((item) =>
            item.id === settlementId
              ? { ...item, status: 'paid', paidAt: new Date().toISOString() }
              : item
          ),
          debtState.simplifiedDebts
        );

        return {
          ...withPayments,
          balances: debtState.balances,
          settlements,
          updatedAt: debtState.updatedAt,
        };
      });
      const updates = { splitGroups: nextGroups };
      await userService.updateProfile(uid, updates);
      return updates;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateSettlement = createAsyncThunk(
  'dashboard/updateSettlement',
  async ({ uid, groupId, settlementId, patch }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dashboard;
      const nowIso = new Date().toISOString();
      const nextGroups = state.splitGroups.map((group) => {
        if (group.id !== groupId) return group;
        const settlements = (group.settlements || []).map((settlement) => {
          if (settlement.id !== settlementId) return settlement;
          const paidAmount = Math.max(0, Number(patch.paidAmount ?? settlement.paidAmount ?? 0));
          const totalAmount = Number(settlement.amount) || 0;
          const status = paidAmount >= totalAmount ? 'paid' : patch.status || settlement.status;
          return {
            ...settlement,
            ...patch,
            paidAmount,
            status,
            paidAt: status === 'paid' ? nowIso : settlement.paidAt,
            updatedAt: nowIso,
          };
        });
        return { ...group, settlements };
      });
      await userService.updateProfile(uid, { splitGroups: nextGroups });
      return { splitGroups: nextGroups };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const addRecurringExpenseTemplate = createAsyncThunk(
  'dashboard/addRecurringExpenseTemplate',
  async ({ uid, template }, { getState, rejectWithValue }) => {
    try {
      const current = getState().dashboard.recurringExpenses;
      const nextTemplate = {
        id: generateId('rec'),
        title: template.title?.trim() || 'Recurring expense',
        amount: Number(template.amount) || 0,
        category: template.category || 'Other',
        paymentMode: template.paymentMode || 'UPI',
        cadence: template.cadence || 'monthly',
        nextDate: template.nextDate || getTodayString(),
        endDate: template.endDate || null,
        maxOccurrences: Number(template.maxOccurrences) || null,
        runCount: 0,
        enabled: true,
      };
      const updates = { recurringExpenses: [nextTemplate, ...current] };
      await userService.updateProfile(uid, updates);
      return nextTemplate;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const applyDueRecurringExpenses = createAsyncThunk(
  'dashboard/applyDueRecurringExpenses',
  async ({ uid }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dashboard;
      const today = dayjs(getTodayString());
      const due = state.recurringExpenses.filter(
        (item) =>
          item.enabled &&
          !dayjs(item.nextDate).isAfter(today, 'day') &&
          (!item.endDate || !dayjs(item.endDate).isBefore(today, 'day')) &&
          (!item.maxOccurrences || (item.runCount || 0) < item.maxOccurrences)
      );
      if (!due.length) return { expenses: [], recurringExpenses: state.recurringExpenses };

      const createdExpenses = [];
      let walletBalance = state.walletBalance;
      for (const template of due) {
        const created = await expenseService.create(uid, {
          title: template.title,
          amount: template.amount,
          category: template.category,
          paymentMode: template.paymentMode,
          date: getTodayString(),
        });
        createdExpenses.push(created);
        walletBalance = await walletService.adjustBalance(uid, -(template.amount || 0));
      }

      const nextRecurring = state.recurringExpenses.map((item) => {
        if (!due.some((d) => d.id === item.id)) return item;
        const base = dayjs(item.nextDate);
        const nextDate = item.cadence === 'weekly'
          ? base.add(1, 'week')
          : item.cadence === 'yearly'
            ? base.add(1, 'year')
            : base.add(1, 'month');
        return {
          ...item,
          nextDate: nextDate.format('YYYY-MM-DD'),
          runCount: (item.runCount || 0) + 1,
        };
      });

      const activity = due.map((item) => ({
        id: generateId('act'),
        type: 'recurring_applied',
        text: `Applied recurring expense: ${item.title}`,
        amount: item.amount,
        createdAt: new Date().toISOString(),
      }));

      const updates = {
        recurringExpenses: nextRecurring,
        activityLog: [...activity, ...state.activityLog].slice(0, 100),
      };
      await userService.updateProfile(uid, updates);
      return { expenses: createdExpenses, recurringExpenses: nextRecurring, walletBalance, activity };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateRecurringTemplate = createAsyncThunk(
  'dashboard/updateRecurringTemplate',
  async ({ uid, templateId, updates }, { getState, rejectWithValue }) => {
    try {
      const current = getState().dashboard.recurringExpenses;
      const next = current.map((item) => (item.id === templateId ? { ...item, ...updates } : item));
      await userService.updateProfile(uid, { recurringExpenses: next });
      return next;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const renameCategory = createAsyncThunk(
  'dashboard/renameCategory',
  async ({ uid, oldName, newName }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dashboard;
      const trimmedNew = newName.trim();
      if (!trimmedNew || oldName === trimmedNew) {
        return {
          categories: state.categories,
          expenses: state.expenses,
          recurringExpenses: state.recurringExpenses,
          categoryBudgets: state.categoryBudgets,
        };
      }

      const categories = Array.from(new Set(state.categories.map((c) => (c === oldName ? trimmedNew : c))));
      const toUpdate = state.expenses.filter((e) => e.category === oldName);
      const expenses = state.expenses.map((e) => (e.category === oldName ? { ...e, category: trimmedNew } : e));
      const recurringExpenses = state.recurringExpenses.map((item) =>
        item.category === oldName ? { ...item, category: trimmedNew } : item
      );
      const categoryBudgets = { ...state.categoryBudgets };
      if (categoryBudgets[oldName] !== undefined) {
        categoryBudgets[trimmedNew] = (Number(categoryBudgets[trimmedNew]) || 0) + (Number(categoryBudgets[oldName]) || 0);
        delete categoryBudgets[oldName];
      }

      for (const expense of toUpdate) {
        await expenseService.update(uid, expense.id, { ...expense, category: trimmedNew });
      }

      await userService.updateProfile(uid, { categories, recurringExpenses, categoryBudgets });
      return { categories, expenses, recurringExpenses, categoryBudgets };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'dashboard/deleteCategory',
  async ({ uid, name, fallback = 'Other' }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dashboard;
      if (state.categories.length <= 1) throw new Error('At least one category is required');
      const safeFallback = state.categories.includes(fallback) ? fallback : 'Other';
      const categories = state.categories.filter((item) => item !== name);
      if (!categories.includes(safeFallback)) categories.push(safeFallback);

      const toUpdate = state.expenses.filter((e) => e.category === name);
      const expenses = state.expenses.map((e) => (e.category === name ? { ...e, category: safeFallback } : e));
      const recurringExpenses = state.recurringExpenses.map((item) =>
        item.category === name ? { ...item, category: safeFallback } : item
      );
      const categoryBudgets = { ...state.categoryBudgets };
      if (categoryBudgets[name] !== undefined) {
        categoryBudgets[safeFallback] =
          (Number(categoryBudgets[safeFallback]) || 0) + (Number(categoryBudgets[name]) || 0);
        delete categoryBudgets[name];
      }

      for (const expense of toUpdate) {
        await expenseService.update(uid, expense.id, { ...expense, category: safeFallback });
      }
      await userService.updateProfile(uid, { categories, recurringExpenses, categoryBudgets });
      return { categories, expenses, recurringExpenses, categoryBudgets };
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
    splitGroups: [],
    activityLog: [],
    recurringExpenses: [],
    onboardingSeen: false,
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
      state.walletBalance = 0;
      state.monthlyBudget = 0;
      state.monthlyIncome = 0;
      state.categoryBudgets = {};
      state.habits = { ...DEFAULT_HABITS };
      state.expenses = [];
      state.walletTransactions = [];
      state.splitGroups = [];
      state.activityLog = [];
      state.recurringExpenses = [];
      state.onboardingSeen = false;
      state.loading = false;
      state.saving = false;
      state.error = null;
      state.loaded = false;
    },
    clearDashboardError(state) {
      state.error = null;
    },
    markOnboardingSeen(state) {
      state.onboardingSeen = true;
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
          state.splitGroups = profile.splitGroups ?? [];
          state.activityLog = profile.activityLog ?? [];
          state.recurringExpenses = profile.recurringExpenses ?? [];
          state.onboardingSeen = profile.onboardingSeen ?? false;
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

      .addCase(updateExpense.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateExpense.fulfilled, (state, action) => {
        state.saving = false;
        const { expense, walletBalance } = action.payload;
        const index = state.expenses.findIndex((e) => e.id === expense.id);
        if (index !== -1) {
          state.expenses[index] = { ...state.expenses[index], ...expense };
        }
        if (walletBalance !== undefined) {
          state.walletBalance = walletBalance;
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
      })

      .addCase(createSplitGroup.fulfilled, (state, action) => {
        state.splitGroups.unshift(action.payload);
      })
      .addCase(addSplitGroupExpense.fulfilled, (state, action) => {
        state.splitGroups = action.payload.updates.splitGroups;
        state.activityLog = action.payload.updates.activityLog;
      })
      .addCase(markSettlementPaid.fulfilled, (state, action) => {
        state.splitGroups = action.payload.splitGroups;
      })
      .addCase(updateSettlement.fulfilled, (state, action) => {
        state.splitGroups = action.payload.splitGroups;
      })
      .addCase(addRecurringExpenseTemplate.fulfilled, (state, action) => {
        state.recurringExpenses.unshift(action.payload);
      })
      .addCase(applyDueRecurringExpenses.fulfilled, (state, action) => {
        state.expenses = [...action.payload.expenses, ...state.expenses];
        state.recurringExpenses = action.payload.recurringExpenses;
        state.walletBalance = action.payload.walletBalance;
        state.activityLog = [...action.payload.activity, ...state.activityLog].slice(0, 100);
      })
      .addCase(updateRecurringTemplate.fulfilled, (state, action) => {
        state.recurringExpenses = action.payload;
      })
      .addCase(renameCategory.fulfilled, (state, action) => {
        state.categories = action.payload.categories;
        state.expenses = action.payload.expenses;
        state.recurringExpenses = action.payload.recurringExpenses;
        state.categoryBudgets = action.payload.categoryBudgets;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = action.payload.categories;
        state.expenses = action.payload.expenses;
        state.recurringExpenses = action.payload.recurringExpenses;
        state.categoryBudgets = action.payload.categoryBudgets;
      });
  },
});

export const {
  resetDashboard,
  clearDashboardError,
  setMonthFilter,
  setDayFilter,
  markOnboardingSeen,
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

export const selectSplitOverview = (state) => {
  const groups = state.dashboard.splitGroups || [];
  const totalPending = groups.reduce(
    (sum, group) =>
      sum + (group.settlements || [])
        .filter((item) => item.status === 'pending')
        .reduce((groupSum, item) => groupSum + (item.amount || 0), 0),
    0
  );

  const youOwe = groups.reduce(
    (sum, group) =>
      sum + (group.settlements || [])
        .filter((item) => item.status === 'pending' && item.from === 'You')
        .reduce((s, item) => s + (item.amount || 0), 0),
    0
  );

  const owedToYou = groups.reduce(
    (sum, group) =>
      sum + (group.settlements || [])
        .filter((item) => item.status === 'pending' && item.to === 'You')
        .reduce((s, item) => s + (item.amount || 0), 0),
    0
  );

  return {
    groupsCount: groups.length,
    totalPending,
    youOwe,
    owedToYou,
  };
};

export const selectInAppReminders = (state) => {
  const reminders = [];
  const today = dayjs(getTodayString());
  const split = selectSplitOverview(state);
  const pendingCount = (state.dashboard.splitGroups || []).reduce(
    (sum, group) => sum + (group.settlements || []).filter((item) => item.status === 'pending').length,
    0
  );
  if (pendingCount > 0) {
    reminders.push({
      id: 'pending-settlements',
      tone: 'warning',
      text: `${pendingCount} settlement${pendingCount > 1 ? 's are' : ' is'} pending. Keep shared balances clean.`,
    });
  }
  if (split.youOwe > 0) {
    reminders.push({
      id: 'you-owe',
      tone: 'danger',
      text: `You owe ${split.youOwe.toLocaleString('en-IN')} in groups. Consider closing dues this week.`,
    });
  }
  const dueRecurring = (state.dashboard.recurringExpenses || []).filter(
    (item) => item.enabled && !dayjs(item.nextDate).isAfter(today, 'day')
  );
  if (dueRecurring.length > 0) {
    reminders.push({
      id: 'due-recurring',
      tone: 'info',
      text: `${dueRecurring.length} recurring expense${dueRecurring.length > 1 ? 's are' : ' is'} due today.`,
    });
  }
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
  return reminders.slice(0, 4);
};
