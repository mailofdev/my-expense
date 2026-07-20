export const CATEGORY_CONFIG = {
  Food: { color: '#f59e0b', icon: '🍔' },
  Travel: { color: '#3b82f6', icon: '✈️' },
  Housing: { color: '#8b5cf6', icon: '🏠' },
  Shopping: { color: '#ec4899', icon: '🛍️' },
  Bills: { color: '#10b981', icon: '📄' },
  Entertainment: { color: '#06b6d4', icon: '🎬' },
  Health: { color: '#ef4444', icon: '💊' },
  Investment: { color: '#16a34a', icon: '📈' },
  Savings: { color: '#22c55e', icon: '💰' },
  Other: { color: '#6b7280', icon: '📦' },
};

export const CATEGORIES = Object.keys(CATEGORY_CONFIG);

export const DEFAULT_CATEGORY_COLORS = Object.fromEntries(
  Object.entries(CATEGORY_CONFIG).map(([name, config]) => [name, config.color])
);

export const PAYMENT_MODES = ['UPI', 'Cash', 'Card', 'Bank'];

const MIN_COLOR_DISTANCE = 75;

const hexToRgb = (hex) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return null;
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const colorDistance = (a, b) => {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return 0;
  const dr = rgbA.r - rgbB.r;
  const dg = rgbA.g - rgbB.g;
  const db = rgbA.b - rgbB.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const hslToHex = (h, s, l) => {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (channel) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const randomCandidateColor = () => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 58 + Math.floor(Math.random() * 28);
  const lightness = 42 + Math.floor(Math.random() * 16);
  return hslToHex(hue, saturation, lightness);
};

/** Pick a random color that is visually distinct from existing category colors. */
export function pickDistinctCategoryColor(existingColors = []) {
  const used = (existingColors || []).filter(Boolean);
  let best = randomCandidateColor();
  let bestScore = -1;

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const candidate = randomCandidateColor();
    const nearest = used.length
      ? Math.min(...used.map((color) => colorDistance(candidate, color)))
      : Infinity;

    if (nearest >= MIN_COLOR_DISTANCE) {
      return candidate;
    }
    if (nearest > bestScore) {
      bestScore = nearest;
      best = candidate;
    }
  }

  return best;
}

export function buildCategoryColors(categories = CATEGORIES, savedColors = {}) {
  const colors = { ...DEFAULT_CATEGORY_COLORS };

  Object.entries(savedColors || {}).forEach(([name, value]) => {
    if (typeof value === 'string') {
      colors[name] = value;
    } else if (value?.color) {
      colors[name] = value.color;
    }
  });

  (categories || []).forEach((name) => {
    if (!colors[name]) {
      colors[name] = pickDistinctCategoryColor(Object.values(colors));
    }
  });

  return colors;
}

/** Resolve a category name to a CSS/chart color string. */
export function getCategoryColor(category, categoryColors) {
  if (categoryColors?.[category]) return categoryColors[category];
  return DEFAULT_CATEGORY_COLORS[category] || CATEGORY_CONFIG[category]?.color || '#6b7280';
}

export const DEFAULT_HABITS = {
  savingsGoalPercent: 20,
  lastWeeklyReview: null,
  expensesLoggedThisWeek: 0,
};
