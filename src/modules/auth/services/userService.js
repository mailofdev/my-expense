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
  role: 'user',
  loginCount: 0,
  lastLoginAt: null,
  lastSeenAt: null,
});

const SEEN_THROTTLE_MS = 15 * 60 * 1000;

function seenStorageKey(uid) {
  return `glow_money_last_seen_write_${uid}`;
}

/**
 * Presence fields on users/{uid}:
 * lastLoginAt — a fresh email/password sign-in. Restoring a session does not update it.
 * lastSeenAt — the app was opened or a session resumed. Throttled so ordinary use does not write every render.
 * A failed tracking write is ignored so sign-in and the dashboard still load.
 */
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

  /**
   * Fresh sign-in only. Also stamps last seen, because a sign-in is activity.
   * Failures are ignored so authentication still completes.
   */
  async recordLogin(uid) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        lastLoginAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        loginCount: increment(1),
      });
      try {
        sessionStorage.setItem(seenStorageKey(uid), String(Date.now()));
      } catch {
        // Storage can be blocked; the Firestore write already happened.
      }
    } catch {
      // Ignore so sign-in still succeeds.
    }
  },

  /**
   * Session open or resume. Skipped when a stamp was written in the last 15 minutes.
   * Failures are ignored so the session still loads.
   */
  async recordLastSeen(uid) {
    try {
      const last = Number(sessionStorage.getItem(seenStorageKey(uid)) || 0);
      if (Date.now() - last < SEEN_THROTTLE_MS) return;
    } catch {
      // If storage is blocked, still try the write.
    }
    try {
      await updateDoc(doc(db, 'users', uid), {
        lastSeenAt: serverTimestamp(),
      });
      try {
        sessionStorage.setItem(seenStorageKey(uid), String(Date.now()));
      } catch {
        // The Firestore stamp is what matters.
      }
    } catch {
      // Ignore so the session still loads.
    }
  },

  async listUsers() {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((item) => sanitizeProfileDates({ uid: item.id, ...item.data() }));
  },
};
