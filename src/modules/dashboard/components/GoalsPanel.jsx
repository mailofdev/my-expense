import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import useConfirm from '../../../shared/hooks/useConfirm';
import { goalProgress } from '../utils/planning';
import { selectEmergencySuggestion, updateFinanceSettings } from '../store/dashboardSlice';

const emptyDraft = () => ({
  name: '',
  target: '',
  saved: '',
  monthlyContribution: '',
  deadline: '',
});

function newGoalId() {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function GoalsPanel() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving, goals } = useSelector((state) => state.dashboard);
  const suggestion = useSelector(selectEmergencySuggestion);
  const [open, setOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [confirm, confirmDialog] = useConfirm();

  const list = Array.isArray(goals) ? goals : [];
  const hasEmergency = list.some((goal) => goal.kind === 'emergency');

  const saveGoals = (next, successText) => {
    dispatch(updateFinanceSettings({ uid: user.uid, updates: { goals: next } })).then((result) => {
      if (!result.error) setMessage(successText);
      else setMessage(typeof result.payload === 'string' ? result.payload : 'Could not save goals.');
    });
  };

  const addEmergency = () => {
    const goal = {
      id: newGoalId(),
      name: 'Emergency fund',
      kind: 'emergency',
      target: suggestion || 0,
      saved: 0,
      monthlyContribution: 0,
      deadline: '',
    };
    saveGoals([goal, ...list], 'Emergency fund added.');
  };

  const handleAdd = (event) => {
    event.preventDefault();
    const target = Number(draft.target);
    if (!draft.name.trim()) {
      setMessage('Add a goal name.');
      return;
    }
    if (!target || target < 1) {
      setMessage('Enter a target of at least ₹1.');
      return;
    }
    const goal = {
      id: editingId || newGoalId(),
      name: draft.name.trim(),
      kind: list.find((item) => item.id === editingId)?.kind || 'custom',
      target,
      saved: Math.max(0, Number(draft.saved) || 0),
      monthlyContribution: Math.max(0, Number(draft.monthlyContribution) || 0),
      deadline: draft.deadline || '',
    };
    const next = editingId
      ? list.map((item) => (item.id === editingId ? goal : item))
      : [goal, ...list];
    saveGoals(next, editingId ? 'Goal updated.' : 'Goal added.');
    setDraft(emptyDraft());
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (goal) => {
    setEditingId(goal.id);
    setDraft({
      name: goal.name || '',
      target: goal.target ? String(goal.target) : '',
      saved: goal.saved ? String(goal.saved) : '',
      monthlyContribution: goal.monthlyContribution ? String(goal.monthlyContribution) : '',
      deadline: goal.deadline || '',
    });
    setShowForm(true);
    setMessage('');
  };

  const handleDelete = async (goal) => {
    const ok = await confirm({
      title: 'Remove this goal?',
      message: `${goal.name} will be removed. Account balances stay as they are.`,
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    saveGoals(
      list.filter((item) => item.id !== goal.id),
      'Goal removed.'
    );
  };

  return (
    <section className="card">
      {confirmDialog}
      <button
        type="button"
        className="flex w-full items-center justify-between border-0 bg-transparent p-0 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="card-title mb-0">Goals</h2>
          <p className="card-desc mb-0 mt-1">
            {list.length ? `${list.length} goal${list.length === 1 ? '' : 's'}` : 'Emergency fund and other targets'}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {!hasEmergency && (
            <div className="rounded-md border border-edge/70 px-3 py-3">
              <p className="m-0 text-sm font-medium">Emergency fund</p>
              <p className="m-0 mt-1 text-xs leading-relaxed text-muted">
                {suggestion > 0
                  ? `A useful target is ${formatINR(suggestion)}, about 3 months of essentials.`
                  : 'Add essentials to your plan, or log essential spending, to see a suggested target.'}
              </p>
              <button type="button" className="btn-outline btn-sm mt-3" onClick={addEmergency} disabled={saving}>
                Add emergency fund
              </button>
            </div>
          )}

          {list.length > 0 && (
            <ul className="m-0 list-none space-y-3 p-0">
              {list.map((goal) => {
                const progress = goalProgress(goal);
                return (
                  <li key={goal.id} className="border-t border-edge/50 pt-3 first:border-0 first:pt-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="m-0 text-sm font-medium">{goal.name}</p>
                      <p className="m-0 text-xs text-muted">
                        {formatINR(progress.saved)} / {formatINR(progress.target)}
                      </p>
                    </div>
                    <div className="mb-1.5 mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <p className="m-0 text-xs text-muted">
                      {progress.remaining > 0 ? `${formatINR(progress.remaining)} to go` : 'Target reached'}
                      {goal.monthlyContribution > 0 ? ` · ${formatINR(goal.monthlyContribution)} a month` : ''}
                      {goal.deadline ? ` · by ${dayjs(goal.deadline).format('D MMM YYYY')}` : ''}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" className="btn-outline btn-sm" onClick={() => startEdit(goal)}>
                        Update
                      </button>
                      <button type="button" className="btn-outline btn-sm" onClick={() => handleDelete(goal)} disabled={saving}>
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {showForm ? (
            <form className="space-y-3" onSubmit={handleAdd}>
              <input
                className="input"
                placeholder="Goal name"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                aria-label="Goal name"
              />
              <input
                className="input"
                type="number"
                min="1"
                inputMode="numeric"
                placeholder="Target ₹"
                value={draft.target}
                onChange={(event) => setDraft((current) => ({ ...current, target: event.target.value }))}
                aria-label="Target"
              />
              <input
                className="input"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Saved so far ₹"
                value={draft.saved}
                onChange={(event) => setDraft((current) => ({ ...current, saved: event.target.value }))}
                aria-label="Saved so far"
              />
              <input
                className="input"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Monthly contribution ₹"
                value={draft.monthlyContribution}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, monthlyContribution: event.target.value }))
                }
                aria-label="Monthly contribution"
              />
              <input
                className="input"
                type="date"
                value={draft.deadline}
                onChange={(event) => setDraft((current) => ({ ...current, deadline: event.target.value }))}
                aria-label="Deadline"
              />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary min-w-0 flex-1" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save goal' : 'Add goal'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setDraft(emptyDraft());
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn-outline btn-full" onClick={() => setShowForm(true)}>
              Add a goal
            </button>
          )}
          {message && <p className="m-0 text-sm text-muted">{message}</p>}
        </div>
      )}
    </section>
  );
}
