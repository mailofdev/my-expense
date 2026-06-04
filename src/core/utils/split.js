/** Round to 2 decimal places (paise). */
export const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** Split total across participants; last person gets remainder so shares sum exactly. */
export function distributeTotal(total, parts) {
  const safeTotal = toMoney(total);
  if (!parts.length || safeTotal <= 0) return parts.map(() => 0);
  const base = toMoney(safeTotal / parts.length);
  const amounts = parts.map((_, index) =>
    index === parts.length - 1
      ? toMoney(safeTotal - base * (parts.length - 1))
      : base
  );
  return amounts;
}

/**
 * @param {number} amount - expense total
 * @param {string[]} participants
 * @param {'equal'|'percentage'|'exact'|'unequal'} splitType
 * @param {{ shares?: Record<string, number> }} splitConfig
 */
export function computeSplitShares(amount, participants, splitType, splitConfig = {}) {
  if (!participants.length || amount <= 0) return {};

  const safeAmount = toMoney(amount);
  const source = splitConfig.shares || {};
  const shares = {};

  if (splitType === 'equal') {
    const parts = distributeTotal(safeAmount, participants);
    participants.forEach((member, index) => {
      shares[member] = parts[index];
    });
    return shares;
  }

  const values = participants.map((member) => Number(source[member]) || 0);

  if (splitType === 'exact') {
    const rawSum = values.reduce((sum, v) => sum + v, 0);
    if (rawSum <= 0) {
      const parts = distributeTotal(safeAmount, participants);
      participants.forEach((member, index) => {
        shares[member] = parts[index];
      });
      return shares;
    }
    // Scale exact amounts to match expense total if user entered proportions
    if (Math.abs(rawSum - safeAmount) > 0.02) {
      let assigned = 0;
      participants.forEach((member, index) => {
        if (index === participants.length - 1) {
          shares[member] = toMoney(safeAmount - assigned);
        } else {
          const part = toMoney((values[index] / rawSum) * safeAmount);
          shares[member] = part;
          assigned += part;
        }
      });
      return shares;
    }
    participants.forEach((member, index) => {
      shares[member] = toMoney(values[index]);
    });
    return shares;
  }

  if (splitType === 'percentage') {
    const totalPct = values.reduce((sum, v) => sum + v, 0);
    const weights = totalPct > 0 ? values : participants.map(() => 1);
    const weightSum = weights.reduce((sum, v) => sum + v, 0) || 1;
    let assigned = 0;
    participants.forEach((member, index) => {
      if (index === participants.length - 1) {
        shares[member] = toMoney(safeAmount - assigned);
      } else {
        const part = toMoney((safeAmount * weights[index]) / weightSum);
        shares[member] = part;
        assigned += part;
      }
    });
    return shares;
  }

  if (splitType === 'unequal') {
    const weightSum = values.reduce((sum, v) => sum + v, 0);
    const weights = weightSum > 0 ? values : participants.map(() => 1);
    const totalWeight = weights.reduce((sum, v) => sum + v, 0) || 1;
    let assigned = 0;
    participants.forEach((member, index) => {
      if (index === participants.length - 1) {
        shares[member] = toMoney(safeAmount - assigned);
      } else {
        const part = toMoney((safeAmount * weights[index]) / totalWeight);
        shares[member] = part;
        assigned += part;
      }
    });
    return shares;
  }

  const parts = distributeTotal(safeAmount, participants);
  participants.forEach((member, index) => {
    shares[member] = parts[index];
  });
  return shares;
}

export function sumShares(shares) {
  return toMoney(Object.values(shares).reduce((sum, v) => sum + (Number(v) || 0), 0));
}

export function sharesMatchTotal(shares, amount) {
  return Math.abs(sumShares(shares) - toMoney(amount)) < 0.02;
}

/** Net balance: positive = others owe this member, negative = member owes others. */
export function calculateBalances(members, expenses, payments = []) {
  const balances = {};
  members.forEach((member) => {
    balances[member] = 0;
  });

  expenses.forEach((expense) => {
    const paidBy = expense.paidBy;
    const total = toMoney(expense.amount);
    if (!paidBy || total <= 0) return;

    balances[paidBy] = toMoney((balances[paidBy] || 0) + total);

    const shareEntries = Object.entries(expense.shares || {});
    shareEntries.forEach(([member, share]) => {
      balances[member] = toMoney((balances[member] || 0) - toMoney(share));
    });

    // If shares don't cover full amount, assign remainder to payer's share
    const shared = sumShares(expense.shares || {});
    if (shared < total - 0.02 && shareEntries.length) {
      balances[paidBy] = toMoney(balances[paidBy] - (total - shared));
    }
  });

  payments.forEach((payment) => {
    const amt = toMoney(payment.amount);
    if (amt <= 0) return;
    balances[payment.from] = toMoney((balances[payment.from] || 0) + amt);
    balances[payment.to] = toMoney((balances[payment.to] || 0) - amt);
  });

  return balances;
}

export function simplifyDebts(balances) {
  const creditors = [];
  const debtors = [];

  Object.entries(balances).forEach(([member, value]) => {
    const rounded = toMoney(value);
    if (rounded > 0.01) creditors.push({ member, amount: rounded });
    if (rounded < -0.01) debtors.push({ member, amount: Math.abs(rounded) });
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0;
  let j = 0;
  let guard = 0;

  while (i < debtors.length && j < creditors.length && guard < 500) {
    guard += 1;
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = toMoney(Math.min(debtor.amount, creditor.amount));

    if (amount > 0.01) {
      settlements.push({
        id: settlementKey(debtor.member, creditor.member),
        from: debtor.member,
        to: creditor.member,
        amount,
        status: 'pending',
      });
      debtor.amount = toMoney(debtor.amount - amount);
      creditor.amount = toMoney(creditor.amount - amount);
    }

    if (debtor.amount <= 0.01) i += 1;
    if (creditor.amount <= 0.01) j += 1;
    if (amount <= 0.01 && debtor.amount > 0.01 && creditor.amount > 0.01) {
      i += 1;
      j += 1;
    }
  }

  return settlements;
}

export function settlementKey(from, to) {
  return `settle_${String(from).replace(/\s+/g, '_')}_${String(to).replace(/\s+/g, '_')}`;
}

/** Keep paid/disputed status when debts are recalculated after a new expense. */
export function mergeSettlements(previous = [], next = []) {
  const prevByKey = new Map(previous.map((s) => [settlementKey(s.from, s.to), s]));

  return next.map((settlement) => {
    const key = settlementKey(settlement.from, settlement.to);
    const old = prevByKey.get(key);
    if (!old) return settlement;
    if (old.status === 'paid' || old.status === 'disputed') {
      return {
        ...settlement,
        id: old.id || key,
        status: old.status,
        paidAt: old.paidAt,
        paidAmount: old.paidAmount,
        note: old.note,
      };
    }
    return { ...settlement, id: old.id || key, note: old.note };
  });
}

export function calculateGroupDebts(group) {
  const members = group.members || [];
  const expenses = group.expenses || [];
  const payments = group.payments || [];
  const balances = calculateBalances(members, expenses, payments);
  const simplifiedDebts = simplifyDebts(balances);

  return {
    balances,
    simplifiedDebts,
    updatedAt: new Date().toISOString(),
  };
}
