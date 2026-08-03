import {
  MAX_CATEGORIES,
  CATEGORY_PALETTE,
  buildCategoryColors,
  getCategoryColor,
  getCategoryColorByIndex,
  getCategoryLimitLevel,
  getCategoryLimitPercent,
  getCategoryLimitWarningText,
} from './finance';

describe('category palette', () => {
  test('has exactly 15 colors', () => {
    expect(CATEGORY_PALETTE).toHaveLength(MAX_CATEGORIES);
  });

  test('assigns colors by category order', () => {
    const colors = buildCategoryColors(['Food & Groceries', 'Transport & Fuel', 'Pets']);
    expect(colors['Food & Groceries']).toBe(CATEGORY_PALETTE[0]);
    expect(colors['Transport & Fuel']).toBe(CATEGORY_PALETTE[1]);
    expect(colors.Pets).toBe(CATEGORY_PALETTE[2]);
  });

  test('caps color map at 15 categories', () => {
    const many = Array.from({ length: 20 }, (_, i) => `Cat${i + 1}`);
    const colors = buildCategoryColors(many);
    expect(Object.keys(colors)).toHaveLength(15);
    expect(colors.Cat15).toBe(CATEGORY_PALETTE[14]);
    expect(colors.Cat16).toBeUndefined();
  });

  test('resolves color from categories list index', () => {
    const categories = ['A', 'B', 'C'];
    expect(getCategoryColor('B', {}, categories)).toBe(getCategoryColorByIndex(1));
  });
});

describe('category limit thresholds', () => {
  test('returns null under 50%', () => {
    expect(getCategoryLimitLevel(499, 1000)).toBeNull();
  });

  test('returns 50, 75, 90, 100 at thresholds', () => {
    expect(getCategoryLimitLevel(500, 1000)).toBe(50);
    expect(getCategoryLimitLevel(750, 1000)).toBe(75);
    expect(getCategoryLimitLevel(900, 1000)).toBe(90);
    expect(getCategoryLimitLevel(1000, 1000)).toBe(100);
    expect(getCategoryLimitLevel(1200, 1000)).toBe(100);
  });

  test('returns null when limit is missing', () => {
    expect(getCategoryLimitLevel(500, 0)).toBeNull();
    expect(getCategoryLimitLevel(500, null)).toBeNull();
  });

  test('percent rounds correctly', () => {
    expect(getCategoryLimitPercent(1, 3)).toBe(33);
    expect(getCategoryLimitPercent(3000, 3000)).toBe(100);
  });

  test('warning text for over and under 100', () => {
    expect(getCategoryLimitWarningText('Food & Groceries', 100, 3100, 3000)).toContain('limit reached');
    expect(getCategoryLimitWarningText('Food & Groceries', 75, 2250, 3000)).toContain('75%');
  });
});
