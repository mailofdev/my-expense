import { getDefaultAccountId } from '../utils/accounts';
import { getTodayString } from '../../../core/utils/date';
import { expenseService } from './expenseService';
import { walletService } from './walletService';
import { userService } from '../../auth/services/userService';
import {
  applyFailedOccurrence,
  applyPostedOccurrence,
  dueOccurrenceDates,
  postedDateSet,
} from '../utils/recurringPosts';

async function postTemplate(uid, template, kind, { expenses, walletTransactions, accounts, today }) {
  const dates = dueOccurrenceDates(template, today);
  if (!dates.length) return { template, expenses: [], transactions: [], wallet: null, changed: false };

  const ledger = kind === 'income' ? walletTransactions : expenses;
  const known = postedDateSet(template, ledger);
  let current = { ...template };
  const createdExpenses = [];
  const createdTransactions = [];
  let wallet = null;

  for (const date of dates) {
    if (known.has(date)) {
      current = applyPostedOccurrence(current, date, { duplicate: true });
      continue;
    }

    try {
      if (kind === 'expense') {
        const created = await expenseService.create(uid, {
          title: current.title,
          amount: Number(current.amount) || 0,
          category: current.category,
          paymentMode: current.paymentMode || 'UPI',
          accountId: current.accountId || getDefaultAccountId(accounts),
          date,
          recurringTemplateId: current.id,
          occurrenceDate: date,
        });
        if (!created.alreadyPosted) createdExpenses.push(created);
        known.add(date);
        current = applyPostedOccurrence(current, date, { duplicate: Boolean(created.alreadyPosted) });
      } else {
        const result = await walletService.addFunds(uid, {
          amount: current.amount,
          note: current.title || 'Income',
          source: 'income',
          accountId: current.accountId || getDefaultAccountId(accounts),
          date,
          recurringTemplateId: current.id,
          occurrenceDate: date,
        });
        if (!result.alreadyPosted) createdTransactions.push(result.transaction);
        wallet = result;
        known.add(date);
        current = applyPostedOccurrence(current, date, { duplicate: Boolean(result.alreadyPosted) });
      }
    } catch (error) {
      current = applyFailedOccurrence(current, date, error?.message || 'Could not post');
      break;
    }
  }

  return {
    template: current,
    expenses: createdExpenses,
    transactions: createdTransactions,
    wallet,
    changed: true,
  };
}

/**
 * Post every due income and bill occurrence, then save the templates.
 * Already-posted dates are skipped using a stable id and the template history.
 */
export async function syncDueRepeats({
  uid,
  recurringExpenses = [],
  recurringIncome = [],
  expenses = [],
  walletTransactions = [],
  accounts = [],
  templateId = '',
}) {
  const today = getTodayString();
  const nextExpenses = recurringExpenses.map((item) => ({ ...item }));
  const nextIncome = recurringIncome.map((item) => ({ ...item }));
  const createdExpenses = [];
  const createdTransactions = [];
  let wallet = null;
  let changed = false;

  const run = async (list, kind) => {
    for (let index = 0; index < list.length; index += 1) {
      if (templateId && list[index].id !== templateId) continue;
      const result = await postTemplate(uid, list[index], kind, {
        expenses: [...expenses, ...createdExpenses],
        walletTransactions: [...walletTransactions, ...createdTransactions],
        accounts,
        today,
      });
      if (!result.changed) continue;
      list[index] = result.template;
      createdExpenses.push(...result.expenses);
      createdTransactions.push(...result.transactions);
      if (result.wallet) wallet = result.wallet;
      changed = true;
    }
  };

  await run(nextExpenses, 'expense');
  await run(nextIncome, 'income');

  if (changed) {
    await userService.updateProfile(uid, {
      recurringExpenses: nextExpenses,
      recurringIncome: nextIncome,
    });
  }

  return {
    changed,
    recurringExpenses: nextExpenses,
    recurringIncome: nextIncome,
    expenses: createdExpenses,
    transactions: createdTransactions,
    monthlyWallets: wallet?.monthlyWallets,
    monthlyIncomes: wallet?.monthlyIncomes,
    monthlyIncome: wallet?.monthlyIncome,
    accounts: wallet?.accounts,
  };
}
