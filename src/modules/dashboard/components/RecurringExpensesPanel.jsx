import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import { getTodayString } from '../../../core/utils/date';
import {
  addRecurringExpenseTemplate,
  applyDueRecurringExpenses,
  updateRecurringTemplate,
  deleteRecurringTemplate,
  selectDueRecurringExpenses,
} from '../store/dashboardSlice';

const CADENCE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' },
];

const cadenceLabel = (value) =>
  CADENCE_OPTIONS.find((item) => item.value === value)?.label || 'Monthly';

export default function RecurringExpensesPanel() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, paymentModes, recurringExpenses, saving } = useSelector(
    (state) => state.dashboard
  );
  const dueItems = useSelector(selectDueRecurringExpenses);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Other');
  const [nextDate, setNextDate] = useState(getTodayString());
  const [cadence, setCadence] = useState('monthly');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (categories?.length && !categories.includes(category)) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const sorted = useMemo(() => {
    const dueIds = new Set(dueItems.map((item) => item.id));
    return [...(recurringExpenses || [])].sort((a, b) => {
      const aDue = dueIds.has(a.id) ? 0 : 1;
      const bDue = dueIds.has(b.id) ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      return dayjs(a.nextDate).valueOf() - dayjs(b.nextDate).valueOf();
    });
  }, [recurringExpenses, dueItems]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setCategory(categories[0] || 'Other');
    setNextDate(getTodayString());
    setCadence('monthly');
  };

  const handleAdd = () => {
    setMessage('');
    const trimmed = title.trim();
    const value = Number(amount);
    if (!trimmed) {
      setMessage('Enter a name.');
      return;
    }
    if (!value || value < 1) {
      setMessage('Enter an amount of at least ₹1.');
      return;
    }
    if (!nextDate) {
      setMessage('Pick the next due date.');
      return;
    }

    dispatch(
      addRecurringExpenseTemplate({
        uid: user.uid,
        template: {
          title: trimmed,
          amount: value,
          category: category || categories[0] || 'Other',
          paymentMode: paymentModes[0] || 'UPI',
          cadence,
          nextDate,
        },
      })
    ).then((result) => {
      if (!result.error) {
        resetForm();
        setShowForm(false);
        setMessage('Bill saved.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not save bill.');
      }
    });
  };

  const handleLogDue = () => {
    if (!dueItems.length) return;
    const total = dueItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const names = dueItems.map((item) => item.title).join(', ');
    const proceed = window.confirm(
      `Log ${dueItems.length} due bill${dueItems.length > 1 ? 's' : ''} today?\n\n${names}\nTotal: ${formatINR(total)}`
    );
    if (!proceed) return;

    setMessage('');
    dispatch(applyDueRecurringExpenses({ uid: user.uid })).then((result) => {
      if (!result.error) {
        const count = result.payload?.expenses?.length || 0;
        setMessage(
          count
            ? `Logged ${count} bill${count > 1 ? 's' : ''} for today.`
            : 'Nothing due right now.'
        );
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not log bills.');
      }
    });
  };

  const handleToggle = (item) => {
    dispatch(
      updateRecurringTemplate({
        uid: user.uid,
        templateId: item.id,
        updates: { enabled: !item.enabled },
      })
    );
  };

  const handleRemove = (item) => {
    const proceed = window.confirm(`Remove "${item.title}" from recurring bills?`);
    if (!proceed) return;
    dispatch(deleteRecurringTemplate({ uid: user.uid, templateId: item.id }));
  };

  return (
    <section className="card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="card-title mb-0">Recurring bills</h2>
          <p className="card-desc mb-0 mt-1">Rent, EMI, subscriptions — log once when due.</p>
        </div>
        <button
          type="button"
          className="btn-outline shrink-0 px-3 py-1.5 text-sm"
          onClick={() => {
            setShowForm((v) => !v);
            setMessage('');
          }}
        >
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {dueItems.length > 0 && (
        <div className="mb-3 rounded-sm border border-accent/40 bg-accent/10 px-3 py-2">
          <p className="m-0 text-xs text-yellow-100">
            {dueItems.length} bill{dueItems.length > 1 ? 's' : ''} due now
          </p>
          <button
            type="button"
            className="btn-primary mt-2 w-full"
            onClick={handleLogDue}
            disabled={saving}
          >
            {saving ? 'Logging…' : 'Log due bills'}
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-3 space-y-2 rounded-sm border border-edge/60 bg-surface-2/40 p-3">
          <input
            className="input"
            placeholder="e.g. Rent, Netflix"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Bill name"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="Amount ₹"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Amount"
            />
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="label mb-0 text-xs">
              Next due
              <input
                className="input mt-1"
                type="date"
                value={nextDate}
                max="2099-12-31"
                onChange={(e) => setNextDate(e.target.value)}
              />
            </label>
            <label className="label mb-0 text-xs">
              Repeat
              <select
                className="input mt-1"
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
              >
                {CADENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="btn-primary btn-full"
            onClick={handleAdd}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save bill'}
          </button>
        </div>
      )}

      {message && (
        <p
          className={`mb-3 mt-0 text-sm ${
            message.startsWith('Could') || message.startsWith('Enter') || message.startsWith('Pick')
              ? 'text-danger'
              : 'text-success'
          }`}
        >
          {message}
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="m-0 text-sm text-muted">No recurring bills yet. Add rent or subscriptions here.</p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {sorted.map((item) => {
            const isDue = dueItems.some((due) => due.id === item.id);
            return (
              <li
                key={item.id}
                className={`rounded-sm border px-3 py-2.5 ${
                  isDue
                    ? 'border-accent/40 bg-accent/5'
                    : 'border-edge/60 bg-surface-2/20'
                } ${!item.enabled ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-medium text-[#f0f4f2]">
                      {item.title}
                      {isDue && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase text-accent">
                          Due
                        </span>
                      )}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-muted">
                      {formatINR(item.amount)} · {item.category} · {cadenceLabel(item.cadence)}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-muted">
                      Next {dayjs(item.nextDate).format('D MMM YYYY')}
                      {!item.enabled ? ' · Paused' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="rounded-sm border-0 bg-transparent px-2 py-1 text-xs text-muted hover:text-primary"
                      onClick={() => handleToggle(item)}
                      disabled={saving}
                    >
                      {item.enabled ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      className="rounded-sm border-0 bg-transparent px-2 py-1 text-xs text-muted hover:text-danger"
                      onClick={() => handleRemove(item)}
                      disabled={saving}
                      aria-label={`Remove ${item.title}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
