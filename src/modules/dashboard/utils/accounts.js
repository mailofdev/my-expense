export const MAX_ACCOUNTS = 12;

export const ACCOUNT_KINDS = {
  salary: 'salary',
  savings: 'savings',
  other: 'other',
  debit: 'debit',
  credit: 'credit',
};

export const ACCOUNT_KIND_OPTIONS = [
  { value: 'other', label: 'Bank' },
  { value: 'debit', label: 'Debit card' },
  { value: 'credit', label: 'Credit card' },
];

export const DEFAULT_ACCOUNTS = [
  { id: 'acc_salary', name: 'Salary', kind: 'salary' },
  { id: 'acc_savings', name: 'Savings', kind: 'savings' },
];

export function createAccountId() {
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function isCreditAccount(account) {
  return account?.kind === 'credit';
}

export function isCashAccount(account) {
  return !isCreditAccount(account);
}

export function accountKindLabel(kind) {
  if (kind === 'credit') return 'Credit card';
  if (kind === 'debit') return 'Debit card';
  if (kind === 'salary') return 'Salary';
  if (kind === 'savings') return 'Savings';
  return 'Bank';
}

/** Normalize one account; preserves credit card fields. */
export function normalizeAccount(raw = {}) {
  const id = String(raw?.id || '').trim();
  const name = String(raw?.name || '').trim();
  if (!id || !name) return null;

  const kindRaw = String(raw?.kind || 'other').trim();
  const kind = Object.values(ACCOUNT_KINDS).includes(kindRaw) ? kindRaw : 'other';

  const account = { id, name, kind };

  if (kind === 'credit') {
    const limit = Number(raw.creditLimit);
    account.creditLimit = Number.isFinite(limit) && limit > 0 ? Math.round(limit) : 0;
    const due = Number(raw.dueDay);
    account.dueDay =
      Number.isFinite(due) && due >= 1 && due <= 31 ? Math.round(due) : null;
  }

  return account;
}

/** Normalize account list; empty → default Salary + Savings. */
export function ensureAccounts(accounts) {
  if (Array.isArray(accounts) && accounts.length > 0) {
    const list = [];
    const seen = new Set();
    for (const item of accounts) {
      const account = normalizeAccount(item);
      if (!account) continue;
      const key = account.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(account);
      if (list.length >= MAX_ACCOUNTS) break;
    }
    return list.length ? list : DEFAULT_ACCOUNTS.map((item) => ({ ...item }));
  }
  return DEFAULT_ACCOUNTS.map((item) => ({ ...item }));
}

export function getAccountById(accounts, accountId) {
  return (accounts || []).find((item) => item.id === accountId) || null;
}

export function getDefaultAccountId(accounts) {
  const list = accounts || [];
  const salary = list.find((item) => item.kind === 'salary');
  const cash = list.find((item) => isCashAccount(item));
  return salary?.id || cash?.id || list[0]?.id || DEFAULT_ACCOUNTS[0].id;
}

export function getCashAccounts(accounts = []) {
  return ensureAccounts(accounts).filter(isCashAccount);
}

export function getCreditAccounts(accounts = []) {
  return ensureAccounts(accounts).filter(isCreditAccount);
}

/**
 * Live signed balance per account.
 * Cash / debit: positive = money you have.
 * Credit: negative = outstanding owed (opening is starting outstanding as a positive number).
 *
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
    const opening = Number(accountOpenings?.[account.id]) || 0;
    // Credit openings are “starting outstanding” (positive) → store as negative liability.
    balances[account.id] = isCreditAccount(account) ? -Math.abs(opening) : opening;
  });

  const resolveBalanceId = (accountId) =>
    accountId && balances[accountId] !== undefined ? accountId : defaultId;

  (walletTransactions || []).forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    if (amount <= 0) return;

    if (tx.type === 'transfer') {
      // Unknown / deleted banks fold into the default so cash isn't lost.
      if (tx.fromAccountId) balances[resolveBalanceId(tx.fromAccountId)] -= amount;
      if (tx.toAccountId) balances[resolveBalanceId(tx.toAccountId)] += amount;
      return;
    }

    if (tx.type === 'credit') {
      balances[resolveBalanceId(tx.accountId)] += amount;
    }
  });

  (expenses || []).forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    if (amount <= 0) return;
    balances[resolveBalanceId(expense.accountId)] -= amount;
  });

  return balances;
}

/** Outstanding owed on a credit account from its signed balance. */
export function creditOutstandingFromBalance(signedBalance) {
  return Math.max(0, -Number(signedBalance) || 0);
}

/** Available credit = limit − outstanding. */
export function creditAvailable(account, signedBalance) {
  if (!isCreditAccount(account)) return null;
  const outstanding = creditOutstandingFromBalance(signedBalance);
  const limit = Number(account.creditLimit) || 0;
  return Math.max(0, limit - outstanding);
}

/** Enrich accounts with display balance fields for Wallet UI. */
export function withAccountBalanceViews(accounts = [], balances = {}) {
  const list = ensureAccounts(accounts);
  return list.map((account) => {
    const signed = Number(balances[account.id]) || 0;
    if (isCreditAccount(account)) {
      const outstanding = creditOutstandingFromBalance(signed);
      return {
        ...account,
        balance: signed,
        outstanding,
        available: creditAvailable(account, signed),
        displayBalance: outstanding,
        isCredit: true,
      };
    }
    return {
      ...account,
      balance: signed,
      outstanding: 0,
      available: null,
      displayBalance: signed,
      isCredit: false,
    };
  });
}

/** Sum cash/debit balances only (exclude credit liabilities). */
export function sumCashBalances(accounts = [], balances = {}) {
  return ensureAccounts(accounts)
    .filter(isCashAccount)
    .reduce((sum, account) => sum + (Number(balances[account.id]) || 0), 0);
}

/** Sum credit outstanding across cards. */
export function sumCreditOutstanding(accounts = [], balances = {}) {
  return ensureAccounts(accounts)
    .filter(isCreditAccount)
    .reduce(
      (sum, account) => sum + creditOutstandingFromBalance(balances[account.id]),
      0
    );
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
    const desiredSafe = Number.isFinite(desired) ? desired : 0;
    if (isCreditAccount(account)) {
      // desired = outstanding owed; opening feeds −outstanding into signed balance.
      openings[account.id] = desiredSafe + (base[account.id] || 0);
    } else {
      openings[account.id] = desiredSafe - (base[account.id] || 0);
    }
  });
  return openings;
}

export function resolveExpenseAccountId(expense, accounts) {
  return expense?.accountId || getDefaultAccountId(accounts);
}

/** Option label for expense / transfer pickers. */
export function formatAccountOptionLabel(account) {
  if (!account) return 'Account';
  const kind = accountKindLabel(account.kind);
  if (account.kind === 'salary' || account.kind === 'savings') return account.name;
  return `${account.name} · ${kind}`;
}
