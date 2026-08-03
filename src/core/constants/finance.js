export const MAX_CATEGORIES = 15;
export const MAX_SUBCATEGORIES_PER_MAIN = 20;

/** Fixed palette — color #N is used for the Nth category (1-based). */
export const CATEGORY_PALETTE = [
  '#f59e0b', // 1 Food & Groceries
  '#3b82f6', // 2 Household & Living
  '#8b5cf6', // 3 Transport & Fuel
  '#ec4899', // 4 Shopping & Lifestyle
  '#10b981', // 5 Bills & EMIs
  '#06b6d4', // 6 Family & Transfers
  '#ef4444', // 7 Personal & Gifts
  '#6b7280', // 8 Miscellaneous
  '#16a34a', // 9
  '#22c55e', // 10
  '#f97316', // 11
  '#6366f1', // 12
  '#14b8a6', // 13
  '#a855f7', // 14
  '#eab308', // 15
];

export const CATEGORY_LIMIT_THRESHOLDS = [50, 75, 90, 100];

/**
 * Fixed main categories. Users can rename/hide but not delete or add mains.
 * Keywords drive smart category suggestions from expense titles.
 */
export const SYSTEM_MAIN_CATEGORIES = [
  {
    id: 'food_groceries',
    name: 'Food & Groceries',
    color: CATEGORY_PALETTE[0],
    icon: '🛒',
    keywords: [
      'tea', 'coffee', 'chai', 'lunch', 'dinner', 'breakfast', 'brunch',
      'grocery', 'groceries', 'food', 'restaurant', 'cafe', 'milk', 'bread',
      'snack', 'snacks', 'swiggy', 'zomato', 'biryani', 'pizza', 'burger',
      'fruit', 'vegetables', 'veggie', 'meal', 'tiffin',
    ],
  },
  {
    id: 'household_living',
    name: 'Household & Living',
    color: CATEGORY_PALETTE[1],
    icon: '🏠',
    keywords: [
      'rent', 'maid', 'electricity', 'water bill', 'cooking gas', 'lpg',
      'maintenance', 'furniture', 'cleaning', 'home', 'household', 'society',
      'plumber', 'electrician', 'repair',
    ],
  },
  {
    id: 'transport_fuel',
    name: 'Transport & Fuel',
    color: CATEGORY_PALETTE[2],
    icon: '⛽',
    keywords: [
      'petrol', 'diesel', 'fuel', 'uber', 'ola', 'rapido', 'metro', 'bus',
      'train', 'auto', 'parking', 'cab', 'taxi', 'travel', 'flight', 'toll',
      'irctc', 'fastag',
    ],
  },
  {
    id: 'shopping_lifestyle',
    name: 'Shopping & Lifestyle',
    color: CATEGORY_PALETTE[3],
    icon: '🛍️',
    keywords: [
      'clothes', 'shopping', 'amazon', 'flipkart', 'myntra', 'movie',
      'entertainment', 'subscription', 'netflix', 'spotify', 'shoes', 'mall',
      'lifestyle', 'apparel', 'gadgets',
    ],
  },
  {
    id: 'bills_emis',
    name: 'Bills & EMIs',
    color: CATEGORY_PALETTE[4],
    icon: '📄',
    keywords: [
      'emi', 'bill', 'recharge', 'mobile', 'internet', 'wifi', 'broadband',
      'insurance', 'loan', 'credit card', 'utility', 'dth', 'premium',
    ],
  },
  {
    id: 'family_transfers',
    name: 'Family & Transfers',
    color: CATEGORY_PALETTE[5],
    icon: '🎁',
    keywords: [
      'family', 'mom', 'dad', 'mummy', 'papa', 'parents', 'transfer',
      'sister', 'brother', 'sent to', 'upi to',
    ],
  },
  {
    id: 'personal_gifts',
    name: 'Personal & Gifts',
    color: CATEGORY_PALETTE[6],
    icon: '💝',
    keywords: [
      'gift', 'medicine', 'doctor', 'hospital', 'pharmacy', 'salon',
      'personal', 'health', 'gym', 'haircut', 'cosmetics', 'birthday',
    ],
  },
  {
    id: 'miscellaneous',
    name: 'Miscellaneous',
    color: CATEGORY_PALETTE[7],
    icon: '📦',
    keywords: ['misc', 'other', 'general', 'miscellaneous'],
  },
];

export const CATEGORY_CONFIG = Object.fromEntries(
  SYSTEM_MAIN_CATEGORIES.map(({ name, color, icon }) => [name, { color, icon }])
);

export const CATEGORIES = SYSTEM_MAIN_CATEGORIES.map((item) => item.name);

export const DEFAULT_CATEGORY_COLORS = Object.fromEntries(
  CATEGORIES.map((name, index) => [name, CATEGORY_PALETTE[index]])
);

export const PAYMENT_MODES = ['UPI', 'Cash', 'Card', 'Bank'];

/** Color for category position (0-based index). */
export function getCategoryColorByIndex(index) {
  if (index < 0 || index >= CATEGORY_PALETTE.length) return CATEGORY_PALETTE[7];
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
  return DEFAULT_CATEGORY_COLORS[category] || CATEGORY_CONFIG[category]?.color || CATEGORY_PALETTE[7];
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
