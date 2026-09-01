import {
  computeAccountBalances,
  ensureAccounts,
  getDefaultAccountId,
  openingsForDesiredBalances,
} from './accounts';

describe('accounts helpers', () => {
  const accounts = ensureAccounts();

  test('defaults to Salary and Savings', () => {
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
