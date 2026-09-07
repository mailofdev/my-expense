import { buildReportChartData, buildReportHtml, buildShareableSplitHtml, buildShareableSplitRows } from './exportReport';

describe('exportReport', () => {
  test('buildReportChartData aggregates expenses by category and day', () => {
    const data = buildReportChartData(
      [
        { type: 'Income', amount: 50000, date: '2026-09-01', category: '' },
        {
          type: 'Expense',
          amount: 500,
          date: '2026-09-10',
          category: 'Food & Groceries',
        },
        {
          type: 'Expense',
          amount: 200,
          date: '2026-09-10',
          category: 'Food & Groceries',
        },
        {
          type: 'Expense',
          amount: 300,
          date: '2026-09-11',
          category: 'Transport & Fuel',
        },
        { type: 'Transfer', amount: 1000, date: '2026-09-05', category: '' },
      ],
      { mode: 'ledger' }
    );

    expect(data.incomeTotal).toBe(50000);
    expect(data.expenseTotal).toBe(1000);
    expect(data.categoryLabels).toEqual(['Food & Groceries', 'Transport & Fuel']);
    expect(data.categoryValues).toEqual([700, 300]);
    expect(data.dayValues).toEqual([700, 300]);
  });

  test('buildReportHtml includes charts and table markup', () => {
    const html = buildReportHtml({
      title: 'Glow Money report',
      subtitle: 'Test range',
      mode: 'ledger',
      rows: [
        {
          date: '2026-09-01',
          type: 'Income',
          description: 'Salary',
          category: '',
          account: 'Salary',
          amount: 1000,
        },
        {
          date: '2026-09-02',
          type: 'Expense',
          description: 'Tea',
          category: 'Food & Groceries',
          account: 'Salary',
          amount: 50,
        },
      ],
    });

    expect(html).toContain('chart.js@4.5.1');
    expect(html).toContain('id="flowChart"');
    expect(html).toContain('id="categoryChart"');
    expect(html).toContain('id="dayChart"');
    expect(html).toContain('Tea');
    expect(html).toContain('Food &amp; Groceries');
    expect(html).toContain('<th>Split</th>');
  });

  test('report includes split column and balances section', () => {
    const html = buildReportHtml({
      title: 'Glow Money report',
      subtitle: 'Tag satara_trip',
      mode: 'search',
      rows: [
        {
          date: '2026-09-02',
          title: 'Hotel',
          category: 'Travel',
          tags: '#satara_trip',
          account: 'Salary',
          split: 'Satara trip · Paid by You · You, Rahul · ₹1,000 each',
          amount: 2000,
        },
      ],
      settlementBalances: [
        { fromName: 'Rahul', toName: 'You', amount: 1000 },
      ],
    });

    expect(html).toContain('Satara trip · Paid by You');
    expect(html).toContain('Split balances');
    expect(html).toContain('Rahul');
  });

  test('search mode report skips income vs expenses chart', () => {
    const html = buildReportHtml({
      title: 'Glow Money report',
      subtitle: 'Tag trip',
      mode: 'search',
      rows: [
        {
          date: '2026-09-02',
          title: 'Hotel',
          category: 'Travel',
          tags: '#trip',
          account: 'Salary',
          amount: 2000,
        },
      ],
    });

    expect(html).not.toContain('id="flowChart"');
    expect(html).toContain('id="categoryChart"');
    expect(html).toContain('#trip');
  });

  test('shareable split report omits banks and includes settlements', () => {
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
    const expenses = [
      {
        id: 'e1',
        title: 'Hotel',
        amount: 2000,
        date: '2026-09-02',
        accountId: 'acc_salary',
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
      {
        id: 'e2',
        title: 'Solo snack',
        amount: 50,
        date: '2026-09-02',
        // no split — should be skipped
      },
    ];
    const rows = buildShareableSplitRows(expenses, peopleGroups);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: 'Hotel',
      paidBy: 'You',
      sharedWith: 'You, Rahul',
      each: 1000,
    });

    const html = buildShareableSplitHtml({
      title: 'Shared expenses',
      subtitle: 'Ready to share',
      rows,
      settlementBalances: [{ fromName: 'Rahul', toName: 'You', amount: 1000 }],
    });
    expect(html).toContain('Hotel');
    expect(html).toContain('Paid by');
    expect(html).toContain('Split balances');
    expect(html).toContain('Rahul');
    expect(html).toContain('Safe to forward');
    expect(html).toContain('chart.js@4.5.1');
    expect(html).toContain('id="payerChart"');
    expect(html).toContain('id="dayChart"');
    expect(html).toContain('id="settleChart"');
    expect(html).not.toContain('Salary');
    expect(html).not.toContain('acc_salary');
  });
});
