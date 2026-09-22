import {
  allocationTotal,
  commitmentsForSafeSpend,
  compareMonths,
  computeSafeToSpend,
  dailySafeAmount,
  daysRemainingInMonth,
  heldFromAllocation,
  listUpcoming,
  normalizeAllocation,
  recordDateForTemplate,
  reviewOutlook,
  suggestEmergencyTarget,
  topCategories,
  unallocatedAmount,
} from './planning';

describe('computeSafeToSpend', () => {
  test('matches money left when nothing is planned', () => {
    const snapshot = computeSafeToSpend({
      funded: 50000,
      spent: 12000,
      held: 0,
      upcomingTotal: 0,
    });
    expect(snapshot.left).toBe(38000);
    expect(snapshot.safe).toBe(38000);
  });

  test('holds savings and upcoming bills back from safe to spend', () => {
    const snapshot = computeSafeToSpend({
      funded: 50000,
      spent: 10000,
      held: 8000,
      upcomingTotal: 5000,
    });
    expect(snapshot.left).toBe(40000);
    expect(snapshot.safe).toBe(27000);
  });

  test('stays at zero before income exists', () => {
    const snapshot = computeSafeToSpend({
      funded: 0,
      spent: 2000,
      held: 1000,
      upcomingTotal: 500,
    });
    expect(snapshot.hasIncome).toBe(false);
    expect(snapshot.left).toBe(0);
    expect(snapshot.safe).toBe(0);
  });
});

describe('allocation', () => {
  test('ignores negative and blank amounts', () => {
    expect(normalizeAllocation({ savings: -20, flexible: '1500', essentials: '' }).savings).toBe(0);
    expect(normalizeAllocation({ flexible: '1500' }).flexible).toBe(1500);
  });

  test('holds only savings, goals, and investment', () => {
    const plan = {
      essentials: 10000,
      bills: 8000,
      savings: 5000,
      goals: 2000,
      investment: 3000,
      flexible: 12000,
    };
    expect(heldFromAllocation(plan)).toBe(10000);
    expect(allocationTotal(plan)).toBe(40000);
    expect(unallocatedAmount(40000, plan)).toBe(0);
  });
});

describe('commitments', () => {
  const rent = {
    id: 'rent',
    enabled: true,
    amount: 15000,
    nextDate: '2026-09-05',
  };
  const overdue = {
    id: 'emi',
    enabled: true,
    amount: 4000,
    nextDate: '2026-08-10',
  };
  const paused = {
    id: 'gym',
    enabled: false,
    amount: 1000,
    nextDate: '2026-09-01',
  };

  test('includes this month and older overdue bills only for the current month', () => {
    const current = commitmentsForSafeSpend([rent, overdue, paused], {
      month: 9,
      year: 2026,
      today: '2026-09-22',
      isCurrentMonth: true,
    });
    expect(current.map((item) => item.id)).toEqual(['rent', 'emi']);

    const august = commitmentsForSafeSpend([rent, overdue], {
      month: 8,
      year: 2026,
      today: '2026-09-22',
      isCurrentMonth: false,
    });
    expect(august.map((item) => item.id)).toEqual(['emi']);
  });

  test('lists overdue and near-term items without posting them', () => {
    const upcoming = listUpcoming([rent, overdue, paused], { today: '2026-09-22', horizonDays: 10 });
    expect(upcoming.map((item) => item.id)).toEqual(['emi', 'rent']);
  });

  test('records a due date inside this month and catches older bills up today', () => {
    expect(recordDateForTemplate('2026-09-05', '2026-09-22')).toBe('2026-09-05');
    expect(recordDateForTemplate('2026-08-10', '2026-09-22')).toBe('2026-09-22');
    expect(recordDateForTemplate('2026-09-28', '2026-09-22')).toBeNull();
  });
});

describe('goals and review', () => {
  test('suggests three months of planned essentials', () => {
    expect(
      suggestEmergencyTarget({
        allocation: { essentials: 20000, bills: 10000 },
        recentEssentialTotals: [5000],
      })
    ).toBe(90000);
  });

  test('falls back to the average of recent essential spending', () => {
    expect(
      suggestEmergencyTarget({
        allocation: {},
        recentEssentialTotals: [10000, 20000, 0],
      })
    ).toBe(45000);
  });

  test('splits the month into a daily amount', () => {
    expect(daysRemainingInMonth('2026-09-22')).toBe(9);
    expect(dailySafeAmount(27000, 9)).toBe(3000);
  });

  test('ranks spending and describes the month against the last one', () => {
    expect(topCategories({ Food: 100, Rent: 400, Tea: 50 }, 2)).toEqual([
      { name: 'Rent', amount: 400 },
      { name: 'Food', amount: 100 },
    ]);
    const comparison = compareMonths(
      { income: 50000, spent: 20000, left: 30000 },
      { income: 48000, spent: 25000, left: 23000 }
    );
    expect(comparison.hasPrevious).toBe(true);
    expect(comparison.spentDelta).toBe(-5000);
    expect(reviewOutlook(comparison)).toBe(
      'Spending is down and more money is left than last month.'
    );
    expect(compareMonths({ income: 1, spent: 0, left: 1 }, { income: 0, spent: 0, left: 0 }).hasPrevious).toBe(
      false
    );
  });
});
