import {
  computeAccountBalances,
  ensureAccounts,
  getDefaultAccountId,
  openingsForDesiredBalances,
  creditOutstandingFromBalance,
  formatAccountOptionLabel,
  parkedInSetAsideAccounts,
  sumCashBalances,
  sumSetAsideBalances,
  withAccountBalanceViews,
} from './accounts';

describe('accounts helpers', () => {
  const salarySavings = [
    { id: 'acc_salary', name: 'Salary', kind: 'salary' },
    { id: 'acc_savings', name: 'Savings', kind: 'savings' },
  ];
  const accounts = ensureAccounts(salarySavings);

  test('defaults to a single Cash account for new users', () => {
    const fresh = ensureAccounts();
    expect(fresh.map((a) => a.name)).toEqual(['Cash']);
    expect(getDefaultAccountId(fresh)).toBe('acc_cash');
  });

  test('keeps an existing Salary and Savings list', () => {
    expect(accounts.map((a) => a.name)).toEqual(['Salary', 'Savings']);
    expect(getDefaultAccountId(accounts)).toBe('acc_salary');
  });

  test('keeps custom bank list', () => {
    const custom = ensureAccounts([
      { id: 'a1', name: 'HDFC' },
      { id: 'a2', name: 'SBI' },
    ]);
    expect(custom.map((a) => a.name)).toEqual(['HDFC', 'SBI']);
  });

  test('normalizes debit and credit cards', () => {
    const list = ensureAccounts([
      { id: 'acc_salary', name: 'Salary', kind: 'salary' },
      { id: 'd1', name: 'HDFC Debit', kind: 'debit' },
      { id: 'c1', name: 'Amex', kind: 'credit', creditLimit: 100000, dueDay: 15 },
    ]);
    expect(list.find((a) => a.id === 'd1').kind).toBe('debit');
    expect(list.find((a) => a.id === 'c1')).toMatchObject({
      kind: 'credit',
      creditLimit: 100000,
      dueDay: 15,
    });
  });

  test('treats transfers as move, not spend', () => {
    const balances = computeAccountBalances({
      accounts,
      accountOpenings: { acc_salary: 50000, acc_savings: 10000 },
      walletTransactions: [
        { type: 'credit', accountId: 'acc_salary', amount: 5000, source: 'income' },
        {
          type: 'transfer',
          fromAccountId: 'acc_salary',
          toAccountId: 'acc_savings',
          amount: 8000,
        },
      ],
      expenses: [{ accountId: 'acc_salary', amount: 2000 }],
    });

    expect(balances.acc_salary).toBe(50000 + 5000 - 8000 - 2000);
    expect(balances.acc_savings).toBe(10000 + 8000);
  });

  test('credit card spend raises outstanding; bill pay lowers it', () => {
    const cardAccounts = ensureAccounts([
      { id: 'acc_salary', name: 'Salary', kind: 'salary' },
      { id: 'acc_cc', name: 'HDFC Credit', kind: 'credit', creditLimit: 100000 },
    ]);
    const balances = computeAccountBalances({
      accounts: cardAccounts,
      accountOpenings: { acc_salary: 20000, acc_cc: 0 },
      expenses: [{ accountId: 'acc_cc', amount: 5000 }],
      walletTransactions: [
        {
          type: 'transfer',
          fromAccountId: 'acc_salary',
          toAccountId: 'acc_cc',
          amount: 2000,
          note: 'Card payment',
        },
      ],
    });

    expect(balances.acc_salary).toBe(18000);
    expect(creditOutstandingFromBalance(balances.acc_cc)).toBe(3000);

    const views = withAccountBalanceViews(cardAccounts, balances);
    const cc = views.find((a) => a.id === 'acc_cc');
    expect(cc.outstanding).toBe(3000);
    expect(cc.available).toBe(97000);
    expect(sumCashBalances(cardAccounts, balances)).toBe(18000);
  });

  test('credit opening seeds starting outstanding', () => {
    const cardAccounts = ensureAccounts([
      { id: 'acc_salary', name: 'Salary', kind: 'salary' },
      { id: 'acc_cc', name: 'Card', kind: 'credit', creditLimit: 50000 },
    ]);
    const balances = computeAccountBalances({
      accounts: cardAccounts,
      accountOpenings: { acc_salary: 0, acc_cc: 8000 },
      expenses: [],
      walletTransactions: [],
    });
    expect(creditOutstandingFromBalance(balances.acc_cc)).toBe(8000);
  });

  test('untagged legacy items use Salary', () => {
    const balances = computeAccountBalances({
      accounts,
      accountOpenings: { acc_salary: 1000, acc_savings: 0 },
      walletTransactions: [{ type: 'credit', amount: 500 }],
      expenses: [{ amount: 200 }],
    });

    expect(balances.acc_salary).toBe(1300);
    expect(balances.acc_savings).toBe(0);
  });

  test('deleted bank expenses fold into default', () => {
    const balances = computeAccountBalances({
      accounts,
      accountOpenings: { acc_salary: 10000, acc_savings: 0 },
      walletTransactions: [{ type: 'credit', accountId: 'acc_gone', amount: 500 }],
      expenses: [{ accountId: 'acc_gone', amount: 2000 }],
    });

    expect(balances.acc_salary).toBe(10000 + 500 - 2000);
    expect(balances.acc_savings).toBe(0);
  });

  test('transfer from deleted bank settles on default', () => {
    const balances = computeAccountBalances({
      accounts,
      accountOpenings: { acc_salary: 20000, acc_savings: 0 },
      walletTransactions: [
        {
          type: 'transfer',
          fromAccountId: 'acc_gone',
          toAccountId: 'acc_savings',
          amount: 3000,
        },
      ],
      expenses: [],
    });

    expect(balances.acc_salary).toBe(17000);
    expect(balances.acc_savings).toBe(3000);
  });

  test('set aside money stays on the account and leaves the spending total', () => {
    const list = ensureAccounts([
      { id: 'acc_salary', name: 'Salary', kind: 'salary' },
      { id: 'acc_daily', name: 'Regular', kind: 'other' },
      { id: 'acc_backup', name: 'Backup', kind: 'savings', setAside: true },
      { id: 'acc_cc', name: 'Card', kind: 'credit', creditLimit: 10000, setAside: true },
    ]);
    expect(list.find((account) => account.id === 'acc_backup').setAside).toBe(true);
    expect(list.find((account) => account.id === 'acc_cc').setAside).toBeUndefined();

    const balances = computeAccountBalances({
      accounts: list,
      accountOpenings: { acc_salary: 40000, acc_daily: 8000, acc_backup: 20000, acc_cc: 0 },
      walletTransactions: [
        {
          type: 'transfer',
          fromAccountId: 'acc_salary',
          toAccountId: 'acc_backup',
          amount: 5000,
        },
      ],
      expenses: [],
    });

    expect(balances.acc_salary).toBe(35000);
    expect(balances.acc_backup).toBe(25000);
    expect(sumCashBalances(list, balances)).toBe(35000 + 8000);
    expect(sumSetAsideBalances(list, balances)).toBe(25000);
    expect(formatAccountOptionLabel(list.find((account) => account.id === 'acc_backup'))).toBe(
      'Backup · Set aside'
    );
  });

  test('left to spend ignores money parked in a set-aside account', () => {
    const list = ensureAccounts([
      { id: 'acc_salary', name: 'Salary', kind: 'salary' },
      { id: 'acc_backup', name: 'Backup', kind: 'other', setAside: true },
    ]);
    const month = [
      { type: 'credit', accountId: 'acc_salary', amount: 97639, source: 'income' },
      { type: 'transfer', fromAccountId: 'acc_salary', toAccountId: 'acc_backup', amount: 11655 },
    ];
    const expenses = [
      { accountId: 'acc_salary', amount: 79549 },
      { accountId: 'acc_backup', amount: 500 },
    ];

    expect(parkedInSetAsideAccounts({ accounts: list, walletTransactions: month, expenses })).toBe(
      11655 - 500
    );
    expect(parkedInSetAsideAccounts({ accounts: list })).toBe(0);
  });

  test('openings match desired bank amounts', () => {
    const openings = openingsForDesiredBalances({
      accounts,
      expenses: [{ accountId: 'acc_salary', amount: 1000 }],
      walletTransactions: [],
      desiredById: { acc_salary: 40000, acc_savings: 10000 },
    });
    const balances = computeAccountBalances({
      accounts,
      accountOpenings: openings,
      expenses: [{ accountId: 'acc_salary', amount: 1000 }],
      walletTransactions: [],
    });
    expect(balances.acc_salary).toBe(40000);
    expect(balances.acc_savings).toBe(10000);
  });
});
