import { searchExpenses } from './searchExpenses';

describe('searchExpenses', () => {
  const expenses = [
    { id: '1', title: 'Uber to office', category: 'Travel', amount: 240, date: '2026-08-01', paymentMode: 'UPI' },
    { id: '2', title: 'Lunch', category: 'Food', amount: 350, date: '2026-08-02', paymentMode: 'Cash' },
    { id: '3', title: 'Netflix', category: 'Entertainment', amount: 649, date: '2026-07-15', paymentMode: 'Card' },
  ];

  test('returns empty for blank query', () => {
    expect(searchExpenses(expenses, '  ')).toEqual([]);
  });

  test('matches title case-insensitively', () => {
    const hits = searchExpenses(expenses, 'uber');
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe('1');
  });

  test('matches category', () => {
    expect(searchExpenses(expenses, 'food').map((e) => e.id)).toEqual(['2']);
  });

  test('matches amount with at least 2 digits', () => {
    expect(searchExpenses(expenses, '649').map((e) => e.id)).toEqual(['3']);
    expect(searchExpenses(expenses, '35').map((e) => e.id)).toEqual(['2']);
  });

  test('does not match every expense for a single digit via ISO date', () => {
    expect(searchExpenses(expenses, '2').map((e) => e.id)).toEqual([]);
  });

  test('matches readable month names in dates', () => {
    expect(searchExpenses(expenses, 'jul').map((e) => e.id)).toEqual(['3']);
  });

  test('sorts newest first', () => {
    const hits = searchExpenses(
      [
        ...expenses,
        { id: '4', title: 'Food delivery', category: 'Food', amount: 200, date: '2026-08-03' },
      ],
      'food'
    );
    expect(hits.map((e) => e.id)).toEqual(['4', '2']);
  });

  test('matches tags with or without #', () => {
    const withTags = [
      ...expenses,
      {
        id: '5',
        title: 'Hotel',
        category: 'Travel',
        amount: 2000,
        date: '2026-08-04',
        tags: ['trip', 'goa'],
      },
    ];
    expect(searchExpenses(withTags, '#trip').map((e) => e.id)).toEqual(['5']);
    expect(searchExpenses(withTags, 'trip').map((e) => e.id)).toEqual(['5']);
  });
});
