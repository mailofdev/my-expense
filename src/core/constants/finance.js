export const CATEGORY_CONFIG = {
  Food: {color: '#f59e0b', icon: '🍔',},
  Travel: {color: '#3b82f6',icon: '✈️',},
  Housing: {color: '#8b5cf6', icon: '🏠'},
  Shopping: {color: '#ec4899', icon: '🛍️'},
  Bills: {color: '#10b981', icon: '📄'},
  Entertainment: {color: '#06b6d4', icon: '🎬'},
  Health: {color: '#ef4444', icon: '💊'},
  Investment: {color: '#16a34a', icon: '📈'},
  Savings: {color: '#22c55e', icon: '💰'},
  Other: {color: '#6b7280', icon: '📦'},
};

export const CATEGORIES = Object.keys(CATEGORY_CONFIG);
export const PAYMENT_MODES = ['UPI', 'Cash', 'Card', 'Bank'];

/** Resolve a category name to a CSS/chart color string. */
export function getCategoryColor(category) {
  return CATEGORY_CONFIG[category]?.color ?? '#6b7280';
}

export const DEFAULT_HABITS = {
  savingsGoalPercent: 20,
  lastWeeklyReview: null,
  expensesLoggedThisWeek: 0,
};
