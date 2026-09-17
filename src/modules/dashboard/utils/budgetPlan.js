/**
 * Soft budget plan: category limits come from monthly income minus a savings target.
 * Bank balances (Salary / Savings / others) are not the budget base.
 */

export const DEFAULT_SAVINGS_GOAL_PERCENT = 20;

/** Suggested share of spendable pool per system category name. */
export const DEFAULT_CATEGORY_SHARE_PERCENTS = {
  'Food & Groceries': 25,
  'Household & Living': 25,
  'Transport & Fuel': 10,
  'Shopping & Lifestyle': 10,
  'Bills & EMIs': 15,
  'Family & Transfers': 5,
  'Personal & Gifts': 5,
  Miscellaneous: 5,
};

export function clampSavingsPercent(value, fallback = DEFAULT_SAVINGS_GOAL_PERCENT) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(80, Math.max(0, Math.round(n)));
}

/**
 * @returns {{ income: number, savingsPercent: number, savingsTarget: number, spendable: number }}
 */
export function computeSpendablePool(income, savingsGoalPercent) {
  const safeIncome = Math.max(0, Math.round(Number(income) || 0));
  const savingsPercent = clampSavingsPercent(savingsGoalPercent);
  const savingsTarget =
    safeIncome > 0 ? Math.round((safeIncome * savingsPercent) / 100) : 0;
  const spendable = Math.max(0, safeIncome - savingsTarget);
  return {
    income: safeIncome,
    savingsPercent,
    savingsTarget,
    spendable,
  };
}

export function sumCategoryBudgets(categoryBudgets = {}) {
  return Object.values(categoryBudgets).reduce(
    (sum, value) => sum + (Math.max(0, Math.round(Number(value) || 0))),
    0
  );
}

/** Keep only positive rounded limits for known category names. */
export function normalizeCategoryBudgetMap(categoryBudgets = {}, categoryNames = []) {
  const next = {};
  (categoryNames || []).forEach((name) => {
    const amount = Math.max(0, Math.round(Number(categoryBudgets?.[name]) || 0));
    if (amount > 0) next[name] = amount;
  });
  return next;
}

/**
 * Suggest rupee limits from spendable using default shares (renamed categories get equal leftover).
 */
export function suggestCategoryBudgets(spendable, categoryNames = []) {
  const pool = Math.max(0, Math.round(Number(spendable) || 0));
  const names = (categoryNames || []).filter(Boolean);
  if (pool <= 0 || names.length === 0) {
    return Object.fromEntries(names.map((name) => [name, 0]));
  }

  const known = names.filter((name) => DEFAULT_CATEGORY_SHARE_PERCENTS[name] != null);
  const unknown = names.filter((name) => DEFAULT_CATEGORY_SHARE_PERCENTS[name] == null);

  let knownShareTotal = known.reduce(
    (sum, name) => sum + DEFAULT_CATEGORY_SHARE_PERCENTS[name],
    0
  );
  if (knownShareTotal <= 0) knownShareTotal = 100;

  const result = {};
  let allocated = 0;

  known.forEach((name, index) => {
    const share = DEFAULT_CATEGORY_SHARE_PERCENTS[name] / knownShareTotal;
    let amount = Math.round(pool * share);
    if (index === known.length - 1 && unknown.length === 0) {
      amount = Math.max(0, pool - allocated);
    }
    result[name] = amount;
    allocated += amount;
  });

  if (unknown.length > 0) {
    const leftover = Math.max(0, pool - allocated);
    const each = Math.floor(leftover / unknown.length);
    let rem = leftover - each * unknown.length;
    unknown.forEach((name) => {
      const extra = rem > 0 ? 1 : 0;
      if (rem > 0) rem -= 1;
      result[name] = each + extra;
    });
  }

  return result;
}

export function getBudgetAllocationStatus(allocated, spendable) {
  const cap = Math.max(0, Math.round(Number(spendable) || 0));
  const used = Math.max(0, Math.round(Number(allocated) || 0));
  const remaining = cap - used;
  return {
    allocated: used,
    spendable: cap,
    remaining,
    overAllocated: used > cap && cap > 0,
    fullyAllocated: cap > 0 && used === cap,
    hasSpendable: cap > 0,
  };
}
