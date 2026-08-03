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
import { ensureAccounts, getDefaultAccountId } from '../utils/accounts';

const clampNonNegative = (value) => Math.max(0, Number(value) || 0);

export const walletService = {
  async fetchTransactions(uid, max = 500) {
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

  /** Ensure Salary + Savings accounts exist on the profile. */
  async ensureAccountProfile(uid, profile) {
    const accounts = ensureAccounts(profile?.accounts);
    const accountOpenings = { ...(profile?.accountOpenings || {}) };
    const needsWrite =
      !Array.isArray(profile?.accounts) ||
      profile.accounts.length === 0 ||
      JSON.stringify(profile.accounts) !== JSON.stringify(accounts);

    if (needsWrite) {
      await userService.updateProfile(uid, { accounts, accountOpenings });
    }

    return { accounts, accountOpenings };
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

  async addFunds(uid, { amount, note, monthKey, source = 'manual', accountId }) {
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
      const accounts = ensureAccounts(data.accounts);
      const resolvedAccountId = accountId || getDefaultAccountId(accounts);
      if (!accounts.some((a) => a.id === resolvedAccountId)) {
        throw new Error('Choose a valid account');
      }

      const monthlyWallets = { ...(data.monthlyWallets || {}) };
      monthlyWallets[monthKey] = (monthlyWallets[monthKey] || 0) + parsedAmount;

      const monthlyIncomes = { ...(data.monthlyIncomes || {}) };
      if (isIncome) {
        monthlyIncomes[monthKey] = (Number(monthlyIncomes[monthKey]) || 0) + parsedAmount;
      }

      const txRef = doc(collection(db, 'users', uid, 'walletTransactions'));
      const profileUpdate = {
        monthlyWallets,
        accounts,
        updatedAt: serverTimestamp(),
      };
      if (isIncome) {
        profileUpdate.monthlyIncomes = monthlyIncomes;
        profileUpdate.monthlyIncome = monthlyIncomes[monthKey];
      }

      transaction.update(userRef, profileUpdate);
      transaction.set(txRef, {
        type: 'credit',
        amount: parsedAmount,
        note: safeNote,
        source: isIncome ? 'income' : 'manual',
        accountId: resolvedAccountId,
        monthKey,
        createdAt: serverTimestamp(),
      });

      return {
        monthlyWallets,
        monthlyIncomes,
        monthlyIncome: isIncome ? monthlyIncomes[monthKey] : data.monthlyIncome ?? 0,
        accounts,
        accountId: resolvedAccountId,
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
        accountId: result.accountId,
        monthKey,
      },
      monthlyWallets: result.monthlyWallets,
      monthlyIncomes: result.monthlyIncomes,
      monthlyIncome: result.monthlyIncome,
      accounts: result.accounts,
      monthKey,
      monthFunded: result.monthlyWallets[monthKey],
    };
  },

  /**
   * Update a credit (income or top-up). Adjusts wallet / income totals by the amount delta.
   */
  async updateCredit(uid, txId, { amount, note, accountId }) {
    if (!txId) throw new Error('Missing transaction');
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Enter a valid amount');
    }

    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const txRef = doc(db, 'users', uid, 'walletTransactions', txId);
      const userSnap = await transaction.get(userRef);
      const txSnap = await transaction.get(txRef);

      if (!userSnap.exists()) throw new Error('User profile not found');
      if (!txSnap.exists()) throw new Error('Income entry not found');

      const existing = txSnap.data();
      if (existing.type !== 'credit') {
        throw new Error('Only income or top-up entries can be edited');
      }

      const data = userSnap.data();
      const accounts = ensureAccounts(data.accounts);
      const resolvedAccountId = accountId || existing.accountId || getDefaultAccountId(accounts);
      if (!accounts.some((a) => a.id === resolvedAccountId)) {
        throw new Error('Choose a valid account');
      }

      const monthKey = existing.monthKey;
      if (!monthKey) throw new Error('This entry cannot be edited');

      const oldAmount = Number(existing.amount) || 0;
      const delta = parsedAmount - oldAmount;
      const isIncome = existing.source === 'income';
      const safeNote =
        note?.trim() ||
        existing.note ||
        (isIncome ? 'Salary' : 'Added to wallet');

      const monthlyWallets = { ...(data.monthlyWallets || {}) };
      monthlyWallets[monthKey] = clampNonNegative((monthlyWallets[monthKey] || 0) + delta);

      const monthlyIncomes = { ...(data.monthlyIncomes || {}) };
      const profileUpdate = {
        monthlyWallets,
        accounts,
        updatedAt: serverTimestamp(),
      };

      if (isIncome) {
        monthlyIncomes[monthKey] = clampNonNegative(
          (Number(monthlyIncomes[monthKey]) || 0) + delta
        );
        profileUpdate.monthlyIncomes = monthlyIncomes;
        profileUpdate.monthlyIncome = monthlyIncomes[monthKey];
      }

      transaction.update(userRef, profileUpdate);
      transaction.update(txRef, {
        amount: parsedAmount,
        note: safeNote,
        accountId: resolvedAccountId,
      });

      return {
        monthlyWallets,
        monthlyIncomes: isIncome ? monthlyIncomes : data.monthlyIncomes || {},
        monthlyIncome: isIncome
          ? monthlyIncomes[monthKey]
          : data.monthlyIncome ?? 0,
        accounts,
        transaction: {
          id: txId,
          type: 'credit',
          amount: parsedAmount,
          note: safeNote,
          source: existing.source || 'manual',
          accountId: resolvedAccountId,
          monthKey,
          createdAt: existing.createdAt?.toDate?.()?.toISOString?.() || null,
        },
        touchedIncome: isIncome,
      };
    });

    return result;
  },

  /** Delete a credit and reverse its effect on wallet / income totals. */
  async removeCredit(uid, txId) {
    if (!txId) throw new Error('Missing transaction');

    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const txRef = doc(db, 'users', uid, 'walletTransactions', txId);
      const userSnap = await transaction.get(userRef);
      const txSnap = await transaction.get(txRef);

      if (!userSnap.exists()) throw new Error('User profile not found');
      if (!txSnap.exists()) throw new Error('Income entry not found');

      const existing = txSnap.data();
      if (existing.type !== 'credit') {
        throw new Error('Only income or top-up entries can be removed');
      }

      const data = userSnap.data();
      const monthKey = existing.monthKey;
      const amount = Number(existing.amount) || 0;
      const isIncome = existing.source === 'income';

      const monthlyWallets = { ...(data.monthlyWallets || {}) };
      if (monthKey) {
        monthlyWallets[monthKey] = clampNonNegative((monthlyWallets[monthKey] || 0) - amount);
      }

      const monthlyIncomes = { ...(data.monthlyIncomes || {}) };
      const profileUpdate = {
        monthlyWallets,
        updatedAt: serverTimestamp(),
      };

      if (isIncome && monthKey) {
        monthlyIncomes[monthKey] = clampNonNegative(
          (Number(monthlyIncomes[monthKey]) || 0) - amount
        );
        profileUpdate.monthlyIncomes = monthlyIncomes;
        profileUpdate.monthlyIncome = monthlyIncomes[monthKey];
      }

      transaction.update(userRef, profileUpdate);
      transaction.delete(txRef);

      return {
        txId,
        monthlyWallets,
        monthlyIncomes: isIncome ? monthlyIncomes : data.monthlyIncomes || {},
        monthlyIncome: isIncome && monthKey
          ? monthlyIncomes[monthKey]
          : data.monthlyIncome ?? 0,
        touchedIncome: isIncome,
      };
    });

    return result;
  },

  /**
   * Move money between own accounts. Does not change monthly wallet, income, or spend.
   */
  async transferFunds(uid, { amount, fromAccountId, toAccountId, note }) {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Enter a valid transfer amount');
    }
    if (!fromAccountId || !toAccountId) {
      throw new Error('Pick both accounts');
    }
    if (fromAccountId === toAccountId) {
      throw new Error('Pick two different accounts');
    }

    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('User profile not found');

      const data = userSnap.data();
      const accounts = ensureAccounts(data.accounts);
      const fromOk = accounts.some((a) => a.id === fromAccountId);
      const toOk = accounts.some((a) => a.id === toAccountId);
      if (!fromOk || !toOk) throw new Error('Choose valid accounts');

      const safeNote = note?.trim() || 'Transfer';
      const txRef = doc(collection(db, 'users', uid, 'walletTransactions'));

      transaction.update(userRef, {
        accounts,
        updatedAt: serverTimestamp(),
      });
      transaction.set(txRef, {
        type: 'transfer',
        amount: parsedAmount,
        note: safeNote,
        fromAccountId,
        toAccountId,
        createdAt: serverTimestamp(),
      });

      return {
        accounts,
        txId: txRef.id,
        note: safeNote,
      };
    });

    return {
      transaction: {
        id: result.txId,
        type: 'transfer',
        amount: parsedAmount,
        note: result.note,
        fromAccountId,
        toAccountId,
      },
      accounts: result.accounts,
    };
  },
};
