import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase';
import { CATEGORIES, DEFAULT_HABITS, DEFAULT_CATEGORY_COLORS } from '../../../core/constants/finance';
import { sanitizeProfileDates } from '../../../core/utils/firestoreDates';
import { DEFAULT_MAIN_CATEGORIES } from '../../dashboard/utils/categories';
import { DEFAULT_ACCOUNTS } from '../../dashboard/utils/accounts';

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
  accounts: DEFAULT_ACCOUNTS.map((item) => ({ ...item })),
  accountOpenings: {},
  peopleGroups: [],
  splitGroups: [],
  recurringExpenses: [],
  recurringIncome: [],
  monthlyAllocations: {},
  goals: [],
  activityLog: [],
  onboardingSeen: false,
  role: 'user',
  loginCount: 0,
  lastLoginAt: null,
  lastSeenAt: null,
});

export const userService = {
  async getProfile(uid) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return sanitizeProfileDates({ uid, ...snap.data() });
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
    return sanitizeProfileDates({
      uid,
      email,
      displayName,
      ...defaultProfile(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
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

  /** Best-effort. A tracking write must not block sign-in. */
  async recordLogin(uid) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        lastLoginAt: serverTimestamp(),
        loginCount: increment(1),
      });
    } catch {
      // Ignore so sign-in still succeeds.
    }
  },

  /** Best-effort presence stamp when an existing session resumes. */
  async recordLastSeen(uid) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        lastSeenAt: serverTimestamp(),
      });
    } catch {
      // Ignore so the session still loads.
    }
  },

  async listUsers() {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((item) => sanitizeProfileDates({ uid: item.id, ...item.data() }));
  },
};
