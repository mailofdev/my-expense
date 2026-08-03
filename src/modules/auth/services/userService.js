import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase';
import { CATEGORIES, DEFAULT_HABITS, DEFAULT_CATEGORY_COLORS } from '../../../core/constants/finance';
import { DEFAULT_MAIN_CATEGORIES } from '../../dashboard/utils/categories';

const defaultProfile = () => ({
  monthlyWallets: {},
  monthlyIncomes: {},
  monthlyBudget: 0,
  monthlyIncome: 0,
  categoryBudgets: {},
  categories: CATEGORIES,
  mainCategories: DEFAULT_MAIN_CATEGORIES.map((item) => ({ ...item })),
  subcategories: Object.fromEntries(DEFAULT_MAIN_CATEGORIES.map((item) => [item.id, []])),
  categoryColors: { ...DEFAULT_CATEGORY_COLORS },
  habits: { ...DEFAULT_HABITS },
  accounts: [
    { id: 'acc_salary', name: 'Salary', kind: 'salary' },
    { id: 'acc_savings', name: 'Savings', kind: 'savings' },
  ],
  accountOpenings: {},
  splitGroups: [],
  recurringExpenses: [],
  activityLog: [],
  onboardingSeen: false,
});

export const userService = {
  async getProfile(uid) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { uid, ...snap.data() };
  },

  async createProfile(uid, { email, displayName }) {
    const ref = doc(db, 'users', uid);
    const data = {
      email,
      displayName,
      ...defaultProfile(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, data);
    return { uid, email, displayName, ...defaultProfile() };
  },

  async ensureProfile(uid, { email, displayName }) {
    const existing = await this.getProfile(uid);
    if (existing) return existing;
    return this.createProfile(uid, { email, displayName });
  },

  async updateProfile(uid, updates) {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
    return { uid, ...updates };
  },
};
