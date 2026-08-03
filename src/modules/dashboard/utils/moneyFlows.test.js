import dayjs from 'dayjs';
import { resolveMonthIncome, advanceRecurringNextDate } from './moneyFlows';

describe('resolveMonthIncome', () => {
  test('uses per-month map including zero', () => {
    expect(
      resolveMonthIncome({
        monthKey: '2026-08',
        monthlyIncomes: { '2026-07': 50000, '2026-08': 0 },
        legacyMonthlyIncome: 50000,
      })
    ).toBe(0);
  });

  test('does not leak legacy income into a new month', () => {
    expect(
      resolveMonthIncome({
        monthKey: '2026-08',
        monthlyIncomes: { '2026-07': 50000 },
        legacyMonthlyIncome: 50000,
      })
    ).toBe(0);
  });

  test('falls back to legacy only when map is empty', () => {
    expect(
      resolveMonthIncome({
        monthKey: '2026-08',
        monthlyIncomes: {},
        legacyMonthlyIncome: 42000,
      })
    ).toBe(42000);
  });

  test('sums income-tagged transactions when map lacks key', () => {
    expect(
      resolveMonthIncome({
        monthKey: '2026-08',
        monthlyIncomes: { '2026-07': 1000 },
        walletTransactions: [
          { type: 'credit', source: 'income', monthKey: '2026-08', amount: 2000 },
          { type: 'credit', source: 'manual', monthKey: '2026-08', amount: 500 },
        ],
      })
    ).toBe(2000);
  });
});

describe('advanceRecurringNextDate', () => {
  test('skips overdue months until after today', () => {
    const today = dayjs('2026-08-03');
    const next = advanceRecurringNextDate(dayjs('2026-06-01'), 'monthly', today);
    expect(next.format('YYYY-MM-DD')).toBe('2026-09-01');
  });

  test('advances weekly past today', () => {
    const today = dayjs('2026-08-03');
    const next = advanceRecurringNextDate(dayjs('2026-07-20'), 'weekly', today);
    expect(next.isAfter(today, 'day')).toBe(true);
  });
});
