import {
  MAX_SUBCATEGORIES_PER_MAIN,
  SYSTEM_MAIN_CATEGORIES,
} from '../../../core/constants/finance';

export { MAX_SUBCATEGORIES_PER_MAIN, SYSTEM_MAIN_CATEGORIES };

export const DEFAULT_MAIN_CATEGORIES = SYSTEM_MAIN_CATEGORIES.map(({ id, name }) => ({
  id,
  name,
  hidden: false,
}));

export const CATEGORIES = SYSTEM_MAIN_CATEGORIES.map((item) => item.name);

/** Map legacy flat category names → system main id. */
export const LEGACY_CATEGORY_TO_ID = {
  Food: 'food_groceries',
  Travel: 'transport_fuel',
  Housing: 'household_living',
  Shopping: 'shopping_lifestyle',
  Bills: 'bills_emis',
  Entertainment: 'shopping_lifestyle',
  Health: 'personal_gifts',
  Investment: 'miscellaneous',
  Savings: 'miscellaneous',
  Other: 'miscellaneous',
  Miscellaneous: 'miscellaneous',
  'Food & Groceries': 'food_groceries',
  'Household & Living': 'household_living',
  'Transport & Fuel': 'transport_fuel',
  'Shopping & Lifestyle': 'shopping_lifestyle',
  'Bills & EMIs': 'bills_emis',
  'Family & Transfers': 'family_transfers',
  'Personal & Gifts': 'personal_gifts',
};

const SYSTEM_BY_ID = Object.fromEntries(
  SYSTEM_MAIN_CATEGORIES.map((item) => [item.id, item])
);

export function getSystemMainById(id) {
  return SYSTEM_BY_ID[id] || null;
}

export function getDefaultMainName(id) {
  return SYSTEM_BY_ID[id]?.name || 'Miscellaneous';
}

/**
 * Normalize main category list: always the 8 system ids, preserving
 * user renames and hidden flags. Unknown entries are dropped.
 */
export function ensureMainCategories(mainCategories, legacyNames = []) {
  const byId = {};
  (mainCategories || []).forEach((item) => {
    if (!item?.id || !SYSTEM_BY_ID[item.id]) return;
    byId[item.id] = {
      id: item.id,
      name: String(item.name || '').trim() || getDefaultMainName(item.id),
      hidden: Boolean(item.hidden),
    };
  });

  // Bootstrap from a legacy flat list when mains are missing.
  if (Object.keys(byId).length === 0 && Array.isArray(legacyNames) && legacyNames.length) {
    legacyNames.forEach((raw) => {
      const name = String(raw || '').trim();
      if (!name) return;
      const id = LEGACY_CATEGORY_TO_ID[name];
      if (id && !byId[id]) {
        byId[id] = { id, name: getDefaultMainName(id), hidden: false };
      }
    });
  }

  return SYSTEM_MAIN_CATEGORIES.map(({ id, name }) => {
    if (byId[id]) return byId[id];
    return { id, name, hidden: false };
  });
}

/** Visible (non-hidden) main display names, in system order. */
export function getVisibleCategoryNames(mainCategories) {
  return ensureMainCategories(mainCategories)
    .filter((item) => !item.hidden)
    .map((item) => item.name);
}

/** All main display names (including hidden). */
export function getAllCategoryNames(mainCategories) {
  return ensureMainCategories(mainCategories).map((item) => item.name);
}

export function getMainByName(mainCategories, name) {
  const trimmed = String(name || '').trim().toLowerCase();
  if (!trimmed) return null;
  return (
    ensureMainCategories(mainCategories).find(
      (item) => item.name.toLowerCase() === trimmed
    ) || null
  );
}

export function getMainById(mainCategories, id) {
  return ensureMainCategories(mainCategories).find((item) => item.id === id) || null;
}

/**
 * Resolve any category label (legacy or current) to a current main display name.
 */
export function resolveMainCategoryName(category, mainCategories) {
  const list = ensureMainCategories(mainCategories);
  const raw = String(category || '').trim();
  if (!raw) return list.find((item) => item.id === 'miscellaneous')?.name || 'Miscellaneous';

  const byName = list.find((item) => item.name.toLowerCase() === raw.toLowerCase());
  if (byName) return byName.name;

  const legacyId = LEGACY_CATEGORY_TO_ID[raw];
  if (legacyId) {
    return list.find((item) => item.id === legacyId)?.name || getDefaultMainName(legacyId);
  }

  return list.find((item) => item.id === 'miscellaneous')?.name || 'Miscellaneous';
}

/** Normalize subcategory map keyed by main id. */
export function ensureSubcategories(subcategories, mainCategories) {
  const mains = ensureMainCategories(mainCategories);
  const next = {};
  mains.forEach((main) => {
    const raw = subcategories?.[main.id];
    const seen = new Set();
    const list = [];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const name = String(item || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(name);
        if (list.length >= MAX_SUBCATEGORIES_PER_MAIN) break;
      }
    }
    next[main.id] = list;
  });
  return next;
}

export function getSubcategoriesForMain(subcategories, mainId) {
  if (!mainId) return [];
  const list = subcategories?.[mainId];
  return Array.isArray(list) ? list : [];
}

/** Parse #tags from free text (title or dedicated tags field). */
export function parseTagsFromText(text) {
  const matches = String(text || '').match(/#[\w-]+/g) || [];
  const seen = new Set();
  const tags = [];
  for (const match of matches) {
    const tag = match.slice(1).toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags;
}

/** Normalize a tags array or comma/#-delimited string. */
export function normalizeTags(input) {
  if (Array.isArray(input)) {
    const seen = new Set();
    const tags = [];
    for (const item of input) {
      const tag = String(item || '')
        .trim()
        .replace(/^#/, '')
        .toLowerCase();
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      tags.push(tag);
    }
    return tags;
  }
  if (typeof input === 'string') {
    const fromHash = parseTagsFromText(input);
    if (fromHash.length) return fromHash;
    const seen = new Set();
    const tags = [];
    for (const part of input.split(/[\s,]+/)) {
      const tag = part.trim().replace(/^#/, '').toLowerCase();
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      tags.push(tag);
    }
    return tags;
  }
  return [];
}

/**
 * Suggest a main category (and optional subcategory) from title keywords.
 * Prefers longer keyword matches; falls back to subcategory name matches.
 */
export function suggestCategoryFromTitle(title, mainCategories, subcategories = {}) {
  const text = String(title || '').toLowerCase().trim();
  if (!text) return null;

  const mains = ensureMainCategories(mainCategories);
  let best = null;

  for (const system of SYSTEM_MAIN_CATEGORIES) {
    const main = mains.find((item) => item.id === system.id);
    if (!main || main.hidden) continue;

    for (const keyword of system.keywords) {
      if (!text.includes(keyword)) continue;
      const score = keyword.length;
      if (!best || score > best.score) {
        best = { categoryId: main.id, category: main.name, subcategory: '', score };
      }
    }

    const subs = getSubcategoriesForMain(subcategories, main.id);
    for (const sub of subs) {
      const key = sub.toLowerCase();
      if (!text.includes(key)) continue;
      const score = key.length + 50;
      if (!best || score > best.score) {
        best = { categoryId: main.id, category: main.name, subcategory: sub, score };
      }
    }
  }

  if (!best) return null;
  return { categoryId: best.categoryId, category: best.category, subcategory: best.subcategory };
}

/** Merge tags from title hashtags + explicit tag input. */
export function collectExpenseTags(title, tagsInput) {
  const fromTitle = parseTagsFromText(title);
  const fromInput = normalizeTags(tagsInput);
  const seen = new Set();
  const tags = [];
  for (const tag of [...fromTitle, ...fromInput]) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags;
}

/**
 * Build profile category fields from raw profile (migration-safe).
 */
export function normalizeCategoryProfile(profile = {}) {
  const mainCategories = ensureMainCategories(
    profile.mainCategories,
    profile.categories
  );
  const subcategories = ensureSubcategories(profile.subcategories, mainCategories);
  const categories = getVisibleCategoryNames(mainCategories);
  const visibleOrAll =
    categories.length > 0 ? categories : getAllCategoryNames(mainCategories);

  return {
    mainCategories,
    subcategories,
    categories: visibleOrAll,
  };
}

/** Remap a stored expense category string onto current main names. */
export function normalizeExpenseCategoryFields(expense, mainCategories) {
  const category = resolveMainCategoryName(expense?.category, mainCategories);
  const subcategory = String(expense?.subcategory || '').trim();
  const tags = normalizeTags(expense?.tags);
  return { category, subcategory, tags };
}

/** Remap categoryBudgets keys from legacy/old names onto current main names. */
export function remapCategoryBudgets(categoryBudgets, mainCategories) {
  const mains = ensureMainCategories(mainCategories);
  const next = {};
  mains.forEach((main) => {
    next[main.name] = 0;
  });

  Object.entries(categoryBudgets || {}).forEach(([rawName, value]) => {
    const resolved = resolveMainCategoryName(rawName, mains);
    const amount = Number(value) || 0;
    if (amount > 0) {
      next[resolved] = Math.max(next[resolved] || 0, amount);
    }
  });

  return next;
}
