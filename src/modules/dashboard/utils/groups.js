/** Max people groups and members per group — keep the UI light. */
export const MAX_PEOPLE_GROUPS = 20;
export const MAX_MEMBERS_PER_GROUP = 12;

export function createGroupId() {
  return `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createMemberId() {
  return `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Display name for the logged-in user in split groups (never leave as a blank “You”). */
export function resolveSelfMemberName(source) {
  if (typeof source === 'string') {
    const name = source.trim();
    return name || 'You';
  }
  const fromProfile = String(source?.displayName || '').trim();
  if (fromProfile) return fromProfile;
  const fromEmail = String(source?.email || '')
    .split('@')[0]
    .trim();
  return fromEmail || 'You';
}

/** Normalize one member. */
export function normalizeMember(raw = {}) {
  const name = String(raw?.name || '').trim();
  if (!name) return null;
  return {
    id: String(raw.id || createMemberId()),
    name,
    isSelf: Boolean(raw.isSelf),
  };
}

/** Normalize one people group. `selfName` replaces the placeholder “You” with the logged-in user. */
export function normalizePeopleGroup(raw = {}, { selfName } = {}) {
  const name = String(raw?.name || '').trim();
  if (!name) return null;

  const selfLabel = resolveSelfMemberName(selfName);
  const members = [];
  const seen = new Set();
  for (const item of raw.members || []) {
    const member = normalizeMember(item);
    if (!member) continue;
    const key = member.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    members.push(member);
    if (members.length >= MAX_MEMBERS_PER_GROUP) break;
  }

  if (!members.length) {
    members.push({ id: createMemberId(), name: selfLabel, isSelf: true });
  } else if (!members.some((m) => m.isSelf)) {
    members[0] = { ...members[0], isSelf: true };
  }

  // Keep the self slot labeled as the logged-in user (migrate legacy “You”).
  const selfIdx = members.findIndex((m) => m.isSelf);
  if (selfIdx >= 0) {
    const prevName = members[selfIdx].name;
    if (prevName !== selfLabel) {
      const collisionKey = selfLabel.toLowerCase();
      const filtered = members.filter(
        (m, i) => i === selfIdx || m.name.toLowerCase() !== collisionKey
      );
      const idx = filtered.findIndex((m) => m.isSelf);
      filtered[idx] = { ...filtered[idx], name: selfLabel };
      return {
        id: String(raw.id || createGroupId()),
        name,
        members: filtered.slice(0, MAX_MEMBERS_PER_GROUP),
      };
    }
  }

  return {
    id: String(raw.id || createGroupId()),
    name,
    members,
  };
}

/**
 * Load people groups from profile.
 * Migrates legacy `splitGroups` if `peopleGroups` is empty.
 */
export function ensurePeopleGroups(peopleGroups, legacySplitGroups = [], options = {}) {
  const source =
    Array.isArray(peopleGroups) && peopleGroups.length > 0
      ? peopleGroups
      : Array.isArray(legacySplitGroups)
        ? legacySplitGroups
        : [];

  const groups = [];
  const seenNames = new Set();
  for (const raw of source) {
    const group = normalizePeopleGroup(raw, options);
    if (!group) continue;
    const key = group.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    groups.push(group);
    if (groups.length >= MAX_PEOPLE_GROUPS) break;
  }
  return groups;
}

export function getGroupById(groups, groupId) {
  return (groups || []).find((g) => g.id === groupId) || null;
}

export function getSelfMember(group) {
  if (!group?.members?.length) return null;
  return group.members.find((m) => m.isSelf) || group.members[0] || null;
}

/**
 * Build an equal split payload. Returns null if invalid / not enough people.
 */
export function buildEqualSplit({
  amount,
  groupId,
  paidBy,
  memberIds,
  groups = [],
}) {
  const group = getGroupById(groups, groupId);
  if (!group) return null;

  const total = Number(amount) || 0;
  if (total < 1) return null;

  const allowed = new Set(group.members.map((m) => m.id));
  const selected = [...new Set((memberIds || []).filter((id) => allowed.has(id)))];
  if (selected.length < 2) return null;

  const payer = allowed.has(paidBy) ? paidBy : getSelfMember(group)?.id;
  if (!payer || !selected.includes(payer)) {
    // Payer must be in the split; if not, include them.
    if (payer && !selected.includes(payer)) selected.unshift(payer);
  }
  if (!payer || selected.length < 2) return null;

  const shareCount = selected.length;
  const base = Math.floor((total * 100) / shareCount) / 100;
  let remainder = Math.round((total - base * shareCount) * 100) / 100;

  const shares = selected.map((memberId, index) => {
    let shareAmount = base;
    if (remainder > 0) {
      const extra = Math.min(0.01, remainder);
      shareAmount = Math.round((shareAmount + extra) * 100) / 100;
      remainder = Math.round((remainder - extra) * 100) / 100;
    } else if (remainder < 0 && index === shareCount - 1) {
      shareAmount = Math.round((shareAmount + remainder) * 100) / 100;
      remainder = 0;
    }
    return { memberId, amount: shareAmount };
  });

  // Fix floating remainder on last share
  const sum = shares.reduce((s, item) => s + item.amount, 0);
  const drift = Math.round((total - sum) * 100) / 100;
  if (drift !== 0 && shares.length) {
    shares[shares.length - 1].amount =
      Math.round((shares[shares.length - 1].amount + drift) * 100) / 100;
  }

  return {
    groupId: group.id,
    paidBy: payer,
    memberIds: selected,
    mode: 'equal',
    shares,
  };
}

/** Normalize stored split; drop if incomplete. */
export function normalizeExpenseSplit(split, groups = []) {
  if (!split || typeof split !== 'object') return null;
  const group = getGroupById(groups, split.groupId);
  if (!group) return null;

  const memberIds = Array.isArray(split.memberIds)
    ? split.memberIds.filter((id) => group.members.some((m) => m.id === id))
    : [];
  if (memberIds.length < 2) return null;

  const paidBy = group.members.some((m) => m.id === split.paidBy)
    ? split.paidBy
    : getSelfMember(group)?.id;

  if (split.mode === 'equal' || !Array.isArray(split.shares) || !split.shares.length) {
    // Rebuild equal shares when amount known by caller; keep stored shares if present.
    if (Array.isArray(split.shares) && split.shares.length) {
      return {
        groupId: group.id,
        paidBy,
        memberIds,
        mode: 'equal',
        shares: split.shares
          .filter((s) => memberIds.includes(s.memberId))
          .map((s) => ({
            memberId: s.memberId,
            amount: Math.round((Number(s.amount) || 0) * 100) / 100,
          })),
      };
    }
  }

  return {
    groupId: group.id,
    paidBy,
    memberIds,
    mode: 'equal',
    shares: Array.isArray(split.shares)
      ? split.shares.map((s) => ({
          memberId: s.memberId,
          amount: Math.round((Number(s.amount) || 0) * 100) / 100,
        }))
      : [],
  };
}

/** Format equal-share text; use ≈ when remainder paise make shares differ. */
export function describeEqualShare(shares = [], totalAmount, count) {
  const list = Array.isArray(shares) ? shares : [];
  const n = Number(count) || list.length;
  if (!n) return '';

  const amounts = list.map((item) => Math.round((Number(item.amount) || 0) * 100) / 100);
  const fallback =
    Math.round(((Number(totalAmount) || 0) / n) * 100) / 100;
  const first = amounts.length ? amounts[0] : fallback;
  const money = `₹${Number(first).toLocaleString('en-IN')}`;
  const allEqual = amounts.length > 1 && amounts.every((amount) => amount === first);
  if (amounts.length > 1 && !allEqual) return `≈ ${money} each`;
  return `${money} each`;
}

/** Short label for expense lists: "Split 4 · ₹1,500 each". */
export function formatSplitSummary(split, groups = [], totalAmount) {
  const normalized = normalizeExpenseSplit(split, groups);
  if (!normalized) return '';
  const group = getGroupById(groups, normalized.groupId);
  const count = normalized.memberIds.length;
  const groupName = group?.name ? ` · ${group.name}` : '';
  return `Split ${count}${groupName} · ${describeEqualShare(
    normalized.shares,
    totalAmount,
    count
  )}`;
}

/**
 * Detailed split text for CSV / HTML export.
 * Example: "Satara trip · Paid by Amit · Amit, Rahul, Priya · ₹2,000 each"
 */
export function formatSplitDetail(split, groups = [], totalAmount) {
  const normalized = normalizeExpenseSplit(split, groups);
  if (!normalized) return '';
  const group = getGroupById(groups, normalized.groupId);
  if (!group) return formatSplitSummary(split, groups, totalAmount);

  const nameOf = (id) => group.members.find((m) => m.id === id)?.name || 'Someone';
  const payer = nameOf(normalized.paidBy);
  const shared = normalized.memberIds.map(nameOf).join(', ');

  return `${group.name} · Paid by ${payer} · ${shared} · ${describeEqualShare(
    normalized.shares,
    totalAmount,
    normalized.memberIds.length
  )}`;
}

/**
 * Aggregate net settlements across many split expenses.
 * Pairwise nets cancel (A owes B and B owes A → one direction).
 */
export function aggregateSplitBalances(expenses = [], groups = []) {
  const pairNets = {}; // key lo|hi → signed balance (positive => lo owes hi)
  const names = {};

  expenses.forEach((expense) => {
    const normalized = normalizeExpenseSplit(expense.split, groups);
    if (!normalized) return;
    const balances = getSplitBalances(expense.split, groups);
    const payerId = normalized.paidBy;
    if (!payerId) return;

    balances.forEach((item) => {
      const fromId = item.memberId;
      const toId = payerId;
      const amount = Math.round((Number(item.owes) || 0) * 100) / 100;
      if (!fromId || !toId || fromId === toId || amount <= 0) return;

      names[fromId] = item.name;
      names[toId] = item.paidByName;

      const [lo, hi] = fromId < toId ? [fromId, toId] : [toId, fromId];
      const key = `${lo}|${hi}`;
      if (!pairNets[key]) {
        pairNets[key] = { lo, hi, balance: 0 };
      }
      // Positive balance means lo owes hi.
      if (fromId === lo) pairNets[key].balance += amount;
      else pairNets[key].balance -= amount;
    });
  });

  return Object.values(pairNets)
    .map((pair) => {
      const balance = Math.round(pair.balance * 100) / 100;
      if (balance === 0) return null;
      if (balance > 0) {
        return {
          fromId: pair.lo,
          fromName: names[pair.lo] || 'Someone',
          toId: pair.hi,
          toName: names[pair.hi] || 'Someone',
          amount: balance,
        };
      }
      return {
        fromId: pair.hi,
        fromName: names[pair.hi] || 'Someone',
        toId: pair.lo,
        toName: names[pair.lo] || 'Someone',
        amount: Math.abs(balance),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.amount - a.amount || a.fromName.localeCompare(b.fromName));
}

/** Who owes the payer (for equal splits where you paid). */
export function getSplitBalances(split, groups = []) {
  const normalized = normalizeExpenseSplit(split, groups);
  if (!normalized) return [];
  const group = getGroupById(groups, normalized.groupId);
  if (!group) return [];

  const nameOf = (id) => group.members.find((m) => m.id === id)?.name || 'Someone';
  const payerShare =
    normalized.shares.find((s) => s.memberId === normalized.paidBy)?.amount || 0;

  return normalized.shares
    .filter((s) => s.memberId !== normalized.paidBy)
    .map((s) => ({
      memberId: s.memberId,
      name: nameOf(s.memberId),
      amount: s.amount,
      paidById: normalized.paidBy,
      paidByName: nameOf(normalized.paidBy),
      // Positive = this person owes the payer
      owes: s.amount,
      payerShare,
    }));
}
