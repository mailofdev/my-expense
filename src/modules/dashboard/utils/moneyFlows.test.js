import dayjs from 'dayjs';
import {
  resolveMonthIncome,
  advanceRecurringNextDate,
  resolveLedgerDayKey,
  normalizeLedgerDate,
  monthKeyFromDate,
} from './moneyFlows';

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

describe('ledger date helpers', () => {
  test('prefers explicit date over createdAt', () => {
    expect(
      resolveLedgerDayKey({
        date: '2026-08-01',
        createdAt: '2026-08-06T12:00:00.000Z',
      })
    ).toBe('2026-08-01');
  });

  test('falls back to createdAt day for legacy income/transfers', () => {
    expect(
      resolveLedgerDayKey({
        createdAt: '2026-08-06T06:00:00.000Z',
      })
    ).toBe('2026-08-06');
  });

  test('monthKeyFromDate matches calendar month', () => {
    expect(monthKeyFromDate('2026-07-15')).toBe('2026-07');
  });

  test('normalizeLedgerDate clamps future dates', () => {
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    const today = dayjs().format('YYYY-MM-DD');
    expect(normalizeLedgerDate(tomorrow)).toBe(today);
  });
});
