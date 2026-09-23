import dayjs from 'dayjs';
import { getMonthKey } from '../../../core/utils/date';
import { ensureAccounts, isCreditAccount } from '../../dashboard/utils/accounts';
import { ensurePeopleGroups } from '../../dashboard/utils/groups';

const PLAN_KEYS = ['essentials', 'bills', 'savings', 'goals', 'investment', 'flexible'];

function positiveMapKeys(map) {
  return Object.entries(map || {})
    .filter(([, value]) => Number(value) > 0)
    .map(([key]) => key);
}

function planMonths(allocations) {
  return Object.entries(allocations || {}).filter(([, plan]) => {
    if (!plan || typeof plan !== 'object') return false;
    return PLAN_KEYS.some((key) => Number(plan[key]) > 0);
  }).length;
}

function repeatCounts(profile) {
  const items = [
    ...(Array.isArray(profile?.recurringExpenses) ? profile.recurringExpenses : []),
    ...(Array.isArray(profile?.recurringIncome) ? profile.recurringIncome : []),
  ];
  const paused = items.filter((item) => item?.enabled === false).length;
  return {
    recurring: items.length,
    repeatsActive: items.length - paused,
    repeatsPaused: paused,
  };
}

export function toAdminUserRow(profile, now = new Date()) {
  const accounts = ensureAccounts(profile?.accounts);
  const goals = Array.isArray(profile?.goals) ? profile.goals : [];
  const repeats = repeatCounts(profile);
  const date = dayjs(now);
  const monthKey = getMonthKey(date.month() + 1, date.year());
  const incomeMonths = new Set([
    ...positiveMapKeys(profile?.monthlyWallets),
    ...positiveMapKeys(profile?.monthlyIncomes),
  ]);
  const limits = Object.values(profile?.categoryBudgets || {}).filter((value) => Number(value) > 0).length;
  const planned = planMonths(profile?.monthlyAllocations);

  return {
    uid: profile?.uid || '',
    name: String(profile?.displayName || '').trim() || 'Unnamed',
    email: profile?.email || '',
    role: String(profile?.role || '').trim().toLowerCase() === 'admin' ? 'admin' : 'user',
    lastLoginAt: profile?.lastLoginAt || null,
    lastSeenAt: profile?.lastSeenAt || null,
    createdAt: profile?.createdAt || null,
    updatedAt: profile?.updatedAt || null,
    loginCount: Number(profile?.loginCount) || 0,
    accounts: accounts.length,
    creditCards: accounts.filter(isCreditAccount).length,
    groups: ensurePeopleGroups(profile?.peopleGroups, profile?.splitGroups, {
      selfName: profile?.displayName || profile?.email,
    }).length,
    goals: goals.length,
    emergencyFund: goals.some((goal) => goal?.kind === 'emergency'),
    ...repeats,
    hasRepeats: repeats.recurring > 0,
    monthsTracked: incomeMonths.size,
    incomeThisMonth:
      Number(profile?.monthlyWallets?.[monthKey]) > 0 || Number(profile?.monthlyIncomes?.[monthKey]) > 0,
    planMonths: planned,
    hasPlan: planned > 0,
    limits,
  };
}

export function filterAdminUsers(rows, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    (row) => row.name.toLowerCase().includes(needle) || row.email.toLowerCase().includes(needle)
  );
}

export function sortAdminUsers(rows) {
  return rows.slice().sort((a, b) => {
    const byLogin = String(b.lastLoginAt || '').localeCompare(String(a.lastLoginAt || ''));
    if (byLogin !== 0) return byLogin;
    return a.name.localeCompare(b.name);
  });
}

export function adminUserStats(rows, now = new Date()) {
  const weekAgo = dayjs(now).subtract(7, 'day');
  const active = rows.filter((row) => {
    const stamp = row.lastSeenAt || row.lastLoginAt;
    return stamp && dayjs(stamp).isAfter(weekAgo);
  }).length;
  return {
    total: rows.length,
    admins: rows.filter((row) => row.role === 'admin').length,
    active,
  };
}
