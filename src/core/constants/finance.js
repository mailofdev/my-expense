export const MAX_CATEGORIES = 15;

/** Fixed palette — color #N is used for the Nth category (1-based). */
export const CATEGORY_PALETTE = [
  '#f59e0b', // 1
  '#3b82f6', // 2
  '#8b5cf6', // 3
  '#ec4899', // 4
  '#10b981', // 5
  '#06b6d4', // 6
  '#ef4444', // 7
  '#16a34a', // 8
  '#22c55e', // 9
  '#6b7280', // 10
  '#f97316', // 11
  '#6366f1', // 12
  '#14b8a6', // 13
  '#a855f7', // 14
  '#eab308', // 15
];

export const CATEGORY_LIMIT_THRESHOLDS = [50, 75, 90, 100];

export const CATEGORY_CONFIG = {
  Food: { color: CATEGORY_PALETTE[0], icon: '🍔' },
  Travel: { color: CATEGORY_PALETTE[1], icon: '✈️' },
  Housing: { color: CATEGORY_PALETTE[2], icon: '🏠' },
  Shopping: { color: CATEGORY_PALETTE[3], icon: '🛍️' },
  Bills: { color: CATEGORY_PALETTE[4], icon: '📄' },
  Entertainment: { color: CATEGORY_PALETTE[5], icon: '🎬' },
  Health: { color: CATEGORY_PALETTE[6], icon: '💊' },
  Investment: { color: CATEGORY_PALETTE[7], icon: '📈' },
  Savings: { color: CATEGORY_PALETTE[8], icon: '💰' },
  Other: { color: CATEGORY_PALETTE[9], icon: '📦' },
};

export const CATEGORIES = Object.keys(CATEGORY_CONFIG);

export const DEFAULT_CATEGORY_COLORS = Object.fromEntries(
  CATEGORIES.map((name, index) => [name, CATEGORY_PALETTE[index]])
);

export const PAYMENT_MODES = ['UPI', 'Cash', 'Card', 'Bank'];

/** Color for category position (0-based index). */
export function getCategoryColorByIndex(index) {
  if (index < 0 || index >= CATEGORY_PALETTE.length) return CATEGORY_PALETTE[9];
  return CATEGORY_PALETTE[index];
}

/** Assign palette colors by category order (1st → color 1, …). */
export function buildCategoryColors(categories = CATEGORIES) {
  const colors = {};
  (categories || []).slice(0, MAX_CATEGORIES).forEach((name, index) => {
    colors[name] = getCategoryColorByIndex(index);
  });
  return colors;
}

/** Resolve a category name to a CSS/chart color string. */
export function getCategoryColor(category, categoryColors, categories) {
  if (Array.isArray(categories) && categories.length) {
    const index = categories.indexOf(category);
    if (index >= 0) return getCategoryColorByIndex(index);
  }
  if (categoryColors?.[category]) return categoryColors[category];
  return DEFAULT_CATEGORY_COLORS[category] || CATEGORY_CONFIG[category]?.color || CATEGORY_PALETTE[9];
}

/**
 * Highest crossed warning threshold for spent vs limit.
 * @returns {null | 50 | 75 | 90 | 100}
 */
export function getCategoryLimitLevel(spent, limit) {
  const cap = Number(limit) || 0;
  if (cap <= 0) return null;
  const pct = ((Number(spent) || 0) / cap) * 100;
  if (pct >= 100) return 100;
  if (pct >= 90) return 90;
  if (pct >= 75) return 75;
  if (pct >= 50) return 50;
  return null;
}

export function getCategoryLimitPercent(spent, limit) {
  const cap = Number(limit) || 0;
  if (cap <= 0) return 0;
  return Math.round(((Number(spent) || 0) / cap) * 100);
}

/** Short warning copy for a crossed threshold. */
export function getCategoryLimitWarningText(category, level, spent, limit) {
  if (!level) return '';
  const amount = Math.round(Number(spent) || 0).toLocaleString('en-IN');
  const cap = Math.round(Number(limit) || 0).toLocaleString('en-IN');
  if (level >= 100) {
    return `${category} limit reached (₹${amount} / ₹${cap}).`;
  }
  return `${category} is at ${level}% of its limit (₹${amount} / ₹${cap}).`;
}

export const DEFAULT_HABITS = {
  savingsGoalPercent: 20,
  lastWeeklyReview: null,
  expensesLoggedThisWeek: 0,
};
