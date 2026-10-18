import { buildCopyText, formatLedgerCopyLine, formatSearchCopyLine } from './copyExpenses';

describe('copyExpenses', () => {
  test('ledger line keeps type so income and expenses stay clear', () => {
    expect(
      formatLedgerCopyLine({
        date: '2026-10-18',
        type: 'Expense',
        description: 'Swiggy · Salary',
        category: 'Food',
        amount: 450,
        split: '',
      })
    ).toBe('18 Oct 2026 · Expense · Swiggy · Salary · Food · ₹450');

    expect(
      formatLedgerCopyLine({
        date: '2026-10-01',
        type: 'Income',
        description: 'Salary · Salary',
        category: '',
        amount: 50000,
      })
    ).toBe('1 Oct 2026 · Income · Salary · Salary · ₹50,000');
  });

  test('search line is one readable expense, with tags and split when present', () => {
    expect(
      formatSearchCopyLine({
        date: '2026-10-18',
        title: 'Swiggy',
        category: 'Food',
        tags: '',
        account: '',
        amount: 450,
        split: '',
      })
    ).toBe('18 Oct 2026 · Swiggy · Food · ₹450');

    expect(
      formatSearchCopyLine({
        date: '2026-10-18',
        title: 'Groceries',
        category: 'Food',
        tags: '#home',
        account: 'Salary',
        amount: 1200,
        split: 'Rahul ₹600, you ₹600',
      })
    ).toBe('18 Oct 2026 · Groceries · Food · #home · Salary · ₹1,200 · Rahul ₹600, you ₹600');
  });

  test('buildCopyText stacks one expense per line', () => {
    expect(buildCopyText(['18 Oct 2026 · Swiggy · Food · ₹450', ''])).toBe(
      '18 Oct 2026 · Swiggy · Food · ₹450'
    );
    expect(buildCopyText(['a', 'b'])).toBe('a\nb');
  });
});