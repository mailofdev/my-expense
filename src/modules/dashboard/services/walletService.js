import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase';
import { getMonthKey, getNowMonthYear, getTodayString, isInMonthYear } from '../../../core/utils/date';
import { userService } from '../../auth/services/userService';
import { ensureAccounts, getDefaultAccountId } from '../utils/accounts';
import { monthKeyFromDate, normalizeLedgerDate } from '../utils/moneyFlows';

const clampNonNegative = (value) => Math.max(0, Number(value) || 0);

export const walletService = {
  async fetchTransactions(uid, max = 500) {
    const q = query(
      collection(db, 'users', uid, 'walletTransactions'),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      const createdAt = data.createdAt?.toDate?.()?.toISOString?.() || null;
      const date =
        (data.date && String(data.date).slice(0, 10)) ||
        (createdAt ? createdAt.slice(0, 10) : null);
      return {
        id: d.id,
        ...data,
        date,
        createdAt,
      };
    });
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

    monthlyWallets = await this.cleanupMistakenCarryOver(
      uid,
      monthlyWallets,
      expenses,
      walletTransactions
    );

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

  async addFunds(uid, { amount, note, monthKey, source = 'manual', accountId, date }) {
    const parsedAmount = Number(amount);
    const resolvedDate = normalizeLedgerDate(date || getTodayString());
    const resolvedMonthKey = monthKeyFromDate(resolvedDate) || monthKey;
    if (!resolvedMonthKey || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
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
      monthlyWallets[resolvedMonthKey] = (monthlyWallets[resolvedMonthKey] || 0) + parsedAmount;

      const monthlyIncomes = { ...(data.monthlyIncomes || {}) };
      if (isIncome) {
        monthlyIncomes[resolvedMonthKey] =
          (Number(monthlyIncomes[resolvedMonthKey]) || 0) + parsedAmount;
      }

      const txRef = doc(collection(db, 'users', uid, 'walletTransactions'));
      const profileUpdate = {
        monthlyWallets,
        accounts,
        updatedAt: serverTimestamp(),
      };
      if (isIncome) {
        profileUpdate.monthlyIncomes = monthlyIncomes;
        profileUpdate.monthlyIncome = monthlyIncomes[resolvedMonthKey];
      }

      transaction.update(userRef, profileUpdate);
      transaction.set(txRef, {
        type: 'credit',
        amount: parsedAmount,
        note: safeNote,
        source: isIncome ? 'income' : 'manual',
        accountId: resolvedAccountId,
        date: resolvedDate,
        monthKey: resolvedMonthKey,
        createdAt: serverTimestamp(),
      });

      return {
        monthlyWallets,
        monthlyIncomes,
        monthlyIncome: isIncome ? monthlyIncomes[resolvedMonthKey] : data.monthlyIncome ?? 0,
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
        date: resolvedDate,
        monthKey: resolvedMonthKey,
        createdAt: new Date().toISOString(),
      },
      monthlyWallets: result.monthlyWallets,
      monthlyIncomes: result.monthlyIncomes,
      monthlyIncome: result.monthlyIncome,
      accounts: result.accounts,
      monthKey: resolvedMonthKey,
      monthFunded: result.monthlyWallets[resolvedMonthKey],
    };
  },

  /**
   * Update a credit (income or top-up). Adjusts wallet / income totals by the amount delta.
   */
  async updateCredit(uid, txId, { amount, note, accountId, date }) {
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

      const oldMonthKey = existing.monthKey;
      if (!oldMonthKey) throw new Error('This entry cannot be edited');

      const oldAmount = Number(existing.amount) || 0;
      const isIncome = existing.source === 'income';
      const safeNote =
        note?.trim() ||
        existing.note ||
        (isIncome ? 'Salary' : 'Added to wallet');

      const existingDate =
        existing.date ||
        existing.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) ||
        getTodayString();
      const resolvedDate = normalizeLedgerDate(date || existingDate);
      const newMonthKey = monthKeyFromDate(resolvedDate);

      const monthlyWallets = { ...(data.monthlyWallets || {}) };
      const monthlyIncomes = { ...(data.monthlyIncomes || {}) };

      if (newMonthKey === oldMonthKey) {
        const delta = parsedAmount - oldAmount;
        monthlyWallets[oldMonthKey] = clampNonNegative(
          (monthlyWallets[oldMonthKey] || 0) + delta
        );
        if (isIncome) {
          monthlyIncomes[oldMonthKey] = clampNonNegative(
            (Number(monthlyIncomes[oldMonthKey]) || 0) + delta
          );
        }
      } else {
        monthlyWallets[oldMonthKey] = clampNonNegative(
          (monthlyWallets[oldMonthKey] || 0) - oldAmount
        );
        monthlyWallets[newMonthKey] = (monthlyWallets[newMonthKey] || 0) + parsedAmount;
        if (isIncome) {
          monthlyIncomes[oldMonthKey] = clampNonNegative(
            (Number(monthlyIncomes[oldMonthKey]) || 0) - oldAmount
          );
          monthlyIncomes[newMonthKey] =
            (Number(monthlyIncomes[newMonthKey]) || 0) + parsedAmount;
        }
      }

      const profileUpdate = {
        monthlyWallets,
        accounts,
        updatedAt: serverTimestamp(),
      };

      if (isIncome) {
        profileUpdate.monthlyIncomes = monthlyIncomes;
        profileUpdate.monthlyIncome = monthlyIncomes[newMonthKey];
      }

      transaction.update(userRef, profileUpdate);
      transaction.update(txRef, {
        amount: parsedAmount,
        note: safeNote,
        accountId: resolvedAccountId,
        date: resolvedDate,
        monthKey: newMonthKey,
      });

      return {
        monthlyWallets,
        monthlyIncomes: isIncome ? monthlyIncomes : data.monthlyIncomes || {},
        monthlyIncome: isIncome
          ? monthlyIncomes[newMonthKey]
          : data.monthlyIncome ?? 0,
        accounts,
        transaction: {
          id: txId,
          type: 'credit',
          amount: parsedAmount,
          note: safeNote,
          source: existing.source || 'manual',
          accountId: resolvedAccountId,
          date: resolvedDate,
          monthKey: newMonthKey,
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
  async transferFunds(uid, { amount, fromAccountId, toAccountId, note, date }) {
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

    const resolvedDate = normalizeLedgerDate(date || getTodayString());
    const resolvedMonthKey = monthKeyFromDate(resolvedDate);

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
        date: resolvedDate,
        monthKey: resolvedMonthKey,
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
        date: resolvedDate,
        monthKey: resolvedMonthKey,
        createdAt: new Date().toISOString(),
      },
      accounts: result.accounts,
    };
  },

  /** Update a transfer's amount, banks, note, or date. Does not touch month budget. */
  async updateTransfer(uid, txId, { amount, fromAccountId, toAccountId, note, date }) {
    if (!txId) throw new Error('Missing transfer');
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

    const resolvedDate = normalizeLedgerDate(date || getTodayString());
    const resolvedMonthKey = monthKeyFromDate(resolvedDate);

    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const txRef = doc(db, 'users', uid, 'walletTransactions', txId);
      const userSnap = await transaction.get(userRef);
      const txSnap = await transaction.get(txRef);

      if (!userSnap.exists()) throw new Error('User profile not found');
      if (!txSnap.exists()) throw new Error('Transfer not found');

      const existing = txSnap.data();
      if (existing.type !== 'transfer') {
        throw new Error('Only transfers can be edited here');
      }

      const data = userSnap.data();
      const accounts = ensureAccounts(data.accounts);
      const fromOk = accounts.some((a) => a.id === fromAccountId);
      const toOk = accounts.some((a) => a.id === toAccountId);
      if (!fromOk || !toOk) throw new Error('Choose valid accounts');

      const safeNote = note?.trim() || existing.note || 'Transfer';

      transaction.update(userRef, {
        accounts,
        updatedAt: serverTimestamp(),
      });
      transaction.update(txRef, {
        amount: parsedAmount,
        note: safeNote,
        fromAccountId,
        toAccountId,
        date: resolvedDate,
        monthKey: resolvedMonthKey,
      });

      return {
        accounts,
        transaction: {
          id: txId,
          type: 'transfer',
          amount: parsedAmount,
          note: safeNote,
          fromAccountId,
          toAccountId,
          date: resolvedDate,
          monthKey: resolvedMonthKey,
          createdAt: existing.createdAt?.toDate?.()?.toISOString?.() || null,
        },
      };
    });

    return result;
  },

  /** Delete a transfer. Does not touch month budget. */
  async removeTransfer(uid, txId) {
    if (!txId) throw new Error('Missing transfer');

    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const txRef = doc(db, 'users', uid, 'walletTransactions', txId);
      const userSnap = await transaction.get(userRef);
      const txSnap = await transaction.get(txRef);

      if (!userSnap.exists()) throw new Error('User profile not found');
      if (!txSnap.exists()) throw new Error('Transfer not found');

      const existing = txSnap.data();
      if (existing.type !== 'transfer') {
        throw new Error('Only transfers can be removed here');
      }

      transaction.update(userRef, { updatedAt: serverTimestamp() });
      transaction.delete(txRef);

      return { txId };
    });

    return result;
  },

  /**
   * Delete all income, transfers, and expenses for a calendar month so the user can start fresh.
   */
  async resetMonth(uid, { month, year }, { expenses = [], walletTransactions = [] } = {}) {
    const monthKey = getMonthKey(month, year);

    const expensesToDelete = (expenses || []).filter((expense) =>
      isInMonthYear(expense.date, month, year)
    );

    const txsToDelete = (walletTransactions || []).filter((tx) => {
      if (tx.monthKey === monthKey) return true;
      const dayKey =
        tx.date ||
        (tx.createdAt ? String(tx.createdAt).slice(0, 10) : null);
      return dayKey && isInMonthYear(dayKey, month, year);
    });

    await Promise.all([
      ...expensesToDelete.map((expense) =>
        deleteDoc(doc(db, 'users', uid, 'expenses', expense.id))
      ),
      ...txsToDelete.map((tx) =>
        deleteDoc(doc(db, 'users', uid, 'walletTransactions', tx.id))
      ),
    ]);

    const profile = await userService.getProfile(uid);
    if (!profile) throw new Error('User profile not found');

    const monthlyWallets = { ...(profile.monthlyWallets || {}) };
    const monthlyIncomes = { ...(profile.monthlyIncomes || {}) };
    delete monthlyWallets[monthKey];
    delete monthlyIncomes[monthKey];

    const { month: nowMonth, year: nowYear } = getNowMonthYear();
    const updates = { monthlyWallets, monthlyIncomes };
    if (month === nowMonth && year === nowYear) {
      updates.monthlyIncome = 0;
    }

    await userService.updateProfile(uid, updates);

    return {
      monthKey,
      deletedExpenseIds: expensesToDelete.map((expense) => expense.id),
      deletedTxIds: txsToDelete.map((tx) => tx.id),
      monthlyWallets,
      monthlyIncomes,
      monthlyIncome: updates.monthlyIncome ?? profile.monthlyIncome ?? 0,
    };
  },
};
