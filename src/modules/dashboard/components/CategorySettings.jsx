import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getCategoryColor, pickDistinctCategoryColor } from '../../../core/constants/finance';
import { deleteCategory, updateFinanceSettings } from '../store/dashboardSlice';

export default function CategorySettings() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, categoryColors, saving } = useSelector((state) => state.dashboard);
  const [newCategory, setNewCategory] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) => cat.toLowerCase().includes(q));
  }, [categories, query]);

  const handleAdd = () => {
    const trimmed = newCategory.trim();
    setMessage('');
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setMessage('That category already exists.');
      return;
    }

    const nextColor = pickDistinctCategoryColor(Object.values(categoryColors || {}));
    const nextColors = { ...categoryColors, [trimmed]: nextColor };

    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          categories: [...categories, trimmed],
          categoryColors: nextColors,
        },
      })
    ).then((result) => {
      if (!result.error) {
        setNewCategory('');
        setQuery('');
      }
    });
  };

  const handleRemove = (name) => {
    setMessage('');
    if (categories.length <= 1) {
      setMessage('Keep at least one category.');
      return;
    }
    const proceed = window.confirm(
      `Remove "${name}"?\n\nExisting expenses in this category will move to Other.`
    );
    if (!proceed) return;

    dispatch(deleteCategory({ uid: user.uid, name, fallback: 'Other' })).then((result) => {
      if (result.error) {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not remove category.');
      }
    });
  };

  return (
    <section className="card">
      <h2 className="card-title">Categories</h2>
      <p className="card-desc">Add or remove categories used when logging expenses.</p>

      <div className="flex gap-2">
        <input
          className="input"
          value={newCategory}
          onChange={(e) => {
            setNewCategory(e.target.value);
            setMessage('');
          }}
          placeholder="e.g. Pets"
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
          disabled={!newCategory.trim() || saving}
        >
          Add
        </button>
      </div>

      {message && <p className="mt-2 mb-0 text-sm text-danger">{message}</p>}

      {categories.length > 8 && (
        <input
          className="input mt-3"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search categories"
          aria-label="Search categories"
        />
      )}

      <div className="mt-4 max-h-48 overflow-y-auto rounded-sm border border-edge/50 bg-surface-2/20 p-2.5 sm:max-h-56">
        {filtered.length === 0 ? (
          <p className="m-0 py-2 text-center text-xs text-muted">No matching categories</p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {filtered.map((cat) => (
              <li key={cat}>
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-sm border border-edge/70 bg-surface px-2.5 py-1.5 text-sm text-[#f0f4f2]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: getCategoryColor(cat, categoryColors) }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{cat}</span>
                  <button
                    type="button"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border-0 bg-transparent text-base leading-none text-muted hover:bg-danger/15 hover:text-danger disabled:opacity-40"
                    onClick={() => handleRemove(cat)}
                    disabled={categories.length <= 1 || saving}
                    aria-label={`Remove ${cat}`}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mb-0 mt-2 text-xs text-muted">
        {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
        {query.trim() && filtered.length !== categories.length
          ? ` · showing ${filtered.length}`
          : ''}
      </p>
    </section>
  );
}
