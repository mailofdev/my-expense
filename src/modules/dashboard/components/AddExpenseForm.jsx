import { useEffect, useMemo } from 'react';
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
} from '../store/dashboardSlice';

const warnBannerClass = (level) => {
  if (level >= 100) return 'border-danger/40 bg-danger/10 text-red-200';
  if (level >= 90) return 'border-danger/30 bg-danger/10 text-red-100';
  if (level >= 75) return 'border-accent/40 bg-accent/10 text-yellow-100';
  return 'border-primary/30 bg-primary/10 text-[#d7efe6]';
};

export default function AddExpenseForm({ onGoToWallet }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, paymentModes, categoryBudgets, saving } = useSelector(
    (state) => state.dashboard
  );
  const filterDate = useSelector(selectFilterDate);
  const isToday = useSelector(selectIsTodaySelected);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      amount: '',
      date: filterDate,
      category: categories[0],
      paymentMode: paymentModes[0],
    },
  });

  const watchedDate = watch('date') || filterDate;
  const watchedAmount = Number(watch('amount')) || 0;
  const watchedCategory = watch('category') || categories[0];
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

  useEffect(() => {
    setValue('date', filterDate);
  }, [filterDate, setValue]);

  useEffect(() => {
    if (!categories?.length) return;
    // Keep the user's selection when it still exists; only fall back if removed.
    if (!categories.includes(watchedCategory)) {
      setValue('category', categories[0]);
    }
  }, [categories, watchedCategory, setValue]);

  const submitExpense = (data) => {
    const expenseDate = data.date || filterDate;
    dispatch(
      addExpense({
        uid: user.uid,
        expense: {
          title: data.title,
          amount: Number(data.amount),
          category: data.category,
          paymentMode: data.paymentMode || paymentModes[0],
          date: expenseDate,
        },
      })
    ).then((result) => {
      if (!result.error) {
        if (expenseDate !== filterDate) {
          dispatch(setDayFilter({ date: expenseDate }));
        }
        reset({
          title: '',
          amount: '',
          date: expenseDate,
          category: categories.includes(data.category) ? data.category : categories[0],
          paymentMode: paymentModes[0],
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

      // Warn when crossing a new threshold, or when already at/over 100%.
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
          placeholder={isToday ? 'What did you spend on?' : 'Expense name'}
          {...register('title', { required: 'Enter a name' })}
        />

        <select className="input" {...register('category')}>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

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
