export const MAX_ACCOUNTS = 8;

export const DEFAULT_ACCOUNTS = [
  { id: 'acc_salary', name: 'Salary', kind: 'salary' },
  { id: 'acc_savings', name: 'Savings', kind: 'savings' },
];

export function createAccountId() {
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Normalize account list; empty → default Salary + Savings. */
export function ensureAccounts(accounts) {
  if (Array.isArray(accounts) && accounts.length > 0) {
    return accounts
      .filter((item) => item?.id && item?.name)
      .slice(0, MAX_ACCOUNTS)
      .map((item) => ({
        id: String(item.id),
        name: String(item.name).trim() || 'Bank',
        kind: item.kind || 'other',
      }));
  }
  return DEFAULT_ACCOUNTS.map((item) => ({ ...item }));
}

export function getAccountById(accounts, accountId) {
  return (accounts || []).find((item) => item.id === accountId) || null;
}

export function getDefaultAccountId(accounts) {
  const list = accounts || [];
  const salary = list.find((item) => item.kind === 'salary');
  return salary?.id || list[0]?.id || DEFAULT_ACCOUNTS[0].id;
}

/**
 * Running balances from openings + credits − expenses − transfers.
 * Transfers move money between accounts — they are not income or spend.
 * Untagged legacy credits/expenses land on the default (Salary) account.
 */
export function computeAccountBalances({
  accounts = [],
  accountOpenings = {},
  expenses = [],
  walletTransactions = [],
} = {}) {
  const list = ensureAccounts(accounts);
  const defaultId = getDefaultAccountId(list);
  const balances = {};
  list.forEach((account) => {
    balances[account.id] = Number(accountOpenings?.[account.id]) || 0;
  });

  (walletTransactions || []).forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    if (amount <= 0) return;

    if (tx.type === 'transfer') {
      const fromId = tx.fromAccountId;
      const toId = tx.toAccountId;
      if (fromId && balances[fromId] !== undefined) balances[fromId] -= amount;
      if (toId && balances[toId] !== undefined) balances[toId] += amount;
      return;
    }

    if (tx.type === 'credit') {
      const accountId = tx.accountId || defaultId;
      if (balances[accountId] !== undefined) balances[accountId] += amount;
    }
  });

  (expenses || []).forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    if (amount <= 0) return;
    const accountId = expense.accountId || defaultId;
    if (balances[accountId] === undefined) return;
    balances[accountId] -= amount;
  });

  return balances;
}

/** Openings so each account's live balance equals the desired bank amount. */
export function openingsForDesiredBalances({
  accounts = [],
  expenses = [],
  walletTransactions = [],
  desiredById = {},
} = {}) {
  const list = ensureAccounts(accounts);
  const zeroOpenings = {};
  list.forEach((account) => {
    zeroOpenings[account.id] = 0;
  });
  const base = computeAccountBalances({
    accounts: list,
    accountOpenings: zeroOpenings,
    expenses,
    walletTransactions,
  });

  const openings = {};
  list.forEach((account) => {
    const desired = Number(desiredById[account.id]);
    openings[account.id] = (Number.isFinite(desired) ? desired : 0) - (base[account.id] || 0);
  });
  return openings;
}

export function resolveExpenseAccountId(expense, accounts) {
  return expense?.accountId || getDefaultAccountId(accounts);
}
