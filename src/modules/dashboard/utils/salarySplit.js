import { heldFromAllocation, normalizeAllocation } from './planning';
import { getDefaultMainName, getMainById } from './categories';

/**
 * Standing salary split.
 * Investment and the emergency fund are set aside.
 * The other lines are monthly category limits.
 * Percents of every line add up to 100. Home’s household line absorbs rounding.
 */
export const SALARY_GROUPS = [
  {
    id: 'investment',
    label: 'Investment',
    percent: 25,
    lines: [{ id: 'investment', label: 'Investment', percent: 25, kind: 'plan' }],
  },
  {
    id: 'emergency',
    label: 'Emergency fund',
    percent: 10,
    lines: [{ id: 'emergency', label: 'Emergency fund', percent: 10, kind: 'plan' }],
  },
  {
    id: 'vehicle',
    label: 'Bike / car',
    percent: 15,
    lines: [
      {
        id: 'transport_fuel',
        label: 'Transport & Fuel',
        percent: 15,
        kind: 'category',
        categoryId: 'transport_fuel',
      },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    percent: 15,
    lines: [
      {
        id: 'shopping_lifestyle',
        label: 'Shopping & Lifestyle',
        percent: 6,
        kind: 'category',
        categoryId: 'shopping_lifestyle',
      },
      {
        id: 'personal_gifts',
        label: 'Personal & Gifts',
        percent: 5,
        kind: 'category',
        categoryId: 'personal_gifts',
      },
      {
        id: 'family_transfers',
        label: 'Family & Transfers',
        percent: 2,
        kind: 'category',
        categoryId: 'family_transfers',
      },
      {
        id: 'miscellaneous',
        label: 'Miscellaneous',
        percent: 2,
        kind: 'category',
        categoryId: 'miscellaneous',
      },
    ],
  },
  {
    id: 'home',
    label: 'Home',
    percent: 35,
    lines: [
      {
        id: 'household_living',
        label: 'Household & Living',
        percent: 18,
        kind: 'category',
        categoryId: 'household_living',
      },
      {
        id: 'food_groceries',
        label: 'Food & Groceries',
        percent: 10,
        kind: 'category',
        categoryId: 'food_groceries',
      },
      {
        id: 'bills_emis',
        label: 'Bills & EMIs',
        percent: 7,
        kind: 'category',
        categoryId: 'bills_emis',
      },
    ],
  },
];

const REMAINDER_LINE_ID = 'household_living';

export const SALARY_LINES = SALARY_GROUPS.flatMap((group) =>
  group.lines.map((line) => ({
    ...line,
    groupId: group.id,
    groupLabel: group.label,
    groupPercent: group.percent,
  }))
);

export function emptySalaryAmounts() {
  return Object.fromEntries(SALARY_LINES.map((line) => [line.id, 0]));
}

export function normalizeSalaryAmounts(raw) {
  const base = emptySalaryAmounts();
  if (!raw || typeof raw !== 'object') return base;
  SALARY_LINES.forEach((line) => {
    base[line.id] = Math.max(0, Math.round(Number(raw[line.id]) || 0));
  });
  return base;
}

/** Round each share, then give leftover rupees to household so the split matches salary. */
export function suggestSalarySplit(salary) {
  const total = Math.max(0, Math.round(Number(salary) || 0));
  const amounts = emptySalaryAmounts();
  let used = 0;
  SALARY_LINES.forEach((line) => {
    if (line.id === REMAINDER_LINE_ID) return;
    const amount = Math.round((total * line.percent) / 100);
    amounts[line.id] = amount;
    used += amount;
  });
  amounts[REMAINDER_LINE_ID] = Math.max(0, total - used);
  return amounts;
}

export function salaryAmountsTotal(amounts) {
  const plan = normalizeSalaryAmounts(amounts);
  return SALARY_LINES.reduce((sum, line) => sum + plan[line.id], 0);
}

export function groupAmount(amounts, groupId) {
  const plan = normalizeSalaryAmounts(amounts);
  return SALARY_LINES.filter((line) => line.groupId === groupId).reduce(
    (sum, line) => sum + plan[line.id],
    0
  );
}

/** Saved calculator. Missing or disabled plans keep the older month-by-month allocation. */
export function normalizeSalaryPlan(raw) {
  if (!raw || typeof raw !== 'object' || raw.enabled !== true) return null;
  return {
    enabled: true,
    salary: Math.max(0, Math.round(Number(raw.salary) || 0)),
    investment: Math.max(0, Math.round(Number(raw.investment) || 0)),
    emergency: Math.max(0, Math.round(Number(raw.emergency) || 0)),
  };
}

export function salaryPlanFromAmounts(salary, amounts) {
  const plan = normalizeSalaryAmounts(amounts);
  return {
    enabled: true,
    salary: Math.max(0, Math.round(Number(salary) || 0)),
    investment: plan.investment,
    emergency: plan.emergency,
  };
}

export function categoryNameForLine(line, mainCategories) {
  if (line.kind !== 'category') return line.label;
  const main = getMainById(mainCategories, line.categoryId);
  return main?.name || getDefaultMainName(line.categoryId) || line.label;
}

export function hasStoredSplit({ categoryBudgets, salaryPlan }) {
  if (normalizeSalaryPlan(salaryPlan)) return true;
  return Object.values(categoryBudgets || {}).some((value) => Number(value) > 0);
}

export function amountsFromStored({ categoryBudgets, mainCategories, salaryPlan }) {
  const amounts = emptySalaryAmounts();
  const standing = normalizeSalaryPlan(salaryPlan);
  if (standing) {
    amounts.investment = standing.investment;
    amounts.emergency = standing.emergency;
  }
  SALARY_LINES.filter((line) => line.kind === 'category').forEach((line) => {
    const name = categoryNameForLine(line, mainCategories);
    amounts[line.id] = Math.max(0, Math.round(Number(categoryBudgets?.[name]) || 0));
  });
  return amounts;
}

export function categoryBudgetsFromAmounts(amounts, mainCategories) {
  const next = {};
  const plan = normalizeSalaryAmounts(amounts);
  SALARY_LINES.filter((line) => line.kind === 'category').forEach((line) => {
    const name = categoryNameForLine(line, mainCategories);
    const amount = plan[line.id];
    if (amount > 0) next[name] = amount;
  });
  return next;
}

/**
 * Draft for the calculator.
 * A saved split or existing limits win. Otherwise suggest from this month’s income.
 */
export function buildCalculatorDraft({
  salaryPlan,
  categoryBudgets,
  mainCategories,
  monthIncome,
  allocation,
}) {
  const standing = normalizeSalaryPlan(salaryPlan);
  const income = Math.max(0, Math.round(Number(monthIncome) || 0));
  const monthPlan = normalizeAllocation(allocation);
  if (hasStoredSplit({ categoryBudgets, salaryPlan })) {
    const salary = standing?.salary > 0 ? standing.salary : income;
    const amounts = amountsFromStored({ categoryBudgets, mainCategories, salaryPlan });
    if (!standing) {
      if (!amounts.investment) amounts.investment = monthPlan.investment;
      if (!amounts.emergency) amounts.emergency = monthPlan.savings;
    }
    return {
      salary,
      amounts,
      fromIncome: !(standing?.salary > 0),
    };
  }
  if (monthPlan.investment > 0 || monthPlan.savings > 0) {
    const amounts = emptySalaryAmounts();
    amounts.investment = monthPlan.investment;
    amounts.emergency = monthPlan.savings;
    return {
      salary: income,
      amounts,
      fromIncome: income > 0,
    };
  }
  return {
    salary: income,
    amounts: income > 0 ? suggestSalarySplit(income) : emptySalaryAmounts(),
    fromIncome: income > 0,
  };
}

/** Investment and emergency fund are held every month once the calculator is saved. */
export function heldForSafeSpend(allocation, salaryPlan) {
  const plan = normalizeAllocation(allocation);
  const standing = normalizeSalaryPlan(salaryPlan);
  if (standing) return plan.goals + standing.investment + standing.emergency;
  return heldFromAllocation(plan);
}

export function plannedSetAside(allocation, salaryPlan) {
  const plan = normalizeAllocation(allocation);
  const standing = normalizeSalaryPlan(salaryPlan);
  if (standing) {
    return {
      savings: standing.emergency + plan.goals,
      investment: standing.investment,
    };
  }
  return {
    savings: plan.savings + plan.goals,
    investment: plan.investment,
  };
}
