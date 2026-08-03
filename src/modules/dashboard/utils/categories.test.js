import {
  MAX_SUBCATEGORIES_PER_MAIN,
  SYSTEM_MAIN_CATEGORIES,
  ensureMainCategories,
  ensureSubcategories,
  getVisibleCategoryNames,
  getAllCategoryNames,
  getMainByName,
  getMainById,
  resolveMainCategoryName,
  parseTagsFromText,
  normalizeTags,
  suggestCategoryFromTitle,
  collectExpenseTags,
  normalizeCategoryProfile,
  remapCategoryBudgets,
  LEGACY_CATEGORY_TO_ID,
} from './categories';

describe('ensureMainCategories', () => {
  test('returns all 8 system mains by default', () => {
    const mains = ensureMainCategories();
    expect(mains).toHaveLength(8);
    expect(mains.map((m) => m.id)).toEqual(SYSTEM_MAIN_CATEGORIES.map((m) => m.id));
    expect(mains.every((m) => !m.hidden)).toBe(true);
  });

  test('preserves rename and hidden flags', () => {
    const mains = ensureMainCategories([
      { id: 'food_groceries', name: 'Eats', hidden: true },
    ]);
    const food = mains.find((m) => m.id === 'food_groceries');
    expect(food.name).toBe('Eats');
    expect(food.hidden).toBe(true);
    expect(mains).toHaveLength(8);
  });

  test('bootstraps from legacy flat names', () => {
    const mains = ensureMainCategories([], ['Food', 'Travel', 'Other']);
    expect(mains.find((m) => m.id === 'food_groceries')).toBeTruthy();
    expect(mains.find((m) => m.id === 'transport_fuel')).toBeTruthy();
    expect(mains.find((m) => m.id === 'miscellaneous')).toBeTruthy();
  });
});

describe('resolveMainCategoryName', () => {
  test('maps legacy Food to Food & Groceries', () => {
    expect(resolveMainCategoryName('Food')).toBe('Food & Groceries');
    expect(LEGACY_CATEGORY_TO_ID.Food).toBe('food_groceries');
  });

  test('maps unknown to Miscellaneous', () => {
    expect(resolveMainCategoryName('CustomStuff')).toBe('Miscellaneous');
  });

  test('respects renamed mains', () => {
    const mains = ensureMainCategories([
      { id: 'food_groceries', name: 'Eats', hidden: false },
    ]);
    expect(resolveMainCategoryName('Food', mains)).toBe('Eats');
    expect(resolveMainCategoryName('Eats', mains)).toBe('Eats');
  });
});

describe('subcategories', () => {
  test('normalizes and caps per main', () => {
    const many = Array.from({ length: 25 }, (_, i) => `Sub${i}`);
    const result = ensureSubcategories({ food_groceries: ['Tea', 'tea', '', ...many] });
    expect(result.food_groceries[0]).toBe('Tea');
    expect(result.food_groceries).toHaveLength(MAX_SUBCATEGORIES_PER_MAIN);
    expect(result.transport_fuel).toEqual([]);
  });
});

describe('tags', () => {
  test('parses hashtags from text', () => {
    expect(parseTagsFromText('Lunch with #Family and #friend #family')).toEqual([
      'family',
      'friend',
    ]);
  });

  test('normalizes mixed tag input', () => {
    expect(normalizeTags(['#Family', 'friend', 'FRIEND', ''])).toEqual(['family', 'friend']);
    expect(normalizeTags('work, personal')).toEqual(['work', 'personal']);
  });

  test('collects tags from title and input', () => {
    expect(collectExpenseTags('Tea #family', 'friend, work')).toEqual([
      'family',
      'friend',
      'work',
    ]);
  });
});

describe('suggestCategoryFromTitle', () => {
  const mains = ensureMainCategories();

  test('suggests Food for tea', () => {
    const suggestion = suggestCategoryFromTitle('Morning tea', mains);
    expect(suggestion.category).toBe('Food & Groceries');
  });

  test('suggests Transport for petrol', () => {
    const suggestion = suggestCategoryFromTitle('Filled petrol', mains);
    expect(suggestion.category).toBe('Transport & Fuel');
  });

  test('prefers subcategory name match', () => {
    const subs = { food_groceries: ['Office Lunch'] };
    const suggestion = suggestCategoryFromTitle('Office Lunch today', mains, subs);
    expect(suggestion.category).toBe('Food & Groceries');
    expect(suggestion.subcategory).toBe('Office Lunch');
  });

  test('skips hidden mains', () => {
    const hiddenFood = ensureMainCategories([
      { id: 'food_groceries', name: 'Food & Groceries', hidden: true },
    ]);
    const suggestion = suggestCategoryFromTitle('tea', hiddenFood);
    expect(suggestion).toBeNull();
  });

  test('returns null for empty title', () => {
    expect(suggestCategoryFromTitle('', mains)).toBeNull();
  });
});

describe('normalizeCategoryProfile', () => {
  test('hides categories from visible list', () => {
    const profile = normalizeCategoryProfile({
      mainCategories: [
        { id: 'food_groceries', name: 'Food & Groceries', hidden: true },
      ],
    });
    expect(profile.categories).not.toContain('Food & Groceries');
    expect(profile.mainCategories.find((m) => m.id === 'food_groceries').hidden).toBe(true);
    expect(getAllCategoryNames(profile.mainCategories)).toHaveLength(8);
    expect(getVisibleCategoryNames(profile.mainCategories)).toHaveLength(7);
  });

  test('migrates legacy categories list', () => {
    const profile = normalizeCategoryProfile({
      categories: ['Food', 'Travel', 'Other'],
    });
    expect(profile.categories).toContain('Food & Groceries');
    expect(profile.categories).toContain('Transport & Fuel');
    expect(profile.mainCategories).toHaveLength(8);
  });
});

describe('remapCategoryBudgets', () => {
  test('moves Food budget onto Food & Groceries', () => {
    const budgets = remapCategoryBudgets({ Food: 3000, Travel: 2000 });
    expect(budgets['Food & Groceries']).toBe(3000);
    expect(budgets['Transport & Fuel']).toBe(2000);
    expect(budgets.Miscellaneous).toBe(0);
  });
});

describe('lookups', () => {
  test('getMainByName and getMainById', () => {
    const mains = ensureMainCategories();
    expect(getMainByName(mains, 'Transport & Fuel')?.id).toBe('transport_fuel');
    expect(getMainById(mains, 'bills_emis')?.name).toBe('Bills & EMIs');
  });
});
