import {
  buildLedgerRows,
  buildLedgerCsv,
  summarizeLedgerRows,
  buildSearchExportRows,
  buildSearchExportCsv,
} from './exportExpenses';

describe('exportExpenses', () => {
  const accounts = [
    { id: 'acc_salary', name: 'Salary', kind: 'salary' },
    { id: 'acc_savings', name: 'Savings', kind: 'savings' },
  ];

  const mainCategories = [{ id: 'food', name: 'Food & Groceries' }];

  test('builds income, expense, and transfer rows like history', () => {
    const rows = buildLedgerRows({
      expenses: [
        {
          id: 'e1',
          title: 'Groceries',
          amount: 500,
          category: 'Food & Groceries',
          accountId: 'acc_salary',
          date: '2026-09-10',
          createdAt: '2026-09-10T10:00:00.000Z',
        },
      ],
      walletTransactions: [
        {
          id: 't1',
          type: 'credit',
          source: 'income',
          amount: 50000,
          note: 'Salary',
          accountId: 'acc_salary',
          date: '2026-09-01',
          monthKey: '2026-09',
          createdAt: '2026-09-01T08:00:00.000Z',
        },
        {
          id: 't2',
          type: 'transfer',
          amount: 5000,
          fromAccountId: 'acc_salary',
          toAccountId: 'acc_savings',
          note: 'Savings',
          date: '2026-09-05',
          monthKey: '2026-09',
          createdAt: '2026-09-05T12:00:00.000Z',
        },
      ],
      accounts,
      mainCategories,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ type: 'Income', description: 'Salary · Salary' });
    expect(rows[1]).toMatchObject({ type: 'Transfer', description: 'Salary → Savings · Savings' });
    expect(rows[2]).toMatchObject({
      type: 'Expense',
      description: 'Groceries · Salary',
      category: 'Food & Groceries',
    });
  });

  test('summarizes ledger rows', () => {
    const summary = summarizeLedgerRows([
      { type: 'Income', amount: 1000 },
      { type: 'Expense', amount: 200 },
      { type: 'Transfer', amount: 50 },
    ]);
    expect(summary.total).toBe(3);
    expect(summary.incomeTotal).toBe(1000);
    expect(summary.expenseTotal).toBe(200);
    expect(summary.transferTotal).toBe(50);
  });

  test('buildLedgerCsv includes all columns', () => {
    const csv = buildLedgerCsv([
      {
        date: '2026-09-01',
        type: 'Income',
        description: 'Salary · Salary',
        category: '',
        account: 'Salary',
        split: '',
        amount: 1000,
      },
    ]);
    expect(csv).toContain('Date,Type,Description,Category,Account,Split,Amount');
    expect(csv).toContain('Income');
    expect(csv).toContain('Salary · Salary');
  });

  test('ledger export includes split detail', () => {
    const peopleGroups = [
      {
        id: 'g1',
        name: 'Satara trip',
        members: [
          { id: 'you', name: 'You', isSelf: true },
          { id: 'r', name: 'Rahul' },
          { id: 'p', name: 'Priya' },
        ],
      },
    ];
    const rows = buildLedgerRows({
      expenses: [
        {
          id: 'e1',
          title: 'Hotel',
          amount: 6000,
          category: 'Food & Groceries',
          accountId: 'acc_salary',
          date: '2026-09-10',
          createdAt: '2026-09-10T10:00:00.000Z',
          split: {
            groupId: 'g1',
            paidBy: 'you',
            memberIds: ['you', 'r', 'p'],
            mode: 'equal',
            shares: [
              { memberId: 'you', amount: 2000 },
              { memberId: 'r', amount: 2000 },
              { memberId: 'p', amount: 2000 },
            ],
          },
        },
      ],
      walletTransactions: [],
      accounts,
      mainCategories,
      peopleGroups,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    expect(rows[0].split).toContain('Satara trip');
    expect(rows[0].split).toContain('Paid by You');
    expect(rows[0].split).toContain('₹2,000 each');
  });

  test('search export includes tags and split', () => {
    const peopleGroups = [
      {
        id: 'g1',
        name: 'Satara trip',
        members: [
          { id: 'you', name: 'You', isSelf: true },
          { id: 'r', name: 'Rahul' },
        ],
      },
    ];
    const rows = buildSearchExportRows({
      expenses: [
        {
          id: 'e1',
          title: 'Hotel',
          amount: 2000,
          category: 'Food & Groceries',
          accountId: 'acc_salary',
          date: '2026-09-10',
          tags: ['trip'],
          split: {
            groupId: 'g1',
            paidBy: 'you',
            memberIds: ['you', 'r'],
            mode: 'equal',
            shares: [
              { memberId: 'you', amount: 1000 },
              { memberId: 'r', amount: 1000 },
            ],
          },
        },
      ],
      accounts,
      mainCategories,
      peopleGroups,
    });
    expect(rows[0]).toMatchObject({
      title: 'Hotel',
      tags: '#trip',
      account: 'Salary',
    });
    expect(rows[0].split).toContain('Satara trip');
    const csv = buildSearchExportCsv(rows);
    expect(csv).toContain('Date,Title,Category,Tags,Account,Split,Amount');
    expect(csv).toContain('#trip');
    expect(csv).toContain('Satara trip');
  });
});