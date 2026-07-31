import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase';
import { getMonthKey, getNowMonthYear, isInMonthYear } from '../../../core/utils/date';
import { userService } from '../../auth/services/userService';

export const walletService = {
  async fetchTransactions(uid, max = 100) {
    const q = query(
      collection(db, 'users', uid, 'walletTransactions'),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() || null,
    }));
  },

  async migrateLegacyBalance(uid, profile, expenses = [], walletTransactions = []) {
    const legacyBalance = profile?.walletBalance || 0;
    let monthlyWallets = { ...(profile?.monthlyWallets || {}) };

    if (legacyBalance > 0) {
      const { month, year } = getNowMonthYear();
      const key = getMonthKey(month, year);
      const currentMonthSpent = expenses
        .filter((e) => isInMonthYear(e.date, month, year))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      if (!monthlyWallets[key] && currentMonthSpent > 0) {
        monthlyWallets[key] = currentMonthSpent + legacyBalance;
      }

      await userService.updateProfile(uid, { monthlyWallets, walletBalance: 0 });
    }

    monthlyWallets = await this.cleanupMistakenCarryOver(uid, monthlyWallets, expenses, walletTransactions);

    return monthlyWallets;
  },

  async cleanupMistakenCarryOver(uid, monthlyWallets, expenses, walletTransactions) {
    const { month, year } = getNowMonthYear();
    const key = getMonthKey(month, year);
    const funded = monthlyWallets[key] || 0;
    if (funded <= 0) return monthlyWallets;

    const currentMonthSpent = expenses
      .filter((e) => isInMonthYear(e.date, month, year))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const hasCredits = walletTransactions.some(
      (tx) =>
        tx.type === 'credit' &&
        (tx.monthKey === key ||
          (!tx.monthKey && isInMonthYear(tx.createdAt?.slice(0, 10), month, year)))
    );

    if (currentMonthSpent === 0 && !hasCredits) {
      const next = { ...monthlyWallets };
      delete next[key];
      await userService.updateProfile(uid, { monthlyWallets: next });
      return next;
    }

    return monthlyWallets;
  },

  async addFunds(uid, { amount, note, monthKey, source = 'manual' }) {
    const parsedAmount = Number(amount);
    if (!monthKey || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Enter a valid amount to add to your wallet');
    }

    const isIncome = source === 'income';
    const safeNote =
      note?.trim() ||
      (isIncome ? 'Salary' : 'Added to wallet');

    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('User profile not found');

      const data = userSnap.data();
      const monthlyWallets = { ...(data.monthlyWallets || {}) };
      monthlyWallets[monthKey] = (monthlyWallets[monthKey] || 0) + parsedAmount;

      const monthlyIncomes = { ...(data.monthlyIncomes || {}) };
      if (isIncome) {
        monthlyIncomes[monthKey] = (Number(monthlyIncomes[monthKey]) || 0) + parsedAmount;
      }

      const txRef = doc(collection(db, 'users', uid, 'walletTransactions'));
      const profileUpdate = {
        monthlyWallets,
        updatedAt: serverTimestamp(),
      };
      if (isIncome) {
        profileUpdate.monthlyIncomes = monthlyIncomes;
        // Keep legacy single field in sync for the funded month (used by older UI).
        profileUpdate.monthlyIncome = monthlyIncomes[monthKey];
      }

      transaction.update(userRef, profileUpdate);
      transaction.set(txRef, {
        type: 'credit',
        amount: parsedAmount,
        note: safeNote,
        source: isIncome ? 'income' : 'manual',
        monthKey,
        createdAt: serverTimestamp(),
      });

      return {
        monthlyWallets,
        monthlyIncomes,
        monthlyIncome: isIncome ? monthlyIncomes[monthKey] : data.monthlyIncome ?? 0,
        txId: txRef.id,
      };
    });

    return {
      transaction: {
        id: result.txId,
        type: 'credit',
        amount: parsedAmount,
        note: safeNote,
        source: isIncome ? 'income' : 'manual',
        monthKey,
      },
      monthlyWallets: result.monthlyWallets,
      monthlyIncomes: result.monthlyIncomes,
      monthlyIncome: result.monthlyIncome,
      monthKey,
      monthFunded: result.monthlyWallets[monthKey],
    };
  },
};
