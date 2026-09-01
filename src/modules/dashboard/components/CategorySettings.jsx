import { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getCategoryColor } from '../../../core/constants/finance';
import {
  renameCategory,
  setMainCategoryHidden,
  selectMainCategories,
} from '../store/dashboardSlice';
import { getAllCategoryNames } from '../utils/categories';

export default function CategorySettings() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categoryColors, saving } = useSelector((state) => state.dashboard);
  const mainCategories = useSelector(selectMainCategories);

  const allNames = useMemo(() => getAllCategoryNames(mainCategories), [mainCategories]);

  const [selectedId, setSelectedId] = useState(mainCategories[0]?.id || '');
  const [renameValue, setRenameValue] = useState('');
  const [message, setMessage] = useState('');

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
  }, [selected?.id, selected?.name]);

  const active = useMemo(() => {
    if (!selected) return null;
    return {
      ...selected,
      color: getCategoryColor(selected.name, categoryColors, allNames),
      index: mainCategories.findIndex((item) => item.id === selected.id),
    };
  }, [selected, categoryColors, allNames, mainCategories]);

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
        setMessage('Saved.');
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
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not update.');
      }
    });
  };

  const visibleCount = mainCategories.filter((item) => !item.hidden).length;

  return (
    <section className="card">
      <div className="mb-3">
        <h2 className="card-title mb-0">Categories</h2>
        <p className="card-desc mb-0 mt-1">
          Tap to rename or hide. At least one category must stay visible.
        </p>
      </div>

      {message && (
        <p
          className={`mb-2 mt-0 text-sm ${
            message === 'Saved.' ? 'text-success' : 'text-danger'
          }`}
        >
          {message}
        </p>
      )}

      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {mainCategories.map((cat, index) => {
          const isActive = cat.id === selectedId;
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
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: getCategoryColor(cat.name, categoryColors, allNames) }}
                  aria-hidden="true"
                />
                <span className="truncate">{cat.name}</span>
                {cat.hidden && <span className="text-[10px] text-muted">hidden</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {active && (
        <div className="mt-4 space-y-3 rounded-sm border border-edge/60 bg-surface-2/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: active.color }}
                aria-hidden="true"
              />
              <p className="m-0 truncate text-sm font-medium text-[#f0f4f2]">{active.name}</p>
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
            Name
            <div className="mt-1 flex gap-2">
              <input
                className="input"
                value={renameValue}
                onChange={(e) => {
                  setRenameValue(e.target.value);
                  setMessage('');
                }}
                aria-label="Category name"
              />
              <button
                type="button"
                className="btn-primary shrink-0"
                onClick={handleRename}
                disabled={
                  saving ||
                  !renameValue.trim() ||
                  renameValue.trim() === active.name
                }
              >
                Save
              </button>
            </div>
          </label>
        </div>
      )}
    </section>
  );
}
