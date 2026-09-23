import { useEffect, useRef, useState } from 'react';
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
} from '../store/dashboardSlice';
import {
  collectExpenseTags,
  suggestCategoryFromTitle,
  shortCategoryLabel,
  DEFAULT_EXPENSE_CATEGORY,
} from '../utils/categories';
import TagInput from './TagInput';
import ExpenseSplitFields, { resolveSplitPayload } from './ExpenseSplitFields';
import { formatAccountOptionLabel, isSetAsideAccount } from '../utils/accounts';

const EMPTY_SPLIT = { enabled: false, groupId: '', paidBy: '', memberIds: [] };

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

  const categoryTouchedRef = useRef(false);
  const defaultCategory = fallbackCategory(categories);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      amount: '',
      date: filterDate,
      category: defaultCategory,
      tags: '',
      paymentMode: paymentModes[0],
      accountId: defaultAccountId,
    },
  });

  const watchedDate = watch('date') || filterDate;
  const watchedAmount = Number(watch('amount')) || 0;
  const watchedCategory = watch('category') || defaultCategory;
  const watchedTitle = watch('title') || '';
  const watchedTags = watch('tags') || '';
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
    setValue('accountId', defaultAccountId);
  }, [accounts, defaultAccountId, setValue]);

  useEffect(() => {
    if (categoryTouchedRef.current) {
      setSuggestedCategory('');
      return;
    }
    const suggestion = suggestCategoryFromTitle(
      watchedTitle,
      mainCategories,
      subcategoriesMap
    );
    if (suggestion?.category && suggestion.category !== watchedCategory) {
      setSuggestedCategory(suggestion.category);
      return;
    }
    setSuggestedCategory('');
  }, [watchedTitle, mainCategories, subcategoriesMap, watchedCategory]);

  const handleCategoryChange = (event) => {
    categoryTouchedRef.current = true;
    setSuggestedCategory('');
    setValue('category', event.target.value);
  };

  const applySuggestion = () => {
    if (!suggestedCategory) return;
    setValue('category', suggestedCategory);
    categoryTouchedRef.current = true;
    setSuggestedCategory('');
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
          subcategory: '',
          tags,
          paymentMode: paymentModes[0],
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
          tags: '',
          paymentMode: paymentModes[0],
          accountId: defaultAccountId,
        });
      }
    });
  };

  return (
    <section className="card">
      <h2 className="card-title mb-1">Add expense</h2>
      <p className="m-0 mb-3 text-sm text-muted">Log what you spent.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <input
          className="input"
          placeholder={isToday ? 'What did you buy?' : 'Expense name'}
          {...register('title', { required: 'Enter a name' })}
        />

        <input
          className="input"
          type="number"
          placeholder="Amount ₹"
          min="1"
          {...register('amount', {
            required: 'Enter amount',
            min: { value: 1, message: 'Min ₹1' },
          })}
        />

        <div className={`grid gap-2 ${showBankPicker ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <label className="label m-0">
            Category
            <select
              className="input mt-1"
              value={watchedCategory}
              onChange={handleCategoryChange}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{shortCategoryLabel(cat)}</option>
              ))}
            </select>
          </label>

          {showBankPicker && (
            <label className="label m-0">
              Paid from
              <select className="input mt-1" {...register('accountId')}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {formatAccountOptionLabel(account)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {suggestedCategory && (
          <button
            type="button"
            className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
            onClick={applySuggestion}
          >
            Suggested: {shortCategoryLabel(suggestedCategory)}
          </button>
        )}

        {!isToday && (
          <p className="m-0 text-xs text-muted">Saving for {dayjs(watchedDate).format('D MMM')}</p>
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
            <p className="m-0 text-xs text-muted">Date, tag, split</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="label m-0">
                Date
                <input
                  className="input mt-1"
                  type="date"
                  max={dayjs().format('YYYY-MM-DD')}
                  {...register('date')}
                />
              </label>
              <label className="label m-0">
                Tag
                <TagInput
                  className="input mt-1"
                  value={watchedTags}
                  onChange={(next) => setValue('tags', next)}
                  placeholder="Tag, e.g. Goa trip"
                  aria-label="Tag"
                />
              </label>
            </div>
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
