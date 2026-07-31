import { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MAX_CATEGORIES,
  getCategoryColor,
  getCategoryLimitLevel,
  getCategoryLimitPercent,
} from '../../../core/constants/finance';
import { formatINR } from '../../../core/utils/currency';
import {
  deleteCategory,
  updateFinanceSettings,
  selectExpensesByCategory,
  selectFilteredMonthLabel,
} from '../store/dashboardSlice';

const levelBarClass = (level) => {
  if (level >= 100) return 'bg-danger';
  if (level >= 90) return 'bg-danger/80';
  if (level >= 75) return 'bg-accent';
  if (level >= 50) return 'bg-primary';
  return 'bg-primary/70';
};

export default function CategorySettings() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, categoryColors, categoryBudgets, saving } = useSelector(
    (state) => state.dashboard
  );
  const spentByCategory = useSelector(selectExpensesByCategory);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  const [newCategory, setNewCategory] = useState('');
  const [selected, setSelected] = useState(categories[0] || '');
  const [limits, setLimits] = useState(categoryBudgets || {});
  const [message, setMessage] = useState('');
  const [limitsDirty, setLimitsDirty] = useState(false);

  useEffect(() => {
    setLimits(categoryBudgets || {});
    setLimitsDirty(false);
  }, [categoryBudgets]);

  useEffect(() => {
    if (!categories.length) {
      setSelected('');
      return;
    }
    if (!categories.includes(selected)) {
      setSelected(categories[0]);
    }
  }, [categories, selected]);

  const atMax = categories.length >= MAX_CATEGORIES;

  const active = useMemo(() => {
    if (!selected) return null;
    const limit = Number(limits[selected]) || 0;
    const spent = spentByCategory[selected] || 0;
    return {
      name: selected,
      limit,
      spent,
      percent: getCategoryLimitPercent(spent, limit),
      level: getCategoryLimitLevel(spent, limit),
      color: getCategoryColor(selected, categoryColors, categories),
      index: categories.indexOf(selected),
    };
  }, [selected, limits, spentByCategory, categoryColors, categories]);

  const handleAdd = () => {
    const trimmed = newCategory.trim();
    setMessage('');
    if (!trimmed) return;
    if (atMax) {
      setMessage(`You can have up to ${MAX_CATEGORIES} categories.`);
      return;
    }
    if (categories.some((cat) => cat.toLowerCase() === trimmed.toLowerCase())) {
      setMessage('That category already exists.');
      return;
    }

    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          categories: [...categories, trimmed],
        },
      })
    ).then((result) => {
      if (!result.error) {
        setNewCategory('');
        setSelected(trimmed);
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not add category.');
      }
    });
  };

  const handleRemove = (name) => {
    setMessage('');
    if (categories.length <= 1) {
      setMessage('Keep at least one category.');
      return;
    }
    const fallbackHint =
      name === 'Other'
        ? categories.find((cat) => cat !== 'Other') || 'another category'
        : categories.includes('Other')
          ? 'Other'
          : categories.find((cat) => cat !== name) || 'another category';
    const proceed = window.confirm(
      `Remove "${name}"?\n\nExisting expenses in this category will move to ${fallbackHint}.`
    );
    if (!proceed) return;

    dispatch(deleteCategory({ uid: user.uid, name, fallback: 'Other' })).then((result) => {
      if (result.error) {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not remove category.');
      }
    });
  };

  const handleSaveLimits = () => {
    setMessage('');
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          categoryBudgets: Object.fromEntries(
            categories.map((cat) => [cat, Number(limits[cat]) || 0])
          ),
        },
      })
    ).then((result) => {
      if (!result.error) {
        setLimitsDirty(false);
        setMessage('Limits saved.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not save limits.');
      }
    });
  };

  return (
    <section className="card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="card-title mb-0">Categories</h2>
          <p className="card-desc mb-0 mt-1">Select one to set its monthly limit.</p>
        </div>
        <p className="m-0 shrink-0 rounded-sm bg-surface-2 px-2 py-1 text-xs text-muted">
          {categories.length}/{MAX_CATEGORIES}
        </p>
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          value={newCategory}
          onChange={(e) => {
            setNewCategory(e.target.value);
            setMessage('');
          }}
          placeholder={atMax ? 'Limit reached' : 'New category'}
          disabled={atMax || saving}
          aria-label="New category name"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={handleAdd}
          disabled={!newCategory.trim() || atMax || saving}
        >
          Add
        </button>
      </div>

      {message && (
        <p
          className={`mt-2 mb-0 text-sm ${
            message === 'Limits saved.' ? 'text-success' : 'text-danger'
          }`}
        >
          {message}
        </p>
      )}

      <ul className="mt-3 m-0 flex list-none flex-wrap gap-2 p-0">
        {categories.map((cat, index) => {
          const isActive = cat === selected;
          const hasLimit = Number(limits[cat]) > 0;
          return (
            <li key={cat}>
              <button
                type="button"
                onClick={() => setSelected(cat)}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/15 text-[#f0f4f2]'
                    : 'border-edge/70 bg-surface text-[#f0f4f2] hover:border-edge'
                }`}
                aria-pressed={isActive}
              >
                <span className="text-[10px] text-muted">{index + 1}</span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: getCategoryColor(cat, categoryColors, categories) }}
                  aria-hidden="true"
                />
                <span className="truncate">{cat}</span>
                {hasLimit && (
                  <span className="text-[10px] text-muted">₹</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {active && (
        <div className="mt-4 rounded-sm border border-edge/60 bg-surface-2/40 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: active.color }}
                aria-hidden="true"
              />
              <p className="m-0 truncate text-sm font-medium text-[#f0f4f2]">
                {active.name}
                <span className="ml-1.5 font-normal text-muted">#{active.index + 1}</span>
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 border-0 bg-transparent px-1 text-sm text-muted hover:text-danger disabled:opacity-40"
              onClick={() => handleRemove(active.name)}
              disabled={categories.length <= 1 || saving}
            >
              Remove
            </button>
          </div>

          <label className="label mb-0">
            Monthly limit (₹)
            <input
              className="input mt-1"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="e.g. 3000"
              value={limits[active.name] ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setLimits((prev) => ({ ...prev, [active.name]: value }));
                setLimitsDirty(true);
                setMessage('');
              }}
            />
          </label>

          {active.limit > 0 ? (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>
                  {monthLabel}: {formatINR(active.spent)} / {formatINR(active.limit)}
                </span>
                <span className={active.level >= 100 ? 'text-danger' : active.level >= 75 ? 'text-accent' : ''}>
                  {Math.min(active.percent, 999)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                <div
                  className={`h-full rounded-full transition-all ${levelBarClass(active.level || 0)}`}
                  style={{ width: `${Math.min(100, active.percent)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mb-0 mt-2 text-xs text-muted">No limit — warnings stay off for this category.</p>
          )}

          <button
            type="button"
            className="btn-primary btn-full mt-3"
            onClick={handleSaveLimits}
            disabled={saving || !limitsDirty}
          >
            {saving ? 'Saving…' : 'Save limits'}
          </button>
        </div>
      )}
    </section>
  );
}
