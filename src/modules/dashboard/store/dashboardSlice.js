import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import {
  CATEGORIES,
  PAYMENT_MODES,
  DEFAULT_HABITS,
  DEFAULT_CATEGORY_COLORS,
  buildCategoryColors,
  getCategoryLimitLevel,
  getCategoryLimitPercent,
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
import { resolveMonthIncome, advanceRecurringNextDate } from '../utils/moneyFlows';
import {
  computeAccountBalances,
  ensureAccounts,
  getDefaultAccountId,
  normalizeAccount,
  sumCashBalances,
  sumCreditOutstanding,
  withAccountBalanceViews,
  MAX_ACCOUNTS,
} from '../utils/accounts';
import {
  DEFAULT_MAIN_CATEGORIES,
  ensureMainCategories,
  ensureSubcategories,
  getAllCategoryNames,
  getMainById,
  getMainByName,
  getVisibleCategoryNames,
  normalizeCategoryProfile,
  remapCategoryBudgets,
  resolveMainCategoryName,
} from '../utils/categories';
import { ensurePeopleGroups, resolveSelfMemberName } from '../utils/groups';
const getErrorMessage = (error) =>
  error?.message || 'Something went wrong. Please try again.';

const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

      let nextProfile = profile;
      let nextExpenses = expenses;
      if (profile) {
        const normalized = normalizeCategoryProfile(profile);
        const { mainCategories, subcategories, categories } = normalized;
        const categoryColors = buildCategoryColors(getAllCategoryNames(mainCategories));
        const categoryBudgets = remapCategoryBudgets(profile.categoryBudgets, mainCategories);

        const { accounts, accountOpenings } = await walletService.ensureAccountProfile(uid, profile);

        // Remap legacy expense / recurring category labels onto current mains.
        nextExpenses = (expenses || []).map((expense) => {
          const resolved = resolveMainCategoryName(expense.category, mainCategories);
          if (resolved === expense.category) return expense;
          return { ...expense, category: resolved };
        });
        const recurringExpenses = (profile.recurringExpenses || []).map((item) => {
          const resolved = resolveMainCategoryName(item.category, mainCategories);
          if (resolved === item.category) return item;
          return { ...item, category: resolved };
        });

        const profilePatch = {
          mainCategories,
          subcategories,
          categories,
          categoryColors,
          categoryBudgets,
          recurringExpenses,
        };
        const needsPersist =
          JSON.stringify(mainCategories) !== JSON.stringify(profile.mainCategories || []) ||
          JSON.stringify(subcategories) !== JSON.stringify(profile.subcategories || {}) ||
          JSON.stringify(categories) !== JSON.stringify(profile.categories || []) ||
          JSON.stringify(categoryColors) !== JSON.stringify(profile.categoryColors || {}) ||
          JSON.stringify(categoryBudgets) !== JSON.stringify(profile.categoryBudgets || {}) ||
          JSON.stringify(recurringExpenses) !== JSON.stringify(profile.recurringExpenses || []);

        if (needsPersist) {
          await userService.updateProfile(uid, profilePatch);
        }

        // Persist remapped expense categories in the background (best-effort).
        const expenseRemaps = (expenses || []).filter((expense, index) => {
          return nextExpenses[index]?.category !== expense.category;
        });
        for (const expense of expenseRemaps) {
          const resolved = resolveMainCategoryName(expense.category, mainCategories);
          try {
            await expenseService.update(uid, expense.id, { ...expense, category: resolved });
          } catch {
            // Keep in-memory remap even if a write fails.
          }
        }

        nextProfile = {
          ...profile,
          ...profilePatch,
          accounts,
          accountOpenings,
        };
      }

      return {
        profile: nextProfile,
        expenses: nextExpenses,
        walletTransactions,
        monthlyWallets,
      };
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
  async ({ uid, amount, note, monthKey, source, accountId, date }, { rejectWithValue }) => {
    try {
      const result = await walletService.addFunds(uid, {
        amount,
        note,
        monthKey,
        source,
        accountId,
        date,
      });
      return result;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateWalletCredit = createAsyncThunk(
  'dashboard/updateWalletCredit',
  async ({ uid, txId, amount, note, accountId, date }, { rejectWithValue }) => {
    try {
      return await walletService.updateCredit(uid, txId, { amount, note, accountId, date });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const removeWalletCredit = createAsyncThunk(
  'dashboard/removeWalletCredit',
  async ({ uid, txId }, { rejectWithValue }) => {
    try {
      return await walletService.removeCredit(uid, txId);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const transferBetweenAccounts = createAsyncThunk(
  'dashboard/transferBetweenAccounts',
  async ({ uid, amount, fromAccountId, toAccountId, note, date }, { rejectWithValue }) => {
    try {
      return await walletService.transferFunds(uid, {
        amount,
        fromAccountId,
        toAccountId,
        note,
        date,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateWalletTransfer = createAsyncThunk(
  'dashboard/updateWalletTransfer',
  async (
    { uid, txId, amount, fromAccountId, toAccountId, note, date },
    { rejectWithValue }
  ) => {
    try {
      return await walletService.updateTransfer(uid, txId, {
        amount,
        fromAccountId,
        toAccountId,
        note,
        date,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const removeWalletTransfer = createAsyncThunk(
  'dashboard/removeWalletTransfer',
  async ({ uid, txId }, { rejectWithValue }) => {
    try {
      return await walletService.removeTransfer(uid, txId);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateFinanceSettings = createAsyncThunk(
  'dashboard/updateFinanceSettings',
  async ({ uid, updates }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dashboard;
      const next = { ...updates };

      if (Array.isArray(next.mainCategories) || next.subcategories) {
        const mainCategories = ensureMainCategories(
          next.mainCategories || state.mainCategories,
          next.categories || state.categories
        );
        const subcategories = ensureSubcategories(
          next.subcategories !== undefined ? next.subcategories : state.subcategories,
          mainCategories
        );
        const visible = getVisibleCategoryNames(mainCategories);
        const categories =
          visible.length > 0 ? visible : getAllCategoryNames(mainCategories);

        next.mainCategories = mainCategories;
        next.subcategories = subcategories;
        next.categories = categories;
        next.categoryColors = buildCategoryColors(getAllCategoryNames(mainCategories));

        if (next.categoryBudgets && typeof next.categoryBudgets === 'object') {
          next.categoryBudgets = remapCategoryBudgets(next.categoryBudgets, mainCategories);
        }
      } else if (Array.isArray(next.categories)) {
        // Legacy path: treat as visible-name list → map onto existing mains by rename only.
        const mainCategories = ensureMainCategories(state.mainCategories, next.categories);
        next.mainCategories = mainCategories;
        next.subcategories = ensureSubcategories(state.subcategories, mainCategories);
        next.categories =
          getVisibleCategoryNames(mainCategories).length > 0
            ? getVisibleCategoryNames(mainCategories)
            : getAllCategoryNames(mainCategories);
        next.categoryColors = buildCategoryColors(getAllCategoryNames(mainCategories));
      }

      if (Array.isArray(next.accounts)) {
        const seen = new Set();
        const accounts = [];
        for (const raw of next.accounts) {
          const account = normalizeAccount(raw);
          if (!account) continue;
          const key = account.name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          accounts.push(account);
          if (accounts.length >= MAX_ACCOUNTS) break;
        }
        if (accounts.length === 0) {
          throw new Error('Keep at least one bank');
        }
        next.accounts = accounts;
        if (next.accountOpenings && typeof next.accountOpenings === 'object') {
          const openings = {};
          accounts.forEach((account) => {
            openings[account.id] = Number(next.accountOpenings[account.id]) || 0;
          });
          next.accountOpenings = openings;
        }
      }
      if (Array.isArray(next.peopleGroups)) {
        next.peopleGroups = ensurePeopleGroups(next.peopleGroups, [], {
          selfName: resolveSelfMemberName(getState().auth?.user),
        });
      }
      await userService.updateProfile(uid, next);
      return next;
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
        category: template.category || 'Miscellaneous',
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
      const due = state.recurringExpenses.filter((item) => {
        if (!item?.enabled || !item.nextDate) return false;
        const next = dayjs(item.nextDate);
        if (!next.isValid()) return false;
        if (next.isAfter(today, 'day')) return false;
        if (item.endDate && dayjs(item.endDate).isValid() && dayjs(item.endDate).isBefore(today, 'day')) {
          return false;
        }
        if (item.maxOccurrences && (item.runCount || 0) >= item.maxOccurrences) return false;
        return true;
      });
      if (!due.length) {
        return { expenses: [], recurringExpenses: state.recurringExpenses };
      }

      const createdExpenses = [];
      for (const template of due) {
        const defaultAccountId = getDefaultAccountId(state.accounts);
        const created = await expenseService.create(uid, {
          title: template.title,
          amount: template.amount,
          category: template.category,
          paymentMode: template.paymentMode,
          accountId: template.accountId || defaultAccountId,
          date: getTodayString(),
        });
        createdExpenses.push(created);
      }

      const advanceNextDate = (fromDate, cadence) =>
        advanceRecurringNextDate(dayjs(fromDate), cadence, today);

      const nextRecurring = state.recurringExpenses.map((item) => {
        if (!due.some((d) => d.id === item.id)) return item;
        const nextDate = advanceNextDate(item.nextDate, item.cadence);
        return {
          ...item,
          nextDate: nextDate.format('YYYY-MM-DD'),
          runCount: (item.runCount || 0) + 1,
        };
      });

      const updates = { recurringExpenses: nextRecurring };
      await userService.updateProfile(uid, updates);
      return { expenses: createdExpenses, recurringExpenses: nextRecurring };
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

export const deleteRecurringTemplate = createAsyncThunk(
  'dashboard/deleteRecurringTemplate',
  async ({ uid, templateId }, { getState, rejectWithValue }) => {
    try {
      const current = getState().dashboard.recurringExpenses;
      const next = current.filter((item) => item.id !== templateId);
      await userService.updateProfile(uid, { recurringExpenses: next });
      return next;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const renameCategory = createAsyncThunk(
  'dashboard/renameCategory',
  async ({ uid, categoryId, newName }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dashboard;
      const trimmedNew = String(newName || '').trim();
      const main = getMainById(state.mainCategories, categoryId);
      if (!main) throw new Error('Category not found');
      if (!trimmedNew) throw new Error('Enter a category name');

      const duplicate = ensureMainCategories(state.mainCategories).find(
        (item) =>
          item.id !== categoryId && item.name.toLowerCase() === trimmedNew.toLowerCase()
      );
      if (duplicate) throw new Error('That category name already exists');

      const oldName = main.name;
      if (oldName === trimmedNew) {
        return {
          mainCategories: state.mainCategories,
          subcategories: state.subcategories,
          categories: state.categories,
          expenses: state.expenses,
          recurringExpenses: state.recurringExpenses,
          categoryBudgets: state.categoryBudgets,
          categoryColors: state.categoryColors,
        };
      }

      const mainCategories = ensureMainCategories(state.mainCategories).map((item) =>
        item.id === categoryId ? { ...item, name: trimmedNew } : item
      );
      const subcategories = ensureSubcategories(state.subcategories, mainCategories);
      const visible = getVisibleCategoryNames(mainCategories);
      const categories = visible.length > 0 ? visible : getAllCategoryNames(mainCategories);

      const toUpdate = state.expenses.filter((e) => e.category === oldName);
      const expenses = state.expenses.map((e) =>
        e.category === oldName ? { ...e, category: trimmedNew } : e
      );
      const recurringExpenses = state.recurringExpenses.map((item) =>
        item.category === oldName ? { ...item, category: trimmedNew } : item
      );
      const categoryBudgets = { ...state.categoryBudgets };
      if (categoryBudgets[oldName] !== undefined) {
        if (categoryBudgets[trimmedNew] === undefined) {
          categoryBudgets[trimmedNew] = categoryBudgets[oldName];
        }
        delete categoryBudgets[oldName];
      }

      const categoryColors = buildCategoryColors(getAllCategoryNames(mainCategories));

      for (const expense of toUpdate) {
        await expenseService.update(uid, expense.id, { ...expense, category: trimmedNew });
      }

      await userService.updateProfile(uid, {
        mainCategories,
        subcategories,
        categories,
        recurringExpenses,
        categoryBudgets,
        categoryColors,
      });
      return {
        mainCategories,
        subcategories,
        categories,
        expenses,
        recurringExpenses,
        categoryBudgets,
        categoryColors,
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/** Hide or unhide a main category. Mains cannot be deleted. */
export const setMainCategoryHidden = createAsyncThunk(
  'dashboard/setMainCategoryHidden',
  async ({ uid, categoryId, hidden }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dashboard;
      const main = getMainById(state.mainCategories, categoryId);
      if (!main) throw new Error('Category not found');

      const mainCategories = ensureMainCategories(state.mainCategories).map((item) =>
        item.id === categoryId ? { ...item, hidden: Boolean(hidden) } : item
      );
      const visible = getVisibleCategoryNames(mainCategories);
      if (visible.length === 0) {
        throw new Error('Keep at least one category visible');
      }

      const categories = visible;
      const categoryColors = buildCategoryColors(getAllCategoryNames(mainCategories));

      await userService.updateProfile(uid, {
        mainCategories,
        categories,
        categoryColors,
      });
      return { mainCategories, categories, categoryColors };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/** Clear all income and expenses for the current calendar month. */
export const resetCurrentMonth = createAsyncThunk(
  'dashboard/resetCurrentMonth',
  async ({ uid }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dashboard;
      const { month, year } = getNowMonthYear();
      return await walletService.resetMonth(
        uid,
        { month, year },
        {
          expenses: state.expenses,
          walletTransactions: state.walletTransactions,
        }
      );
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
    monthlyIncomes: {},
    monthlyIncome: 0,
    categoryBudgets: {},
    habits: { ...DEFAULT_HABITS },
    accounts: ensureAccounts(),
    accountOpenings: {},
    peopleGroups: [],
    expenses: [],
    walletTransactions: [],
    recurringExpenses: [],
    categories: CATEGORIES,
    mainCategories: DEFAULT_MAIN_CATEGORIES.map((item) => ({ ...item })),
    subcategories: Object.fromEntries(DEFAULT_MAIN_CATEGORIES.map((item) => [item.id, []])),
    categoryColors: { ...DEFAULT_CATEGORY_COLORS },
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
      state.monthlyIncomes = {};
      state.monthlyIncome = 0;
      state.categoryBudgets = {};
      state.habits = { ...DEFAULT_HABITS };
      state.accounts = ensureAccounts();
      state.accountOpenings = {};
      state.peopleGroups = [];
      state.expenses = [];
      state.walletTransactions = [];
      state.recurringExpenses = [];
      state.categories = CATEGORIES;
      state.mainCategories = DEFAULT_MAIN_CATEGORIES.map((item) => ({ ...item }));
      state.subcategories = Object.fromEntries(
        DEFAULT_MAIN_CATEGORIES.map((item) => [item.id, []])
      );
      state.categoryColors = { ...DEFAULT_CATEGORY_COLORS };
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
          state.monthlyIncomes = profile.monthlyIncomes ?? {};
          state.monthlyIncome = profile.monthlyIncome ?? 0;
          state.habits = profile.habits ?? { ...DEFAULT_HABITS };
          state.accounts = ensureAccounts(profile.accounts);
          state.accountOpenings = profile.accountOpenings ?? {};
          state.peopleGroups = ensurePeopleGroups(
            profile.peopleGroups,
            profile.splitGroups,
            { selfName: resolveSelfMemberName(profile) }
          );
          state.recurringExpenses = profile.recurringExpenses ?? [];
          const normalized = normalizeCategoryProfile(profile);
          state.mainCategories = normalized.mainCategories;
          state.subcategories = normalized.subcategories;
          state.categories = normalized.categories;
          state.categoryColors = buildCategoryColors(
            getAllCategoryNames(normalized.mainCategories)
          );
          state.categoryBudgets = remapCategoryBudgets(
            profile.categoryBudgets,
            normalized.mainCategories
          );
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
        if (action.payload.monthlyIncomes) {
          state.monthlyIncomes = action.payload.monthlyIncomes;
        }
        if (action.payload.monthlyIncome != null) {
          state.monthlyIncome = action.payload.monthlyIncome;
        }
        if (action.payload.accounts) {
          state.accounts = ensureAccounts(action.payload.accounts);
        }
        state.walletTransactions.unshift({
          ...action.payload.transaction,
          createdAt: action.payload.transaction.createdAt || new Date().toISOString(),
        });
      })
      .addCase(addWalletFunds.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(updateWalletCredit.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateWalletCredit.fulfilled, (state, action) => {
        state.saving = false;
        state.monthlyWallets = action.payload.monthlyWallets;
        if (action.payload.touchedIncome) {
          state.monthlyIncomes = action.payload.monthlyIncomes;
          state.monthlyIncome = action.payload.monthlyIncome;
        }
        if (action.payload.accounts) {
          state.accounts = ensureAccounts(action.payload.accounts);
        }
        const updated = action.payload.transaction;
        state.walletTransactions = state.walletTransactions.map((tx) =>
          tx.id === updated.id
            ? {
                ...tx,
                amount: updated.amount,
                note: updated.note,
                accountId: updated.accountId,
                date: updated.date,
                monthKey: updated.monthKey,
              }
            : tx
        );
      })
      .addCase(updateWalletCredit.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(removeWalletCredit.pending, (state) => {
        state.saving = true;
      })
      .addCase(removeWalletCredit.fulfilled, (state, action) => {
        state.saving = false;
        state.monthlyWallets = action.payload.monthlyWallets;
        if (action.payload.touchedIncome) {
          state.monthlyIncomes = action.payload.monthlyIncomes;
          state.monthlyIncome = action.payload.monthlyIncome;
        }
        state.walletTransactions = state.walletTransactions.filter(
          (tx) => tx.id !== action.payload.txId
        );
      })
      .addCase(removeWalletCredit.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(transferBetweenAccounts.pending, (state) => {
        state.saving = true;
      })
      .addCase(transferBetweenAccounts.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload.accounts) {
          state.accounts = ensureAccounts(action.payload.accounts);
        }
        state.walletTransactions.unshift({
          ...action.payload.transaction,
          createdAt: action.payload.transaction.createdAt || new Date().toISOString(),
        });
      })
      .addCase(transferBetweenAccounts.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(updateWalletTransfer.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateWalletTransfer.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload.accounts) {
          state.accounts = ensureAccounts(action.payload.accounts);
        }
        const updated = action.payload.transaction;
        state.walletTransactions = state.walletTransactions.map((tx) =>
          tx.id === updated.id
            ? {
                ...tx,
                amount: updated.amount,
                note: updated.note,
                fromAccountId: updated.fromAccountId,
                toAccountId: updated.toAccountId,
                date: updated.date,
                monthKey: updated.monthKey,
              }
            : tx
        );
      })
      .addCase(updateWalletTransfer.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(removeWalletTransfer.pending, (state) => {
        state.saving = true;
      })
      .addCase(removeWalletTransfer.fulfilled, (state, action) => {
        state.saving = false;
        state.walletTransactions = state.walletTransactions.filter(
          (tx) => tx.id !== action.payload.txId
        );
      })
      .addCase(removeWalletTransfer.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(resetCurrentMonth.pending, (state) => {
        state.saving = true;
      })
      .addCase(resetCurrentMonth.fulfilled, (state, action) => {
        state.saving = false;
        const deletedExpenseIds = new Set(action.payload.deletedExpenseIds);
        const deletedTxIds = new Set(action.payload.deletedTxIds);
        state.expenses = state.expenses.filter((expense) => !deletedExpenseIds.has(expense.id));
        state.walletTransactions = state.walletTransactions.filter(
          (tx) => !deletedTxIds.has(tx.id)
        );
        state.monthlyWallets = action.payload.monthlyWallets;
        state.monthlyIncomes = action.payload.monthlyIncomes;
        state.monthlyIncome = action.payload.monthlyIncome;
      })
      .addCase(resetCurrentMonth.rejected, (state, action) => {
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

      .addCase(addRecurringExpenseTemplate.pending, (state) => {
        state.saving = true;
      })
      .addCase(addRecurringExpenseTemplate.fulfilled, (state, action) => {
        state.saving = false;
        state.recurringExpenses.unshift(action.payload);
      })
      .addCase(addRecurringExpenseTemplate.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(applyDueRecurringExpenses.pending, (state) => {
        state.saving = true;
      })
      .addCase(applyDueRecurringExpenses.fulfilled, (state, action) => {
        state.saving = false;
        state.expenses = [...action.payload.expenses, ...state.expenses];
        state.recurringExpenses = action.payload.recurringExpenses;
      })
      .addCase(applyDueRecurringExpenses.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(updateRecurringTemplate.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateRecurringTemplate.fulfilled, (state, action) => {
        state.saving = false;
        state.recurringExpenses = action.payload;
      })
      .addCase(updateRecurringTemplate.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(deleteRecurringTemplate.pending, (state) => {
        state.saving = true;
      })
      .addCase(deleteRecurringTemplate.fulfilled, (state, action) => {
        state.saving = false;
        state.recurringExpenses = action.payload;
      })
      .addCase(deleteRecurringTemplate.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(renameCategory.fulfilled, (state, action) => {
        state.mainCategories = action.payload.mainCategories;
        state.subcategories = action.payload.subcategories;
        state.categories = action.payload.categories;
        state.expenses = action.payload.expenses;
        state.recurringExpenses = action.payload.recurringExpenses;
        state.categoryBudgets = action.payload.categoryBudgets;
        if (action.payload.categoryColors) {
          state.categoryColors = action.payload.categoryColors;
        }
      })
      .addCase(setMainCategoryHidden.fulfilled, (state, action) => {
        state.mainCategories = action.payload.mainCategories;
        state.categories = action.payload.categories;
        if (action.payload.categoryColors) {
          state.categoryColors = action.payload.categoryColors;
        }
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

export const selectFilterMonthKey = (state) => {
  const { month, year } = selectFilter(state);
  return getMonthKey(month, year);
};

export const selectAccounts = (state) => ensureAccounts(state.dashboard.accounts);

export const selectPeopleGroups = (state) =>
  ensurePeopleGroups(state.dashboard.peopleGroups, [], {
    selfName: resolveSelfMemberName(state.auth?.user),
  });

export const selectDefaultAccountId = (state) => getDefaultAccountId(selectAccounts(state));

export const selectAccountBalances = (state) =>
  computeAccountBalances({
    accounts: state.dashboard.accounts,
    accountOpenings: state.dashboard.accountOpenings,
    expenses: state.dashboard.expenses,
    walletTransactions: state.dashboard.walletTransactions,
  });

/** Accounts with live balances for Wallet UI. */
export const selectAccountsWithBalances = (state) => {
  const accounts = selectAccounts(state);
  const balances = selectAccountBalances(state);
  const views = withAccountBalanceViews(accounts, balances);
  return {
    accounts: views,
    total: sumCashBalances(accounts, balances),
    creditOutstanding: sumCreditOutstanding(accounts, balances),
  };
};

export const selectMonthWalletFunded = (state) => {
  const key = selectFilterMonthKey(state);
  return state.dashboard.monthlyWallets[key] || 0;
};

/** Income logged for the filtered month (from income credits). */
export const selectMonthIncome = (state) => {
  const key = selectFilterMonthKey(state);
  return resolveMonthIncome({
    monthKey: key,
    monthlyIncomes: state.dashboard.monthlyIncomes,
    walletTransactions: state.dashboard.walletTransactions,
    legacyMonthlyIncome: state.dashboard.monthlyIncome,
  });
};

/** Income credit entries for the filtered month (editable/deletable). */
export const selectMonthIncomeEntries = (state) => {
  const monthKey = selectFilterMonthKey(state);
  return (state.dashboard.walletTransactions || [])
    .filter(
      (tx) =>
        tx.type === 'credit' &&
        tx.source === 'income' &&
        tx.monthKey === monthKey
    )
    .slice()
    .sort((a, b) => {
      const aDay = String(a.date || a.createdAt || '').slice(0, 10);
      const bDay = String(b.date || b.createdAt || '').slice(0, 10);
      const byDay = bDay.localeCompare(aDay);
      if (byDay !== 0) return byDay;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
};

/** Transfer entries for the filtered month (editable/deletable). */
export const selectMonthTransferEntries = (state) => {
  const monthKey = selectFilterMonthKey(state);
  const { month, year } = selectFilter(state);
  return (state.dashboard.walletTransactions || [])
    .filter((tx) => {
      if (tx.type !== 'transfer') return false;
      if (tx.monthKey) return tx.monthKey === monthKey;
      const day = String(tx.date || tx.createdAt || '').slice(0, 10);
      return isInMonthYear(day, month, year);
    })
    .slice()
    .sort((a, b) => {
      const aDay = String(a.date || a.createdAt || '').slice(0, 10);
      const bDay = String(b.date || b.createdAt || '').slice(0, 10);
      const byDay = bDay.localeCompare(aDay);
      if (byDay !== 0) return byDay;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
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

export const selectExpensesByCategory = (state) => {
  const grouped = {};
  const mains = state.dashboard.mainCategories;
  selectMonthExpenses(state).forEach((expense) => {
    const category = resolveMainCategoryName(expense.category, mains);
    grouped[category] = (grouped[category] || 0) + expense.amount;
  });
  return grouped;
};

/** Spent in a category for the calendar month of `dateStr`. */
export const selectCategorySpentByDate = (state, category, dateStr) => {
  const d = dayjs(dateStr);
  if (!d.isValid() || !category) return 0;
  const month = d.month() + 1;
  const year = d.year();
  const mains = state.dashboard.mainCategories;
  return state.dashboard.expenses
    .filter((e) => {
      const resolved = resolveMainCategoryName(e.category, mains);
      return resolved === category && isInMonthYear(e.date, month, year);
    })
    .reduce((sum, e) => sum + e.amount, 0);
};

/**
 * Per-category limit progress for the filtered month.
 * @returns {{ category: string, spent: number, limit: number, percent: number, level: null|number, color: string }[]}
 */
export const selectCategoryLimitStatuses = (state) => {
  const { mainCategories, categoryBudgets, categoryColors } = state.dashboard;
  const allNames = getAllCategoryNames(mainCategories);
  const spentByCategory = selectExpensesByCategory(state);
  return allNames
    .map((category) => {
      const limit = Number(categoryBudgets?.[category]) || 0;
      if (limit <= 0) return null;
      const spent = spentByCategory[category] || 0;
      return {
        category,
        spent,
        limit,
        percent: getCategoryLimitPercent(spent, limit),
        level: getCategoryLimitLevel(spent, limit),
        color: categoryColors?.[category] || buildCategoryColors(allNames)[category],
      };
    })
    .filter(Boolean);
};

export const selectMainCategories = (state) =>
  ensureMainCategories(state.dashboard.mainCategories);

export const selectVisibleCategories = (state) => {
  const visible = getVisibleCategoryNames(state.dashboard.mainCategories);
  return visible.length > 0 ? visible : getAllCategoryNames(state.dashboard.mainCategories);
};

export const selectSubcategories = (state) =>
  ensureSubcategories(state.dashboard.subcategories, state.dashboard.mainCategories);

export const selectSubcategoriesForCategory = (state, categoryName) => {
  const main = getMainByName(state.dashboard.mainCategories, categoryName);
  if (!main) return [];
  return selectSubcategories(state)[main.id] || [];
};

/** Home snapshot: income vs spend vs savings goal for the filtered month. */
export const selectMonthSavingsSnapshot = (state) => {
  const income = selectMonthIncome(state);
  const spent = selectTotalSpent(state);
  const saved = income - spent;
  const goalPercent = Number(state.dashboard.habits?.savingsGoalPercent) || 20;
  const goalAmount = income > 0 ? Math.round((income * goalPercent) / 100) : 0;
  const savingsRate = income > 0 ? Math.round((saved / income) * 100) : 0;
  const progressTowardGoal =
    goalAmount > 0 ? Math.min(100, Math.round((Math.max(0, saved) / goalAmount) * 100)) : 0;

  return {
    monthLabel: selectFilteredMonthLabel(state),
    income,
    spent,
    saved,
    savingsRate,
    goalPercent,
    goalAmount,
    progressTowardGoal,
    goalMet: income > 0 && saved >= goalAmount,
    hasIncome: income > 0,
  };
};

export const selectDueRecurringExpenses = (state) => {
  const today = dayjs(getTodayString());
  return (state.dashboard.recurringExpenses || []).filter((item) => {
    if (!item?.enabled || !item.nextDate) return false;
    const next = dayjs(item.nextDate);
    if (!next.isValid()) return false;
    if (next.isAfter(today, 'day')) return false;
    if (item.endDate && dayjs(item.endDate).isValid() && dayjs(item.endDate).isBefore(today, 'day')) {
      return false;
    }
    if (item.maxOccurrences && (item.runCount || 0) >= item.maxOccurrences) return false;
    return true;
  });
};

export const selectInAppReminders = (state) => {
  const reminders = [];

  const walletFunded = selectMonthWalletFunded(state);
  const walletRemaining = selectMonthWalletRemaining(state);
  const monthSpent = selectTotalSpent(state);
  if (walletFunded === 0 && (selectIsFilterCurrentMonth(state) || monthSpent > 0)) {
    reminders.push({
      id: 'fund-month-wallet',
      tone: 'info',
      action: 'wallet',
      text: selectIsFilterCurrentMonth(state)
        ? 'Add income on the Money tab to start tracking this month.'
        : `Add income for ${selectFilteredMonthLabel(state)} on the Money tab.`,
    });
  } else if (walletFunded > 0 && walletRemaining < 0) {
    reminders.push({
      id: 'wallet-over',
      tone: 'danger',
      action: 'wallet',
      text: `Over by ₹${Math.abs(walletRemaining).toLocaleString('en-IN')} this month.`,
    });
  } else if (walletFunded > 0 && walletRemaining <= walletFunded * 0.2) {
    reminders.push({
      id: 'wallet-low',
      tone: 'warning',
      action: 'wallet',
      text: `Only ₹${Math.max(0, walletRemaining).toLocaleString('en-IN')} left this month.`,
    });
  }

  return reminders.slice(0, 3);
};
