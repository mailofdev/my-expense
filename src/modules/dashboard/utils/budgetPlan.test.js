import {
  computeSpendablePool,
  suggestCategoryBudgets,
  sumCategoryBudgets,
  normalizeCategoryBudgetMap,
  getBudgetAllocationStatus,
  clampSavingsPercent,
} from './budgetPlan';

describe('budgetPlan', () => {
  test('computeSpendablePool subtracts savings from income', () => {
    expect(computeSpendablePool(50000, 20)).toEqual({
      income: 50000,
      savingsPercent: 20,
      savingsTarget: 10000,
      spendable: 40000,
    });
  });

  test('computeSpendablePool handles zero income', () => {
    expect(computeSpendablePool(0, 20)).toEqual({
      income: 0,
      savingsPercent: 20,
      savingsTarget: 0,
      spendable: 0,
    });
  });

  test('clampSavingsPercent stays in 0–80', () => {
    expect(clampSavingsPercent(-5)).toBe(0);
    expect(clampSavingsPercent(100)).toBe(80);
    expect(clampSavingsPercent('15')).toBe(15);
  });

  test('suggestCategoryBudgets sums to spendable for system categories', () => {
    const names = [
      'Food & Groceries',
      'Household & Living',
      'Transport & Fuel',
      'Shopping & Lifestyle',
      'Bills & EMIs',
      'Family & Transfers',
      'Personal & Gifts',
      'Miscellaneous',
    ];
    const suggested = suggestCategoryBudgets(40000, names);
    expect(sumCategoryBudgets(suggested)).toBe(40000);
    expect(suggested['Food & Groceries']).toBe(10000);
  });

  test('normalizeCategoryBudgetMap drops zeros and unknown keys', () => {
    expect(
      normalizeCategoryBudgetMap(
        { 'Food & Groceries': 1000, Misc: 0, Ghost: 50 },
        ['Food & Groceries', 'Miscellaneous']
      )
    ).toEqual({ 'Food & Groceries': 1000 });
  });

  test('getBudgetAllocationStatus flags over-allocation', () => {
    expect(getBudgetAllocationStatus(45000, 40000)).toMatchObject({
      overAllocated: true,
      remaining: -5000,
    });
  });
});
