export const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

export const formatINRCompact = (amount) => {
  const value = amount ?? 0;
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return formatINR(value);
};

/** Amount text color: income green, expense red, transfer sky. */
export const ledgerAmountClass = (type) => {
  if (type === 'credit' || type === 'income') return 'text-success';
  if (type === 'transfer') return 'text-info';
  return 'text-danger';
};

/** Softer label color matching the amount type. */
export const ledgerTypeLabelClass = (type) => {
  if (type === 'credit' || type === 'income') return 'text-success/80';
  if (type === 'transfer') return 'text-info/80';
  return 'text-danger/80';
};
