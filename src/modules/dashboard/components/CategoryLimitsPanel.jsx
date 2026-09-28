import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CATEGORY_LIMIT_THRESHOLDS, normalizeHabits } from '../../../core/constants/finance';
import {
  selectVisibleCategories,
  updateFinanceSettings,
} from '../store/dashboardSlice';

export default function CategoryLimitsPanel() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving, categoryBudgets, habits } = useSelector((state) => state.dashboard);
  const categories = useSelector(selectVisibleCategories);
  const normalized = normalizeHabits(habits);
  const [draft, setDraft] = useState(() => ({ ...(categoryBudgets || {}) }));
  const [thresholds, setThresholds] = useState(normalized.limitThresholds);
  const [message, setMessage] = useState('');

  const toggleThreshold = (level) => {
    setThresholds((current) => {
      const has = current.includes(level);
      return has ? current.filter((item) => item !== level) : [...current, level].sort((a, b) => a - b);
    });
  };

  const handleSave = () => {
    const nextBudgets = { ...(categoryBudgets || {}) };
    categories.forEach((name) => {
      const amount = Math.round(Number(draft[name]) || 0);
      if (amount > 0) nextBudgets[name] = amount;
      else delete nextBudgets[name];
    });
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          categoryBudgets: nextBudgets,
          habits: { ...normalized, limitThresholds: thresholds },
        },
      })
    ).then((result) => {
      if (!result.error) setMessage('Limits saved.');
      else setMessage(typeof result.payload === 'string' ? result.payload : 'Could not save limits.');
    });
  };

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-muted">
        Optional monthly caps. Leave a category blank if you do not want a limit. Warnings use the levels you turn on.
      </p>
      <ul className="m-0 list-none space-y-2 p-0">
        {categories.map((name) => (
          <li key={name}>
            <label className="label m-0">
              {name}
              <input
                className="input mt-1"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="No limit"
                value={draft[name] ?? ''}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, [name]: event.target.value }))
                }
              />
            </label>
          </li>
        ))}
      </ul>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Warn at
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_LIMIT_THRESHOLDS.map((level) => {
            const on = thresholds.includes(level);
            return (
              <button
                key={level}
                type="button"
                className={`btn-outline btn-sm ${on ? 'border-primary/50 text-primary' : ''}`}
                aria-pressed={on}
                onClick={() => toggleThreshold(level)}
              >
                {level}%
              </button>
            );
          })}
        </div>
      </fieldset>
      <button type="button" className="btn-primary btn-full" disabled={saving} onClick={handleSave}>
        {saving ? 'Saving…' : 'Save limits'}
      </button>
      {message && <p className="m-0 text-sm text-muted">{message}</p>}
      <p className="m-0 text-xs text-muted">
        Any amount above zero shows used versus limit on Today and Reports.
      </p>
    </div>
  );
}
