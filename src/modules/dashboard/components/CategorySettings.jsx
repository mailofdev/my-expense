import { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getCategoryColor,
  getCategoryLimitLevel,
  getCategoryLimitPercent,
} from '../../../core/constants/finance';
import { formatINR } from '../../../core/utils/currency';
import {
  renameCategory,
  setMainCategoryHidden,
  updateFinanceSettings,
  selectExpensesByCategory,
  selectFilteredMonthLabel,
  selectMainCategories,
  selectSubcategories,
} from '../store/dashboardSlice';
import {
  getAllCategoryNames,
  MAX_SUBCATEGORIES_PER_MAIN,
} from '../utils/categories';

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
  const { categoryColors, categoryBudgets, saving } = useSelector((state) => state.dashboard);
  const mainCategories = useSelector(selectMainCategories);
  const subcategoriesMap = useSelector(selectSubcategories);
  const spentByCategory = useSelector(selectExpensesByCategory);
  const monthLabel = useSelector(selectFilteredMonthLabel);

  const allNames = useMemo(() => getAllCategoryNames(mainCategories), [mainCategories]);

  const [selectedId, setSelectedId] = useState(mainCategories[0]?.id || '');
  const [renameValue, setRenameValue] = useState('');
  const [limits, setLimits] = useState(categoryBudgets || {});
  const [newSub, setNewSub] = useState('');
  const [message, setMessage] = useState('');
  const [limitsDirty, setLimitsDirty] = useState(false);

  useEffect(() => {
    setLimits(categoryBudgets || {});
    setLimitsDirty(false);
  }, [categoryBudgets]);

  useEffect(() => {
    if (!mainCategories.length) {
      setSelectedId('');
      return;
    }
    if (!mainCategories.some((item) => item.id === selectedId)) {
      setSelectedId(mainCategories[0].id);
    }
  }, [mainCategories, selectedId]);

  const selected = useMemo(
    () => mainCategories.find((item) => item.id === selectedId) || null,
    [mainCategories, selectedId]
  );

  useEffect(() => {
    setRenameValue(selected?.name || '');
    setNewSub('');
  }, [selected?.id, selected?.name]);

  const activeSubs = selected ? subcategoriesMap[selected.id] || [] : [];

  const active = useMemo(() => {
    if (!selected) return null;
    const limit = Number(limits[selected.name]) || 0;
    const spent = spentByCategory[selected.name] || 0;
    return {
      ...selected,
      limit,
      spent,
      percent: getCategoryLimitPercent(spent, limit),
      level: getCategoryLimitLevel(spent, limit),
      color: getCategoryColor(selected.name, categoryColors, allNames),
      index: mainCategories.findIndex((item) => item.id === selected.id),
    };
  }, [selected, limits, spentByCategory, categoryColors, allNames, mainCategories]);

  const handleRename = () => {
    if (!selected || !user?.uid) return;
    const trimmed = renameValue.trim();
    setMessage('');
    if (!trimmed || trimmed === selected.name) return;

    dispatch(
      renameCategory({
        uid: user.uid,
        categoryId: selected.id,
        newName: trimmed,
      })
    ).then((result) => {
      if (result.error) {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not rename.');
      } else {
        setMessage('Renamed.');
      }
    });
  };

  const handleToggleHidden = () => {
    if (!selected || !user?.uid) return;
    setMessage('');
    dispatch(
      setMainCategoryHidden({
        uid: user.uid,
        categoryId: selected.id,
        hidden: !selected.hidden,
      })
    ).then((result) => {
      if (result.error) {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not update visibility.');
      }
    });
  };

  const persistSubs = (nextList, successMessage) => {
    if (!selected || !user?.uid) return;
    const nextSubs = { ...subcategoriesMap, [selected.id]: nextList };
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: { mainCategories, subcategories: nextSubs },
      })
    ).then((result) => {
      if (!result.error) {
        setMessage(successMessage);
        setNewSub('');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not update subcategories.');
      }
    });
  };

  const handleAddSub = () => {
    const trimmed = newSub.trim();
    setMessage('');
    if (!trimmed || !selected) return;
    if (activeSubs.length >= MAX_SUBCATEGORIES_PER_MAIN) {
      setMessage(`Up to ${MAX_SUBCATEGORIES_PER_MAIN} subcategories per category.`);
      return;
    }
    if (activeSubs.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setMessage('That subcategory already exists.');
      return;
    }
    persistSubs([...activeSubs, trimmed], 'Subcategory added.');
  };

  const handleRemoveSub = (name) => {
    setMessage('');
    persistSubs(
      activeSubs.filter((item) => item !== name),
      'Subcategory removed.'
    );
  };

  const handleSaveLimits = () => {
    setMessage('');
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          mainCategories,
          categoryBudgets: Object.fromEntries(
            allNames.map((cat) => [cat, Number(limits[cat]) || 0])
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

  const visibleCount = mainCategories.filter((item) => !item.hidden).length;

  return (
    <section className="card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="card-title mb-0">Categories</h2>
          <p className="card-desc mb-0 mt-1">
            Rename or hide mains, manage subcategories, set monthly limits.
          </p>
        </div>
        <p className="m-0 shrink-0 rounded-sm bg-surface-2 px-2 py-1 text-xs text-muted">
          {visibleCount}/{mainCategories.length} shown
        </p>
      </div>

      {message && (
        <p
          className={`mb-2 mt-0 text-sm ${
            message.endsWith('.') && !message.startsWith('Could') && !message.startsWith('Up to') && !message.startsWith('That') && !message.startsWith('Keep')
              ? 'text-success'
              : message === 'Renamed.' || message === 'Limits saved.' || message.startsWith('Subcategory')
                ? 'text-success'
                : 'text-danger'
          }`}
        >
          {message}
        </p>
      )}

      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {mainCategories.map((cat, index) => {
          const isActive = cat.id === selectedId;
          const hasLimit = Number(limits[cat.name]) > 0;
          return (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => setSelectedId(cat.id)}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/15 text-[#f0f4f2]'
                    : 'border-edge/70 bg-surface text-[#f0f4f2] hover:border-edge'
                } ${cat.hidden ? 'opacity-50' : ''}`}
                aria-pressed={isActive}
              >
                <span className="text-[10px] text-muted">{index + 1}</span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: getCategoryColor(cat.name, categoryColors, allNames) }}
                  aria-hidden="true"
                />
                <span className="truncate">{cat.name}</span>
                {cat.hidden && <span className="text-[10px] text-muted">hidden</span>}
                {hasLimit && <span className="text-[10px] text-muted">₹</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {active && (
        <div className="mt-4 space-y-4 rounded-sm border border-edge/60 bg-surface-2/40 p-3">
          <div className="flex items-center justify-between gap-2">
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
              className="shrink-0 border-0 bg-transparent px-1 text-sm text-muted hover:text-primary disabled:opacity-40"
              onClick={handleToggleHidden}
              disabled={saving || (!active.hidden && visibleCount <= 1)}
            >
              {active.hidden ? 'Show' : 'Hide'}
            </button>
          </div>

          <label className="label mb-0">
            Display name
            <div className="mt-1 flex gap-2">
              <input
                className="input"
                value={renameValue}
                onChange={(e) => {
                  setRenameValue(e.target.value);
                  setMessage('');
                }}
                aria-label="Rename category"
              />
              <button
                type="button"
                className="btn-outline shrink-0"
                onClick={handleRename}
                disabled={
                  saving ||
                  !renameValue.trim() ||
                  renameValue.trim() === active.name
                }
              >
                Rename
              </button>
            </div>
          </label>

          <div>
            <p className="label mb-2">Subcategories</p>
            {activeSubs.length === 0 ? (
              <p className="mb-2 mt-0 text-xs text-muted">None yet — optional for finer tracking.</p>
            ) : (
              <ul className="mb-2 mt-0 flex list-none flex-wrap gap-1.5 p-0">
                {activeSubs.map((sub) => (
                  <li key={sub}>
                    <span className="inline-flex items-center gap-1 rounded-sm border border-edge/70 bg-surface px-2 py-1 text-xs">
                      {sub}
                      <button
                        type="button"
                        className="border-0 bg-transparent p-0 text-muted hover:text-danger"
                        onClick={() => handleRemoveSub(sub)}
                        disabled={saving}
                        aria-label={`Remove ${sub}`}
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                className="input py-2 text-sm"
                value={newSub}
                onChange={(e) => {
                  setNewSub(e.target.value);
                  setMessage('');
                }}
                placeholder={
                  activeSubs.length >= MAX_SUBCATEGORIES_PER_MAIN
                    ? 'Limit reached'
                    : 'New subcategory'
                }
                disabled={saving || activeSubs.length >= MAX_SUBCATEGORIES_PER_MAIN}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSub();
                  }
                }}
              />
              <button
                type="button"
                className="btn-primary shrink-0"
                onClick={handleAddSub}
                disabled={!newSub.trim() || saving || activeSubs.length >= MAX_SUBCATEGORIES_PER_MAIN}
              >
                Add
              </button>
            </div>
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
            <div>
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
            <p className="mb-0 text-xs text-muted">No limit — warnings stay off for this category.</p>
          )}

          <button
            type="button"
            className="btn-primary btn-full"
            onClick={handleSaveLimits}
            disabled={saving || !limitsDirty}
          >
            {saving ? 'Saving…' : 'Save limits'}
          </button>

          <p className="mb-0 text-[11px] text-muted">
            Main categories cannot be deleted. Hide ones you rarely use.
          </p>
        </div>
      )}
    </section>
  );
}
