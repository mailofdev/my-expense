import { useEffect } from 'react';
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
} from '../store/dashboardSlice';

export default function AddExpenseForm({ onGoToWallet }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, paymentModes, saving } = useSelector((state) => state.dashboard);
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
  const expenseWallet = useSelector((state) => selectMonthWalletStatsByDate(state, watchedDate));
  const projectedRemaining = expenseWallet.remaining - watchedAmount;

  useEffect(() => {
    setValue('date', filterDate);
  }, [filterDate, setValue]);

  useEffect(() => {
    if (categories?.length) {
      setValue('category', categories[0]);
    }
  }, [categories, setValue]);

  const submitExpense = (data) => {
    dispatch(
      addExpense({
        uid: user.uid,
        expense: {
          title: data.title,
          amount: Number(data.amount),
          category: data.category,
          paymentMode: data.paymentMode,
          date: data.date,
        },
      })
    ).then((result) => {
      if (!result.error) {
        if (data.date !== filterDate) {
          dispatch(setDayFilter({ date: data.date }));
        }
        reset({
          title: '',
          amount: '',
          date: data.date,
          category: categories[0],
          paymentMode: paymentModes[0],
        });
      }
    });
  };

  const onSubmit = (data) => {
    if (dayjs(data.date).isAfter(dayjs(), 'day')) return;

    const amount = Number(data.amount);
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

    submitExpense(data);
  };

  return (
    <section className="card">
      <h2 className="card-title">Add expense</h2>
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

        <select className="input" {...register('paymentMode')}>
          {paymentModes.map((mode) => (
            <option key={mode} value={mode}>{mode}</option>
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
                    Fund wallet
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
