import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import {
  getCategoryLimitLevel,
  getCategoryLimitPercent,
  getCategoryLimitWarningText,
} from '../../../core/constants/finance';
import {
  addExpense,
  setDayFilter,
  selectFilterDate,
  selectIsTodaySelected,
  selectMonthWalletStatsByDate,
  selectCategorySpentByDate,
  selectAccounts,
  selectDefaultAccountId,
  selectVisibleCategories,
  selectMainCategories,
  selectSubcategories,
  updateFinanceSettings,
} from '../store/dashboardSlice';
import {
  collectExpenseTags,
  getMainByName,
  getSubcategoriesForMain,
  MAX_SUBCATEGORIES_PER_MAIN,
  suggestCategoryFromTitle,
} from '../utils/categories';

const warnBannerClass = (level) => {
  if (level >= 100) return 'border-danger/40 bg-danger/10 text-red-200';
  if (level >= 90) return 'border-danger/30 bg-danger/10 text-red-100';
  if (level >= 75) return 'border-accent/40 bg-accent/10 text-yellow-100';
  return 'border-primary/30 bg-primary/10 text-[#d7efe6]';
};

export default function AddExpenseForm({ onGoToWallet }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { paymentModes, categoryBudgets, saving } = useSelector((state) => state.dashboard);
  const categories = useSelector(selectVisibleCategories);
  const mainCategories = useSelector(selectMainCategories);
  const subcategoriesMap = useSelector(selectSubcategories);
  const accounts = useSelector(selectAccounts);
  const defaultAccountId = useSelector(selectDefaultAccountId);
  const filterDate = useSelector(selectFilterDate);
  const isToday = useSelector(selectIsTodaySelected);

  const categoryTouchedRef = useRef(false);
  const [showMore, setShowMore] = useState(false);
  const [suggestionHint, setSuggestionHint] = useState('');
  const [newSubName, setNewSubName] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      amount: '',
      date: filterDate,
      category: categories[0] || 'Miscellaneous',
      subcategory: '',
      tags: '',
      paymentMode: paymentModes[0],
      accountId: defaultAccountId,
    },
  });

  const watchedDate = watch('date') || filterDate;
  const watchedAmount = Number(watch('amount')) || 0;
  const watchedCategory = watch('category') || categories[0];
  const watchedSubcategory = watch('subcategory') || '';
  const watchedTitle = watch('title') || '';
  const watchedAccountId = watch('accountId');
  const expenseWallet = useSelector((state) => selectMonthWalletStatsByDate(state, watchedDate));
  const categorySpent = useSelector((state) =>
    selectCategorySpentByDate(state, watchedCategory, watchedDate)
  );
  const projectedRemaining = expenseWallet.remaining - watchedAmount;

  const categoryLimit = Number(categoryBudgets?.[watchedCategory]) || 0;
  const projectedCategorySpent = categorySpent + watchedAmount;
  const categoryLevel = useMemo(
    () => getCategoryLimitLevel(projectedCategorySpent, categoryLimit),
    [projectedCategorySpent, categoryLimit]
  );
  const categoryPercent = useMemo(
    () => getCategoryLimitPercent(projectedCategorySpent, categoryLimit),
    [projectedCategorySpent, categoryLimit]
  );

  const selectedMain = useMemo(
    () => getMainByName(mainCategories, watchedCategory),
    [mainCategories, watchedCategory]
  );
  const subcategoryOptions = useMemo(
    () => getSubcategoriesForMain(subcategoriesMap, selectedMain?.id),
    [subcategoriesMap, selectedMain]
  );

  useEffect(() => {
    setValue('date', filterDate);
  }, [filterDate, setValue]);

  useEffect(() => {
    if (!categories?.length) return;
    if (!categories.includes(watchedCategory)) {
      setValue('category', categories[0]);
      setValue('subcategory', '');
      categoryTouchedRef.current = false;
    }
  }, [categories, watchedCategory, setValue]);

  useEffect(() => {
    if (!accounts.length) return;
    if (!accounts.some((a) => a.id === watchedAccountId)) {
      setValue('accountId', defaultAccountId);
    }
  }, [accounts, defaultAccountId, setValue, watchedAccountId]);

  // Smart category suggestion from title keywords (only until user picks manually).
  useEffect(() => {
    if (categoryTouchedRef.current) {
      setSuggestionHint('');
      return;
    }
    const suggestion = suggestCategoryFromTitle(
      watchedTitle,
      mainCategories,
      subcategoriesMap
    );
    if (!suggestion) {
      setSuggestionHint('');
      return;
    }
    if (suggestion.category !== watchedCategory) {
      setValue('category', suggestion.category);
    }
    if (suggestion.subcategory) {
      setValue('subcategory', suggestion.subcategory);
    }
    setSuggestionHint(
      suggestion.subcategory
        ? `Suggested: ${suggestion.category} · ${suggestion.subcategory}`
        : `Suggested: ${suggestion.category}`
    );
  }, [watchedTitle, mainCategories, subcategoriesMap, watchedCategory, setValue]);

  useEffect(() => {
    if (!watchedSubcategory) return;
    if (!subcategoryOptions.includes(watchedSubcategory)) {
      setValue('subcategory', '');
    }
  }, [subcategoryOptions, watchedSubcategory, setValue]);

  const handleCategoryChange = (event) => {
    categoryTouchedRef.current = true;
    setSuggestionHint('');
    setValue('category', event.target.value);
    setValue('subcategory', '');
  };

  const handleCreateSubcategory = () => {
    const trimmed = newSubName.trim();
    if (!trimmed || !selectedMain || !user?.uid) return;
    if (subcategoryOptions.length >= MAX_SUBCATEGORIES_PER_MAIN) return;
    if (subcategoryOptions.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setValue('subcategory', subcategoryOptions.find(
        (item) => item.toLowerCase() === trimmed.toLowerCase()
      ));
      setNewSubName('');
      return;
    }

    const nextSubs = {
      ...subcategoriesMap,
      [selectedMain.id]: [...subcategoryOptions, trimmed],
    };
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: { mainCategories, subcategories: nextSubs },
      })
    ).then((result) => {
      if (!result.error) {
        setValue('subcategory', trimmed);
        setNewSubName('');
      }
    });
  };

  const submitExpense = (data) => {
    const expenseDate = data.date || filterDate;
    const tags = collectExpenseTags(data.title, data.tags);
    dispatch(
      addExpense({
        uid: user.uid,
        expense: {
          title: data.title,
          amount: Number(data.amount),
          category: data.category,
          subcategory: data.subcategory || '',
          tags,
          paymentMode: data.paymentMode || paymentModes[0],
          accountId: data.accountId || defaultAccountId,
          date: expenseDate,
        },
      })
    ).then((result) => {
      if (!result.error) {
        if (expenseDate !== filterDate) {
          dispatch(setDayFilter({ date: expenseDate }));
        }
        categoryTouchedRef.current = false;
        setSuggestionHint('');
        setShowMore(false);
        setNewSubName('');
        reset({
          title: '',
          amount: '',
          date: expenseDate,
          category: categories.includes(data.category) ? data.category : categories[0],
          subcategory: '',
          tags: '',
          paymentMode: paymentModes[0],
          accountId: data.accountId || defaultAccountId,
        });
      }
    });
  };

  const onSubmit = (data) => {
    const expenseDate = data.date || filterDate;
    if (dayjs(expenseDate).isAfter(dayjs(), 'day')) return;

    const amount = Number(data.amount);
    const category = data.category || categories[0];
    const remainingAfter = expenseWallet.remaining - amount;

    if (expenseWallet.funded === 0) {
      const proceed = window.confirm(
        `${expenseWallet.monthLabel} wallet is not funded yet.\n\nAdd this expense anyway? You can fund the wallet later from the Wallet tab.`
      );
      if (!proceed) return;
    } else if (remainingAfter < 0) {
      const proceed = window.confirm(
        `This will exceed your ${expenseWallet.monthLabel} wallet by ${formatINR(Math.abs(remainingAfter))}.\n\nAdd expense anyway?`
      );
      if (!proceed) return;
    }

    const limit = Number(categoryBudgets?.[category]) || 0;
    if (limit > 0) {
      const currentSpent = categorySpent;
      const after = currentSpent + amount;
      const beforeLevel = getCategoryLimitLevel(currentSpent, limit);
      const afterLevel = getCategoryLimitLevel(after, limit);

      if (afterLevel != null && (afterLevel !== beforeLevel || afterLevel >= 100)) {
        const proceed = window.confirm(
          `${getCategoryLimitWarningText(category, afterLevel, after, limit)}\n\nAdd expense anyway?`
        );
        if (!proceed) return;
      }
    }

    submitExpense({ ...data, category, date: expenseDate });
  };

  return (
    <section className="card">
      <h2 className="card-title mb-3">Add expense</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <input
          className="input"
          placeholder={isToday ? 'What did you spend on? (try “tea” or #family)' : 'Expense name'}
          {...register('title', { required: 'Enter a name' })}
        />

        <input
          className="input"
          type="number"
          placeholder="Amount in ₹"
          min="1"
          {...register('amount', {
            required: 'Enter amount',
            min: { value: 1, message: 'Min ₹1' },
          })}
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <select
              className="input"
              value={watchedCategory}
              onChange={handleCategoryChange}
              aria-label="Category"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {suggestionHint && (
              <p className="mb-0 mt-1 text-[11px] text-muted">{suggestionHint}</p>
            )}
          </div>

          <select className="input" {...register('accountId')} aria-label="Paid from account">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                From {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="input"
            {...register('subcategory')}
            aria-label="Subcategory (optional)"
          >
            <option value="">No subcategory</option>
            {subcategoryOptions.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input
              className="input py-2 text-sm"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              placeholder="New subcategory"
              aria-label="Create subcategory"
              disabled={saving || subcategoryOptions.length >= MAX_SUBCATEGORIES_PER_MAIN}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateSubcategory();
                }
              }}
            />
            <button
              type="button"
              className="btn-outline shrink-0"
              onClick={handleCreateSubcategory}
              disabled={!newSubName.trim() || saving}
            >
              Add
            </button>
          </div>
        </div>

        <button
          type="button"
          className="border-0 bg-transparent p-0 text-xs font-semibold text-primary"
          onClick={() => setShowMore((prev) => !prev)}
        >
          {showMore ? 'Hide tags & date' : 'Tags & date'}
        </button>

        {showMore && (
          <div className="space-y-2">
            <input
              className="input"
              placeholder="Tags — #family #friend"
              {...register('tags')}
              aria-label="Tags"
            />
            <input
              className="input"
              type="date"
              max={dayjs().format('YYYY-MM-DD')}
              {...register('date')}
              aria-label="Date"
            />
          </div>
        )}

        {categoryLimit > 0 && watchedAmount > 0 && categoryLevel != null && (
          <p className={`m-0 rounded-sm border px-3 py-2 text-xs ${warnBannerClass(categoryLevel)}`}>
            {getCategoryLimitWarningText(
              watchedCategory,
              categoryLevel,
              projectedCategorySpent,
              categoryLimit
            )}{' '}
            ({categoryPercent}% after this)
          </p>
        )}

        {categoryLimit > 0 && watchedAmount > 0 && categoryLevel == null && (
          <p className="m-0 rounded-sm border border-edge bg-surface-2 px-3 py-2 text-xs text-muted">
            {watchedCategory}: {formatINR(projectedCategorySpent)} / {formatINR(categoryLimit)} after
            this
          </p>
        )}

        {(expenseWallet.funded > 0 || watchedAmount > 0) && (
          <p
            className={`m-0 rounded-sm border px-3 py-2 text-xs ${
              projectedRemaining < 0
                ? 'border-danger/40 bg-danger/10 text-red-200'
                : expenseWallet.funded === 0
                  ? 'border-accent/40 bg-accent/10 text-yellow-100'
                  : 'border-edge bg-surface-2 text-muted'
            }`}
          >
            {expenseWallet.funded === 0 ? (
              <>
                {expenseWallet.monthLabel} wallet not funded.{' '}
                {onGoToWallet && (
                  <button
                    type="button"
                    className="border-0 bg-transparent p-0 font-semibold text-primary underline"
                    onClick={onGoToWallet}
                  >
                    Add income
                  </button>
                )}
              </>
            ) : (
              <>
                {expenseWallet.monthLabel} wallet: {formatINR(Math.max(0, projectedRemaining))} left after this
              </>
            )}
          </p>
        )}

        <div className="flex justify-center">
          <button type="submit" className="btn-primary px-10" disabled={saving}>
            {saving ? '…' : 'Add'}
          </button>
        </div>

        {(errors.title || errors.amount) && (
          <p className="text-center text-xs text-red-300">
            {errors.title?.message || errors.amount?.message}
          </p>
        )}
      </form>
    </section>
  );
}
