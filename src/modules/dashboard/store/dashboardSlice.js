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
  getCategoryLimitWarningText,
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
import {
  calculateGroupDebts,
  computeSplitShares,
  mergeSettlements,
  sharesMatchTotal,
} from '../../../core/utils/split';
import { resolveMonthIncome, advanceRecurringNextDate } from '../utils/moneyFlows';
import {
  computeAccountBalances,
  ensureAccounts,
  getDefaultAccountId,
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
  async ({ uid, amount, note, monthKey, source, accountId }, { rejectWithValue }) => {
    try {
      const result = await walletService.addFunds(uid, {
        amount,
        note,
        monthKey,
        source,
        accountId,
      });
      return result;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateWalletCredit = createAsyncThunk(
  'dashboard/updateWalletCredit',
  async ({ uid, txId, amount, note, accountId }, { rejectWithValue }) => {
    try {
      return await walletService.updateCredit(uid, txId, { amount, note, accountId });
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
  async ({ uid, amount, fromAccountId, toAccountId, note }, { rejectWithValue }) => {
    try {
      return await walletService.transferFunds(uid, {
        amount,
        fromAccountId,
        toAccountId,
        note,
      });
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
          const name = String(raw?.name || '').trim();
          const id = String(raw?.id || '').trim();
          if (!name || !id) continue;
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          accounts.push({
            id,
            name,
            kind: raw.kind || 'other',
          });
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
      await userService.updateProfile(uid, next);
      return next;
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
        return { expenses: [], recurringExpenses: state.recurringExpenses, activity: [] };
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
      return { expenses: createdExpenses, recurringExpenses: nextRecurring, activity };
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

/** Main categories cannot be deleted — hide them instead. */
export const deleteCategory = createAsyncThunk(
  'dashboard/deleteCategory',
  async (_, { rejectWithValue }) =>
    rejectWithValue('Main categories cannot be deleted. Hide them instead.')
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
    monthlyBudget: 0,
    monthlyIncome: 0,
    categoryBudgets: {},
    habits: { ...DEFAULT_HABITS },
    accounts: ensureAccounts(),
    accountOpenings: {},
    expenses: [],
    walletTransactions: [],
    splitGroups: [],
    activityLog: [],
    recurringExpenses: [],
    onboardingSeen: false,
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
      state.monthlyBudget = 0;
      state.monthlyIncome = 0;
      state.categoryBudgets = {};
      state.habits = { ...DEFAULT_HABITS };
      state.accounts = ensureAccounts();
      state.accountOpenings = {};
      state.expenses = [];
      state.walletTransactions = [];
      state.splitGroups = [];
      state.activityLog = [];
      state.recurringExpenses = [];
      state.onboardingSeen = false;
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
        const { profile, expenses, walletTransactions, monthlyWallets } = action.payload;
        if (profile) {
          state.monthlyWallets = monthlyWallets ?? profile.monthlyWallets ?? {};
          state.monthlyIncomes = profile.monthlyIncomes ?? {};
          state.monthlyBudget = profile.monthlyBudget ?? 0;
          state.monthlyIncome = profile.monthlyIncome ?? 0;
          state.habits = profile.habits ?? { ...DEFAULT_HABITS };
          state.accounts = ensureAccounts(profile.accounts);
          state.accountOpenings = profile.accountOpenings ?? {};
          state.splitGroups = profile.splitGroups ?? [];
          state.activityLog = profile.activityLog ?? [];
          state.recurringExpenses = profile.recurringExpenses ?? [];
          state.onboardingSeen = profile.onboardingSeen ?? false;
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
        state.habits.expensesLoggedThisWeek =
          (state.habits.expensesLoggedThisWeek || 0) + 1;
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
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
        });
      })
      .addCase(transferBetweenAccounts.rejected, (state, action) => {
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
        state.activityLog = [...(action.payload.activity || []), ...state.activityLog].slice(0, 100);
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
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.error = action.payload;
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

export const selectFilterMonthKey = (state) => {
  const { month, year } = selectFilter(state);
  return getMonthKey(month, year);
};

export const selectAccounts = (state) => ensureAccounts(state.dashboard.accounts);

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
  const total = accounts.reduce((sum, account) => sum + (balances[account.id] || 0), 0);
  return {
    accounts: accounts.map((account) => ({
      ...account,
      balance: balances[account.id] || 0,
    })),
    total,
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
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
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

export const selectSavingsRate = (state) => {
  const spent = selectTotalSpent(state);
  const income = selectMonthIncome(state);
  if (!income) return 0;
  return Math.round(((income - spent) / income) * 100);
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
  const income = selectMonthIncome(state);
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

  const categoryLimitStatuses = selectCategoryLimitStatuses(state);
  categoryLimitStatuses
    .filter((item) => item.level != null)
    .sort((a, b) => b.level - a.level)
    .slice(0, 3)
    .forEach((item) => {
      insights.push({
        type: item.level >= 100 ? 'danger' : item.level >= 90 ? 'warning' : 'tip',
        icon: item.level >= 100 ? '⛔' : '📊',
        text: getCategoryLimitWarningText(item.category, item.level, item.spent, item.limit),
      });
    });

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

  const walletFunded = selectMonthWalletFunded(state);
  if (walletFunded === 0 && spent > 0) {
    insights.push({
      type: 'action',
      icon: '👛',
      text: `${monthLabel} has expenses but no wallet funded. Add income to track remaining balance.`,
    });
  } else if (walletFunded > 0 && spent > walletFunded) {
    insights.push({
      type: 'danger',
      icon: '💸',
      text: `You've spent ₹${(spent - walletFunded).toLocaleString('en-IN')} more than your wallet for ${monthLabel}.`,
    });
  } else if (walletFunded > 0 && spent > walletFunded * 0.8) {
    insights.push({
      type: 'warning',
      icon: '👛',
      text: 'You have used 80%+ of this month\'s wallet. Watch your remaining balance.',
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

  // Highest priority for Home: bills due + wallet status.
  const dueRecurring = selectDueRecurringExpenses(state);
  if (dueRecurring.length > 0) {
    const total = dueRecurring.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    reminders.push({
      id: 'due-recurring',
      tone: 'warning',
      action: 'log-recurring',
      text: `${dueRecurring.length} bill${dueRecurring.length > 1 ? 's' : ''} due · ₹${total.toLocaleString('en-IN')} — tap to log`,
    });
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
        ? 'Add income for this month to fund your wallet and start tracking spends.'
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

  const categoryLimitStatuses = selectCategoryLimitStatuses(state);
  categoryLimitStatuses
    .filter((item) => item.level >= 100)
    .slice(0, 2)
    .forEach((item) => {
      reminders.push({
        id: `cat-limit-${item.category}`,
        tone: 'danger',
        text: getCategoryLimitWarningText(item.category, item.level, item.spent, item.limit),
      });
    });
  categoryLimitStatuses
    .filter((item) => item.level != null && item.level < 100 && item.level >= 75)
    .slice(0, 2)
    .forEach((item) => {
      reminders.push({
        id: `cat-warn-${item.category}`,
        tone: 'warning',
        text: getCategoryLimitWarningText(item.category, item.level, item.spent, item.limit),
      });
    });

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
