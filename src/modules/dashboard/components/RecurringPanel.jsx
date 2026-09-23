import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import { getTodayString } from '../../../core/utils/date';
import useConfirm from '../../../shared/hooks/useConfirm';
import { listUpcoming, recordDateForTemplate } from '../utils/planning';
import { DEFAULT_EXPENSE_CATEGORY } from '../utils/categories';
import {
  addRecurringExpenseTemplate,
  addRecurringIncomeTemplate,
  deleteRecurringIncomeTemplate,
  deleteRecurringTemplate,
  recordRecurringExpense,
  recordRecurringIncome,
  selectVisibleCategories,
  updateRecurringIncomeTemplate,
  updateRecurringTemplate,
} from '../store/dashboardSlice';

const CADENCE_OPTIONS = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'yearly', label: 'Yearly' },
];

function dueLabel(nextDate, today) {
  const next = dayjs(nextDate);
  if (!next.isValid()) return 'No date';
  if (next.isBefore(dayjs(today), 'day')) return `Due ${next.format('D MMM')}`;
  if (next.isSame(dayjs(today), 'day')) return 'Due today';
  return next.format('D MMM');
}

export default function RecurringPanel({ compact = false }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving, recurringExpenses, recurringIncome } = useSelector((state) => state.dashboard);
  const categories = useSelector(selectVisibleCategories);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [nextDate, setNextDate] = useState(getTodayString());
  const [cadence, setCadence] = useState('monthly');
  const [category, setCategory] = useState(DEFAULT_EXPENSE_CATEGORY);
  const [message, setMessage] = useState('');
  const [confirm, confirmDialog] = useConfirm();
  const today = getTodayString();

  const upcoming = useMemo(() => {
    const expenses = listUpcoming(recurringExpenses, { today }).map((item) => ({
      ...item,
      kind: 'expense',
    }));
    const income = listUpcoming(recurringIncome, { today }).map((item) => ({
      ...item,
      kind: 'income',
    }));
    return [...expenses, ...income].sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)));
  }, [recurringExpenses, recurringIncome, today]);

  const templates = [
    ...(recurringIncome || []).map((item) => ({ ...item, kind: 'income' })),
    ...(recurringExpenses || []).map((item) => ({ ...item, kind: 'expense' })),
  ];

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setNextDate(getTodayString());
    setCadence('monthly');
    setKind('expense');
    setCategory(categories.includes(DEFAULT_EXPENSE_CATEGORY) ? DEFAULT_EXPENSE_CATEGORY : categories[0] || DEFAULT_EXPENSE_CATEGORY);
  };

  const handleAdd = (event) => {
    event.preventDefault();
    const value = Number(amount);
    if (!title.trim()) {
      setMessage('Add a name.');
      return;
    }
    if (!value || value < 1) {
      setMessage('Enter at least ₹1.');
      return;
    }
    if (!nextDate) {
      setMessage('Pick the next date.');
      return;
    }

    const action = kind === 'income' ? addRecurringIncomeTemplate : addRecurringExpenseTemplate;
    const template = {
      title: title.trim(),
      amount: value,
      cadence,
      nextDate,
      ...(kind === 'expense' ? { category: category || DEFAULT_EXPENSE_CATEGORY, paymentMode: 'UPI' } : {}),
    };

    dispatch(action({ uid: user.uid, template })).then((result) => {
      if (!result.error) {
        resetForm();
        setShowForm(false);
        setMessage('Saved.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not save.');
      }
    });
  };

  const handleRecord = (item) => {
    const action = item.kind === 'income' ? recordRecurringIncome : recordRecurringExpense;
    dispatch(action({ uid: user.uid, templateId: item.id })).then((result) => {
      if (!result.error) setMessage(item.kind === 'income' ? 'Income recorded.' : 'Bill recorded.');
      else setMessage(typeof result.payload === 'string' ? result.payload : 'Could not record.');
    });
  };

  const handleToggle = (item) => {
    const action = item.kind === 'income' ? updateRecurringIncomeTemplate : updateRecurringTemplate;
    dispatch(
      action({
        uid: user.uid,
        templateId: item.id,
        updates: { enabled: item.enabled === false },
      })
    );
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: 'Remove this repeat?',
      message: `${item.title} will stop repeating. Money already recorded stays as it is.`,
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    const action = item.kind === 'income' ? deleteRecurringIncomeTemplate : deleteRecurringTemplate;
    dispatch(action({ uid: user.uid, templateId: item.id }));
  };

  if (compact) {
    if (!upcoming.length) return null;
    return (
      <section className="card">
        {confirmDialog}
        <h2 className="card-title mb-1">Upcoming</h2>
        <p className="card-desc">Bills and income still to come.</p>
        {upcoming.length === 0 ? (
          <p className="m-0 text-sm text-muted">Nothing due soon. Add repeats on Income.</p>
        ) : (
          <ul className="m-0 list-none space-y-0 p-0">
            {upcoming.map((item) => {
              const canRecord = Boolean(recordDateForTemplate(item.nextDate, today));
              return (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center justify-between gap-3 border-t border-edge/50 py-3 first:border-0 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-medium">{item.title}</p>
                    <p className="m-0 text-xs text-muted">
                      {item.kind === 'income' ? 'Income' : 'Bill'} · {dueLabel(item.nextDate, today)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`text-sm font-semibold ${item.kind === 'income' ? 'text-success' : 'text-ink'}`}>
                      {formatINR(item.amount)}
                    </span>
                    {canRecord && (
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        disabled={saving}
                        onClick={() => handleRecord(item)}
                      >
                        Record
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {message && <p className="mb-0 mt-3 text-sm text-muted">{message}</p>}
      </section>
    );
  }

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
          <h2 className="card-title mb-0">Upcoming</h2>
          <p className="card-desc mb-0 mt-1">
            {upcoming.length
              ? `${upcoming.length} coming up`
              : 'Salary, rent, EMIs, and other repeats'}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {upcoming.length > 0 && (
            <ul className="m-0 list-none space-y-0 p-0">
              {upcoming.map((item) => {
                const canRecord = Boolean(recordDateForTemplate(item.nextDate, today));
                return (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className="flex items-center justify-between gap-3 border-t border-edge/50 py-3 first:border-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-medium">{item.title}</p>
                      <p className="m-0 text-xs text-muted">
                        {item.kind === 'income' ? 'Income' : 'Bill'} · {dueLabel(item.nextDate, today)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-sm font-semibold ${item.kind === 'income' ? 'text-success' : 'text-ink'}`}>
                        {formatINR(item.amount)}
                      </span>
                      {canRecord && (
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          disabled={saving}
                          onClick={() => handleRecord(item)}
                        >
                          Record
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {templates.length > 0 && (
            <div>
              <p className="section-label">Repeats</p>
              <ul className="m-0 list-none space-y-2 p-0">
                {templates.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="rounded-md border border-edge/60 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="m-0 truncate text-sm font-medium">
                          {item.title}
                          {item.enabled === false ? ' · paused' : ''}
                        </p>
                        <p className="m-0 text-xs text-muted">
                          {item.kind === 'income' ? 'Income' : item.category || 'Expense'} ·{' '}
                          {formatINR(item.amount)} · next {item.nextDate ? dayjs(item.nextDate).format('D MMM YYYY') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button type="button" className="btn-outline btn-sm" onClick={() => handleToggle(item)} disabled={saving}>
                        {item.enabled === false ? 'Resume' : 'Pause'}
                      </button>
                      <button type="button" className="btn-outline btn-sm" onClick={() => handleDelete(item)} disabled={saving}>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showForm ? (
            <form className="space-y-3" onSubmit={handleAdd}>
              <select className="input" value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Kind">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <input
                className="input"
                placeholder="Name, like Rent or Salary"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-label="Name"
              />
              <input
                className="input"
                type="number"
                min="1"
                inputMode="numeric"
                placeholder="Amount ₹"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-label="Amount"
              />
              <input
                className="input"
                type="date"
                value={nextDate}
                onChange={(event) => setNextDate(event.target.value)}
                aria-label="Next date"
              />
              <select className="input" value={cadence} onChange={(event) => setCadence(event.target.value)} aria-label="How often">
                {CADENCE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              {kind === 'expense' && (
                <select className="input" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
                  {categories.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary min-w-0 flex-1" disabled={saving}>
                  {saving ? 'Saving…' : 'Add repeat'}
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn-primary btn-full" onClick={() => setShowForm(true)}>
              Add a repeat
            </button>
          )}
          {message && <p className="m-0 text-sm text-muted">{message}</p>}
        </div>
      )}
    </section>
  );
}
