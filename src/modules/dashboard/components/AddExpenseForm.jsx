import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import {
  addExpense,
  setDayFilter,
  selectFilterDate,
  selectIsTodaySelected,
  selectMonthWalletStatsByDate,
  selectAccounts,
  selectDefaultAccountId,
  selectVisibleCategories,
  selectMainCategories,
  selectSubcategories,
  selectPeopleGroups,
  updateFinanceSettings,
} from '../store/dashboardSlice';
import {
  collectExpenseTags,
  suggestCategoryFromTitle,
  shortCategoryLabel,
  DEFAULT_EXPENSE_CATEGORY,
  getSubcategoriesForMain,
  getMainByName,
} from '../utils/categories';
import TagInput from './TagInput';
import ExpenseSplitFields, { resolveSplitPayload } from './ExpenseSplitFields';
import { formatAccountOptionLabel, isSetAsideAccount } from '../utils/accounts';

const EMPTY_SPLIT = { enabled: false, groupId: '', paidBy: '', memberIds: [] };

function ChoiceChips({ label, value, options, onChange }) {
  if (!options.length) return null;
  return (
    <div>
      <p className="m-0 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`min-h-11 shrink-0 rounded-full px-3.5 text-sm font-medium ${
                selected ? 'bg-primary text-on-primary shadow-glow' : 'bg-surface-2 text-ink'
              }`}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function fallbackCategory(categories) {
  if (categories.includes(DEFAULT_EXPENSE_CATEGORY)) return DEFAULT_EXPENSE_CATEGORY;
  return categories[0] || DEFAULT_EXPENSE_CATEGORY;
}

export default function AddExpenseForm({ onGoToMoney, onOpenGroups }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { paymentModes, saving } = useSelector((state) => state.dashboard);
  const categories = useSelector(selectVisibleCategories);
  const mainCategories = useSelector(selectMainCategories);
  const subcategoriesMap = useSelector(selectSubcategories);
  const accounts = useSelector(selectAccounts);
  const peopleGroups = useSelector(selectPeopleGroups);
  const defaultAccountId = useSelector(selectDefaultAccountId);
  const filterDate = useSelector(selectFilterDate);
  const isToday = useSelector(selectIsTodaySelected);
  const showBankPicker = accounts.length > 1;
  const [splitUi, setSplitUi] = useState(EMPTY_SPLIT);
  const [showMore, setShowMore] = useState(false);
  const [success, setSuccess] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');

  const categoryTouchedRef = useRef(false);
  const defaultCategory = fallbackCategory(categories);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      amount: '',
      date: filterDate,
      category: defaultCategory,
      subcategory: '',
      tags: '',
      paymentMode: paymentModes[0],
      accountId: defaultAccountId,
    },
  });

  const watchedDate = watch('date') || filterDate;
  const watchedAmount = Number(watch('amount')) || 0;
  const watchedCategory = watch('category') || defaultCategory;
  const watchedSubcategory = watch('subcategory') || '';
  const watchedTitle = watch('title') || '';
  const watchedTags = watch('tags') || '';
  const watchedPayment = watch('paymentMode') || paymentModes[0];
  const watchedAccountId = watch('accountId');
  const payingFromSetAside = accounts.some(
    (account) => account.id === watchedAccountId && isSetAsideAccount(account)
  );
  const expenseWallet = useSelector(
    (state) => selectMonthWalletStatsByDate(state, watchedDate),
    shallowEqual
  );
  const projectedRemaining = payingFromSetAside
    ? expenseWallet.remaining
    : expenseWallet.remaining - watchedAmount;

  useEffect(() => {
    setValue('date', filterDate);
  }, [filterDate, setValue]);

  useEffect(() => {
    if (!categories?.length) return;
    if (!categories.includes(watchedCategory)) {
      setValue('category', fallbackCategory(categories));
      categoryTouchedRef.current = false;
    }
  }, [categories, watchedCategory, setValue]);

  useEffect(() => {
    if (!accounts.length) return;
    if (!accounts.some((account) => account.id === watchedAccountId)) {
      setValue('accountId', defaultAccountId);
    }
  }, [accounts, watchedAccountId, defaultAccountId, setValue]);

  const activeMain = getMainByName(mainCategories, watchedCategory);
  const subcategoryOptions = getSubcategoriesForMain(subcategoriesMap, activeMain?.id);
  const suggestion = useMemo(
    () => suggestCategoryFromTitle(watchedTitle, mainCategories, subcategoriesMap),
    [watchedTitle, mainCategories, subcategoriesMap]
  );
  const suggestionLabel = suggestion?.category
    ? suggestion.subcategory
      ? `${shortCategoryLabel(suggestion.category)} · ${suggestion.subcategory}`
      : shortCategoryLabel(suggestion.category)
    : '';

  useEffect(() => {
    if (categoryTouchedRef.current || !suggestion?.category) {
      if (!suggestion?.category) setSuggestedCategory('');
      return;
    }
    setValue('category', suggestion.category);
    setValue('subcategory', suggestion.subcategory || '');
    setSuggestedCategory(suggestionLabel);
  }, [suggestion, suggestionLabel, setValue]);

  const pickCategory = (name) => {
    categoryTouchedRef.current = true;
    setSuggestedCategory('');
    setValue('category', name);
    setValue('subcategory', '');
  };

  const applySuggestion = () => {
    if (!suggestion?.category) return;
    categoryTouchedRef.current = false;
    setValue('category', suggestion.category);
    setValue('subcategory', suggestion.subcategory || '');
    setSuggestedCategory(suggestionLabel);
  };

  const addSubcategory = () => {
    const name = newSubcategory.trim();
    const main = getMainByName(mainCategories, watchedCategory);
    if (!name || !main) return;
    const current = getSubcategoriesForMain(subcategoriesMap, main.id);
    if (current.some((item) => item.toLowerCase() === name.toLowerCase())) {
      setValue('subcategory', current.find((item) => item.toLowerCase() === name.toLowerCase()) || name);
      setNewSubcategory('');
      return;
    }
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: {
          subcategories: {
            ...subcategoriesMap,
            [main.id]: [...current, name],
          },
        },
      })
    ).then((result) => {
      if (!result.error) {
        setValue('subcategory', name);
        setNewSubcategory('');
      }
    });
  };

  const onSubmit = (data) => {
    const expenseDate = data.date || filterDate;
    if (dayjs(expenseDate).isAfter(dayjs(), 'day')) return;

    const category = data.category || defaultCategory;
    const tags = collectExpenseTags(data.title, data.tags);
    const amount = Number(data.amount);
    const split = resolveSplitPayload(splitUi, amount, peopleGroups);
    if (splitUi.enabled && !split) return;

    dispatch(
      addExpense({
        uid: user.uid,
        expense: {
          title: data.title,
          amount,
          category,
          subcategory: data.subcategory || '',
          tags,
          paymentMode: data.paymentMode || paymentModes[0],
          accountId: data.accountId || defaultAccountId,
          date: expenseDate,
          split: split || null,
        },
      })
    ).then((result) => {
      if (!result.error) {
        if (expenseDate !== filterDate) {
          dispatch(setDayFilter({ date: expenseDate }));
        }
        categoryTouchedRef.current = false;
        setSplitUi(EMPTY_SPLIT);
        setShowMore(false);
        setSuggestedCategory('');
        setSuccess(`Added ${formatINR(amount)} · ${data.title}`);
        reset({
          title: '',
          amount: '',
          date: expenseDate,
          category: defaultCategory,
          subcategory: '',
          tags: '',
          paymentMode: paymentModes[0],
          accountId: defaultAccountId,
        });
      }
    });
  };

  return (
    <section className="card">
      <h2 className="card-title mb-3">Add expense</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <input
          className="input min-h-11"
          placeholder={isToday ? 'What did you buy?' : 'Expense name'}
          {...register('title', { required: 'Enter a name' })}
        />

        <div className="grid grid-cols-[1.2fr_1fr] gap-2">
          <input
            className="input min-h-11"
            type="number"
            placeholder="Amount ₹"
            min="1"
            aria-label="Amount"
            {...register('amount', {
              required: 'Enter amount',
              min: { value: 1, message: 'Min ₹1' },
            })}
          />
          <input
            className="input min-h-11"
            type="date"
            max={dayjs().format('YYYY-MM-DD')}
            aria-label="Date"
            {...register('date')}
          />
        </div>

        {suggestionLabel && suggestedCategory !== suggestionLabel && (
          <button
            type="button"
            className="min-h-11 rounded-full border border-primary/40 bg-primary/10 px-3.5 text-sm font-medium text-primary"
            onClick={applySuggestion}
          >
            Use {suggestionLabel}
          </button>
        )}
        <ChoiceChips
          label="Category"
          value={watchedCategory}
          options={categories.map((name) => ({ value: name, label: shortCategoryLabel(name) }))}
          onChange={pickCategory}
        />

        {subcategoryOptions.length > 0 && (
          <ChoiceChips
            label="Subcategory"
            value={watchedSubcategory}
            options={[{ value: '', label: 'None' }, ...subcategoryOptions.map((name) => ({ value: name, label: name }))]}
            onChange={(name) => {
              categoryTouchedRef.current = true;
              setValue('subcategory', name);
            }}
          />
        )}

        <ChoiceChips
          label="Paid with"
          value={watchedPayment}
          options={paymentModes.map((mode) => ({ value: mode, label: mode }))}
          onChange={(mode) => setValue('paymentMode', mode)}
        />

        {showBankPicker && (
          <ChoiceChips
            label="Account"
            value={watchedAccountId}
            options={accounts.map((account) => ({
              value: account.id,
              label: formatAccountOptionLabel(account),
            }))}
            onChange={(id) => setValue('accountId', id)}
          />
        )}

        {expenseWallet.funded > 0 && watchedAmount > 0 && (
          <p
            className={`m-0 rounded-sm border px-3 py-2 text-xs ${
              projectedRemaining < 0
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-edge bg-surface-2 text-muted'
            }`}
          >
            {payingFromSetAside
              ? `Paid from a set-aside account. Left to spend stays ${formatINR(expenseWallet.remaining)}.`
              : projectedRemaining < 0
                ? `${formatINR(Math.abs(projectedRemaining))} over budget after this`
                : `${formatINR(projectedRemaining)} left this month after this`}
          </p>
        )}

        {expenseWallet.funded === 0 && watchedAmount > 0 && onGoToMoney && (
          <p className="m-0 rounded-sm border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-ink">
            No income this month yet.{' '}
            <button
              type="button"
              className="border-0 bg-transparent p-0 font-semibold text-primary underline"
              onClick={onGoToMoney}
            >
              Add income
            </button>
          </p>
        )}

        <div className="flex items-center gap-2">
          <button type="submit" className="btn-primary min-w-0 flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Add expense'}
          </button>
          <button
            type="button"
            className={`btn-outline shrink-0 px-3 ${
              showMore || splitUi.enabled || watchedTags ? 'border-primary/50 text-primary' : ''
            }`}
            onClick={() => setShowMore((open) => !open)}
            aria-expanded={showMore}
          >
            {showMore ? 'Less' : 'More details'}
          </button>
        </div>

        {showMore && (
          <div className="space-y-3">
            <p className="m-0 text-xs text-muted">Tag, subcategory, split</p>
            <div className="flex gap-2">
              <input
                className="input min-w-0 flex-1"
                value={newSubcategory}
                onChange={(event) => setNewSubcategory(event.target.value)}
                placeholder="Optional subcategory"
                aria-label="New subcategory"
              />
              <button
                type="button"
                className="btn-outline shrink-0"
                disabled={saving || !newSubcategory.trim()}
                onClick={addSubcategory}
              >
                Add
              </button>
            </div>
            <label className="label m-0">
              Tag
              <TagInput
                className="input mt-1 min-h-11"
                value={watchedTags}
                onChange={(next) => setValue('tags', next)}
                placeholder="Tag, e.g. Goa trip"
                aria-label="Tag"
              />
            </label>
            <ExpenseSplitFields
              amount={watchedAmount}
              value={splitUi}
              onChange={setSplitUi}
              onCreateGroup={onOpenGroups}
            />
          </div>
        )}

        {(errors.title || errors.amount) && (
          <p className="text-center text-xs text-danger">
            {errors.title?.message || errors.amount?.message}
          </p>
        )}
        {success && !errors.title && !errors.amount && (
          <p className="mb-0 text-center text-sm text-success">{success}</p>
        )}
      </form>
    </section>
  );
}
