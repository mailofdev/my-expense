import {
  MAX_MEMBERS_PER_GROUP,
  ensurePeopleGroups,
  normalizePeopleGroup,
  buildEqualSplit,
  formatSplitSummary,
  formatSplitDetail,
  describeEqualShare,
  aggregateSplitBalances,
  getSelfMember,
  resolveSelfMemberName,
} from './groups';

describe('people groups', () => {
  test('resolveSelfMemberName prefers displayName', () => {
    expect(resolveSelfMemberName({ displayName: 'Amit', email: 'a@x.com' })).toBe('Amit');
    expect(resolveSelfMemberName({ email: 'amit@x.com' })).toBe('amit');
  });
  test('ensurePeopleGroups adds logged-in name when members empty', () => {
    const groups = ensurePeopleGroups([{ id: 'g1', name: 'Trip', members: [] }], [], {
      selfName: 'Amit',
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].members[0].name).toBe('Amit');
    expect(groups[0].members[0].isSelf).toBe(true);
  });

  test('renames legacy You self member to display name', () => {
    const groups = ensurePeopleGroups(
      [
        {
          id: 'g1',
          name: 'Trip',
          members: [
            { id: 'you', name: 'You', isSelf: true },
            { id: 'r', name: 'Rahul' },
          ],
        },
      ],
      [],
      { selfName: 'Amit' }
    );
    expect(groups[0].members.find((m) => m.isSelf).name).toBe('Amit');
    expect(groups[0].members.some((m) => m.name === 'You')).toBe(false);
  });

  test('migrates legacy splitGroups when peopleGroups empty', () => {
    const groups = ensurePeopleGroups([], [
      { id: 'old', name: 'Flatmates', members: [{ id: 'a', name: 'Sam' }] },
    ]);
    expect(groups[0].name).toBe('Flatmates');
    expect(groups[0].members.some((m) => m.isSelf)).toBe(true);
  });

  test('normalizePeopleGroup caps members', () => {
    const members = Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`,
      name: `P${i}`,
    }));
    const group = normalizePeopleGroup({ name: 'Big', members });
    expect(group.members.length).toBe(MAX_MEMBERS_PER_GROUP);
  });
});

describe('equal split', () => {
  const groups = [
    {
      id: 'g1',
      name: 'Trip',
      members: [
        { id: 'you', name: 'You', isSelf: true },
        { id: 'r', name: 'Rahul' },
        { id: 'p', name: 'Priya' },
      ],
    },
  ];

  test('splits amount equally across members', () => {
    const split = buildEqualSplit({
      amount: 6000,
      groupId: 'g1',
      paidBy: 'you',
      memberIds: ['you', 'r', 'p'],
      groups,
    });
    expect(split.mode).toBe('equal');
    expect(split.shares).toHaveLength(3);
    const sum = split.shares.reduce((s, item) => s + item.amount, 0);
    expect(sum).toBe(6000);
    expect(split.shares.every((s) => s.amount === 2000)).toBe(true);
  });

  test('handles remainder paise fairly', () => {
    const split = buildEqualSplit({
      amount: 100,
      groupId: 'g1',
      paidBy: 'you',
      memberIds: ['you', 'r', 'p'],
      groups,
    });
    const sum = split.shares.reduce((s, item) => s + item.amount, 0);
    expect(sum).toBe(100);
  });

  test('requires at least 2 members', () => {
    expect(
      buildEqualSplit({
        amount: 100,
        groupId: 'g1',
        paidBy: 'you',
        memberIds: ['you'],
        groups,
      })
    ).toBeNull();
  });

  test('formatSplitSummary is readable', () => {
    const split = buildEqualSplit({
      amount: 300,
      groupId: 'g1',
      paidBy: 'you',
      memberIds: ['you', 'r', 'p'],
      groups,
    });
    expect(formatSplitSummary(split, groups, 300)).toContain('Split 3');
    expect(formatSplitSummary(split, groups, 300)).toContain('Trip');
  });

  test('formatSplitDetail includes payer and members', () => {
    const split = buildEqualSplit({
      amount: 6000,
      groupId: 'g1',
      paidBy: 'you',
      memberIds: ['you', 'r', 'p'],
      groups,
    });
    const detail = formatSplitDetail(split, groups, 6000);
    expect(detail).toContain('Trip');
    expect(detail).toContain('Paid by You');
    expect(detail).toContain('Rahul');
    expect(detail).toContain('₹2,000 each');
  });

  test('describeEqualShare uses approx when remainder differs', () => {
    const split = buildEqualSplit({
      amount: 100,
      groupId: 'g1',
      paidBy: 'you',
      memberIds: ['you', 'r', 'p'],
      groups,
    });
    const amounts = split.shares.map((s) => s.amount);
    expect(new Set(amounts).size).toBeGreaterThan(1);
    expect(describeEqualShare(split.shares, 100, 3)).toMatch(/^≈ ₹/);
    expect(describeEqualShare(split.shares, 100, 3)).toContain('each');
  });

  test('aggregateSplitBalances nets who owes whom', () => {
    const split = buildEqualSplit({
      amount: 6000,
      groupId: 'g1',
      paidBy: 'you',
      memberIds: ['you', 'r', 'p'],
      groups,
    });
    const balances = aggregateSplitBalances([{ amount: 6000, split }], groups);
    expect(balances.some((b) => b.fromName === 'Rahul' && b.toName === 'You' && b.amount === 2000)).toBe(
      true
    );
  });

  test('aggregateSplitBalances nets opposing debts between the same pair', () => {
    const youPaid = buildEqualSplit({
      amount: 3000,
      groupId: 'g1',
      paidBy: 'you',
      memberIds: ['you', 'r'],
      groups,
    });
    const rahulPaid = buildEqualSplit({
      amount: 1000,
      groupId: 'g1',
      paidBy: 'r',
      memberIds: ['you', 'r'],
      groups,
    });
    // Rahul owes You 1500 from first; You owes Rahul 500 from second → Rahul owes You 1000
    const balances = aggregateSplitBalances(
      [
        { amount: 3000, split: youPaid },
        { amount: 1000, split: rahulPaid },
      ],
      groups
    );
    expect(balances).toHaveLength(1);
    expect(balances[0]).toMatchObject({
      fromName: 'Rahul',
      toName: 'You',
      amount: 1000,
    });
  });

  test('getSelfMember finds You', () => {
    expect(getSelfMember(groups[0]).id).toBe('you');
  });
});
