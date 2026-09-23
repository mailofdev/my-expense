import { adminUserStats, filterAdminUsers, sortAdminUsers, toAdminUserRow } from './adminUsers';

describe('admin user rows', () => {
  const rows = [
    toAdminUserRow({
      uid: 'a',
      displayName: 'Asha',
      email: 'asha@example.com',
      role: 'admin',
      lastLoginAt: '2026-09-01T00:00:00.000Z',
      accounts: [{ id: '1' }],
      goals: [],
      monthlyWallets: { '2026-09': 1 },
    }),
    toAdminUserRow({
      uid: 'b',
      email: 'new@example.com',
      role: 'user',
      lastLoginAt: '2026-09-20T00:00:00.000Z',
      lastSeenAt: '2026-09-22T00:00:00.000Z',
    }),
  ];

  test('maps profile fields an admin can scan', () => {
    expect(rows[0]).toMatchObject({
      name: 'Asha',
      role: 'admin',
      accounts: 1,
      monthsTracked: 1,
    });
    expect(rows[1].name).toBe('Unnamed');
    expect(rows[1].role).toBe('user');
    expect(rows[1].accounts).toBe(1);
  });

  test('counts the same accounts, groups, plans, and income months the app uses', () => {
    const row = toAdminUserRow(
      {
        uid: 'c',
        role: ' Admin ',
        accounts: [
          { id: '1', name: 'Cash', kind: 'other' },
          { id: '2', name: 'Visa', kind: 'credit' },
        ],
        peopleGroups: [],
        splitGroups: [{ id: 'g1', name: 'Home', members: [{ name: 'Asha' }] }],
        goals: [{ id: 'e', kind: 'emergency', name: 'Emergency fund' }],
        recurringExpenses: [{ id: 'r1', enabled: true }, { id: 'r2', enabled: false }],
        recurringIncome: [{ id: 'i1', enabled: true }],
        monthlyWallets: { '2026-08': 0, '2026-09': 5000 },
        monthlyIncomes: { '2026-07': 1000 },
        monthlyAllocations: { '2026-09': { savings: 500, essentials: 0 } },
        categoryBudgets: { Food: 0, Rent: 2000 },
      },
      new Date('2026-09-22T12:00:00.000Z')
    );

    expect(row).toMatchObject({
      role: 'admin',
      accounts: 2,
      creditCards: 1,
      groups: 1,
      goals: 1,
      emergencyFund: true,
      recurring: 3,
      repeatsActive: 2,
      repeatsPaused: 1,
      hasRepeats: true,
      monthsTracked: 2,
      incomeThisMonth: true,
      planMonths: 1,
      hasPlan: true,
      limits: 1,
    });
  });

  test('filters by name or email and sorts recent logins first', () => {
    expect(filterAdminUsers(rows, 'asha')).toHaveLength(1);
    expect(sortAdminUsers(rows).map((row) => row.uid)).toEqual(['b', 'a']);
  });

  test('counts people seen in the last week', () => {
    const stats = adminUserStats(rows, new Date('2026-09-22T12:00:00.000Z'));
    expect(stats).toEqual({ total: 2, admins: 1, active: 1 });
  });
});
