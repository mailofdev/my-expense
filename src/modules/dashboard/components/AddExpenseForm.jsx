import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { addExpense, setDayFilter, selectFilterDate, selectIsTodaySelected } from '../store/dashboardSlice';

export default function AddExpenseForm() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, paymentModes, saving } = useSelector((state) => state.dashboard);
  const filterDate = useSelector(selectFilterDate);
  const isToday = useSelector(selectIsTodaySelected);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      amount: '',
      date: filterDate,
      category: categories[0],
      paymentMode: paymentModes[0],
    },
  });

  useEffect(() => {
    setValue('date', filterDate);
  }, [filterDate, setValue]);

  const onSubmit = (data) => {
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

  return (
    <section className="add-expense card">
      <h3>{isToday ? "Log today's expense" : 'Log expense for selected day'}</h3>
      <p className="card__desc">Record each payment as it happens — day by day</p>
      <form className="add-expense__form" onSubmit={handleSubmit(onSubmit)}>
        <input
          placeholder="What did you spend on?"
          {...register('title', { required: 'Title required' })}
        />
        <input
          type="number"
          placeholder="Amount (₹)"
          min="1"
          {...register('amount', {
            required: 'Amount required',
            min: { value: 1, message: 'Min ₹1' },
          })}
        />
        <input type="date" {...register('date', { required: 'Date required' })} />
        <select {...register('category')}>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select {...register('paymentMode')}>
          {paymentModes.map((mode) => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving...' : 'Add to this day'}
        </button>
      </form>
      {(errors.title || errors.amount) && (
        <p className="form-field__error">
          {errors.title?.message || errors.amount?.message}
        </p>
      )}
    </section>
  );
}
