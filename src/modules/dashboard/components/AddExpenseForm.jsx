import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
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
} from '../store/dashboardSlice';
import {
  collectExpenseTags,
  getMainByName,
  getSubcategoriesForMain,
  suggestCategoryFromTitle,
} from '../utils/categories';

export default function AddExpenseForm({ onGoToWallet }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { paymentModes, saving } = useSelector((state) => state.dashboard);
  const categories = useSelector(selectVisibleCategories);
  const mainCategories = useSelector(selectMainCategories);
  const subcategoriesMap = useSelector(selectSubcategories);
  const accounts = useSelector(selectAccounts);
  const defaultAccountId = useSelector(selectDefaultAccountId);
  const filterDate = useSelector(selectFilterDate);
  const isToday = useSelector(selectIsTodaySelected);

  const categoryTouchedRef = useRef(false);
  const [showMore, setShowMore] = useState(false);

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
  const watchedTitle = watch('title') || '';
  const watchedAccountId = watch('accountId');
  const expenseWallet = useSelector((state) => selectMonthWalletStatsByDate(state, watchedDate));
  const projectedRemaining = expenseWallet.remaining - watchedAmount;

  const selectedMain = getMainByName(mainCategories, watchedCategory);
  const subcategoryOptions = getSubcategoriesForMain(subcategoriesMap, selectedMain?.id);

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

  useEffect(() => {
    if (categoryTouchedRef.current) return;
    const suggestion = suggestCategoryFromTitle(
      watchedTitle,
      mainCategories,
      subcategoriesMap
    );
    if (!suggestion) return;
    if (suggestion.category !== watchedCategory) {
      setValue('category', suggestion.category);
    }
    if (suggestion.subcategory) {
      setValue('subcategory', suggestion.subcategory);
    }
  }, [watchedTitle, mainCategories, subcategoriesMap, watchedCategory, setValue]);

  const handleCategoryChange = (event) => {
    categoryTouchedRef.current = true;
    setValue('category', event.target.value);
    setValue('subcategory', '');
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
        setShowMore(false);
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
        `No money added for ${expenseWallet.monthLabel} yet.\n\nAdd this expense anyway?`
      );
      if (!proceed) return;
    } else if (remainingAfter < 0) {
      const proceed = window.confirm(
        `This goes ${formatINR(Math.abs(remainingAfter))} over your month.\n\nAdd anyway?`
      );
      if (!proceed) return;
    }

    submitExpense({ ...data, category, date: expenseDate });
  };

  return (
    <section className="card">
      <h2 className="card-title mb-3">Add expense</h2>
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

        <div className="grid grid-cols-2 gap-2">
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

          <select className="input" {...register('accountId')} aria-label="Paid from">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="border-0 bg-transparent p-0 text-xs font-semibold text-primary"
          onClick={() => setShowMore((prev) => !prev)}
        >
          {showMore ? 'Less' : 'More options'}
        </button>

        {showMore && (
          <div className="space-y-2">
            {subcategoryOptions.length > 0 && (
              <select
                className="input"
                {...register('subcategory')}
                aria-label="Subcategory"
              >
                <option value="">No subcategory</option>
                {subcategoryOptions.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            )}
            <input
              className="input"
              placeholder="Tags — #family"
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

        {expenseWallet.funded > 0 && watchedAmount > 0 && (
          <p
            className={`m-0 rounded-sm border px-3 py-2 text-xs ${
              projectedRemaining < 0
                ? 'border-danger/40 bg-danger/10 text-red-200'
                : 'border-edge bg-surface-2 text-muted'
            }`}
          >
            {formatINR(Math.max(0, projectedRemaining))} left this month after this
          </p>
        )}

        {expenseWallet.funded === 0 && watchedAmount > 0 && onGoToWallet && (
          <p className="m-0 rounded-sm border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-yellow-100">
            Month not funded yet.{' '}
            <button
              type="button"
              className="border-0 bg-transparent p-0 font-semibold text-primary underline"
              onClick={onGoToWallet}
            >
              Add money
            </button>
          </p>
        )}

        <button type="submit" className="btn-primary btn-full" disabled={saving}>
          {saving ? '…' : 'Add'}
        </button>

        {(errors.title || errors.amount) && (
          <p className="text-center text-xs text-red-300">
            {errors.title?.message || errors.amount?.message}
          </p>
        )}
      </form>
    </section>
  );
}
