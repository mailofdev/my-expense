import {
  SALARY_LINES,
  buildCalculatorDraft,
  categoryBudgetsFromAmounts,
  heldForSafeSpend,
  plannedSetAside,
  salaryAmountsTotal,
  suggestSalarySplit,
} from './salarySplit';

describe('suggestSalarySplit', () => {
  test('line percents add up to 100', () => {
    const percent = SALARY_LINES.reduce((sum, line) => sum + line.percent, 0);
    expect(percent).toBe(100);
  });

  test('splits a round salary into the default shares', () => {
    expect(suggestSalarySplit(100000)).toEqual({
      investment: 25000,
      emergency: 10000,
      transport_fuel: 15000,
      shopping_lifestyle: 6000,
      personal_gifts: 5000,
      family_transfers: 2000,
      miscellaneous: 2000,
      household_living: 18000,
      food_groceries: 10000,
      bills_emis: 7000,
    });
  });

  test('gives leftover rupees to household so the total matches salary', () => {
    const salary = 33333;
    const amounts = suggestSalarySplit(salary);
    expect(salaryAmountsTotal(amounts)).toBe(salary);
    expect(amounts.household_living).toBeGreaterThan(0);
  });
});

describe('buildCalculatorDraft', () => {
  test('keeps an existing month plan until the calculator is saved', () => {
    const draft = buildCalculatorDraft({
      salaryPlan: null,
      categoryBudgets: {},
      mainCategories: [],
      monthIncome: 50000,
      allocation: { investment: 9000, savings: 4000 },
    });
    expect(draft.amounts.investment).toBe(9000);
    expect(draft.amounts.emergency).toBe(4000);
    expect(draft.amounts.food_groceries).toBe(0);
  });

  test('suggests from income when nothing is saved', () => {
    const draft = buildCalculatorDraft({
      salaryPlan: null,
      categoryBudgets: {},
      mainCategories: [],
      monthIncome: 50000,
    });
    expect(draft.fromIncome).toBe(true);
    expect(draft.salary).toBe(50000);
    expect(draft.amounts.investment).toBe(12500);
  });

  test('keeps saved limits instead of replacing them', () => {
    const draft = buildCalculatorDraft({
      salaryPlan: { enabled: true, salary: 80000, investment: 10000, emergency: 5000 },
      categoryBudgets: { 'Transport & Fuel': 4000 },
      mainCategories: [],
      monthIncome: 90000,
    });
    expect(draft.salary).toBe(80000);
    expect(draft.fromIncome).toBe(false);
    expect(draft.amounts.investment).toBe(10000);
    expect(draft.amounts.emergency).toBe(5000);
    expect(draft.amounts.transport_fuel).toBe(4000);
    expect(draft.amounts.food_groceries).toBe(0);
  });
});

describe('categoryBudgetsFromAmounts', () => {
  test('writes only category lines that are above zero', () => {
    const budgets = categoryBudgetsFromAmounts(
      { ...suggestSalarySplit(100000), transport_fuel: 0 },
      []
    );
    expect(budgets['Transport & Fuel']).toBeUndefined();
    expect(budgets['Food & Groceries']).toBe(10000);
    expect(budgets.Investment).toBeUndefined();
  });
});

describe('heldForSafeSpend', () => {
  const allocation = {
    essentials: 10000,
    bills: 8000,
    savings: 4000,
    goals: 2000,
    investment: 3000,
    flexible: 1000,
  };

  test('uses the standing split and still holds goal money', () => {
    const salaryPlan = { enabled: true, salary: 100000, investment: 25000, emergency: 10000 };
    expect(heldForSafeSpend(allocation, salaryPlan)).toBe(37000);
    expect(plannedSetAside(allocation, salaryPlan)).toEqual({
      savings: 12000,
      investment: 25000,
    });
  });

  test('falls back to the month plan when the calculator has not been saved', () => {
    expect(heldForSafeSpend(allocation, null)).toBe(9000);
    expect(plannedSetAside(allocation, null)).toEqual({
      savings: 6000,
      investment: 3000,
    });
  });
});
