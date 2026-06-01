import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { addExpense, setDayFilter, selectFilterDate, selectIsTodaySelected } from '../store/dashboardSlice';

export default function AddExpenseForm() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, paymentModes, saving } = useSelector((state) => state.dashboard);
  const filterDate = useSelector(selectFilterDate);
  const isToday = useSelector(selectIsTodaySelected);
  const [showDetails, setShowDetails] = useState(false);

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
        setShowDetails(false);
      }
    });
  };

  return (
    <section className="card card-flat px-4 py-3 sm:px-5">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input
            className="input min-w-0 flex-1 basis-full sm:basis-auto"
            placeholder={isToday ? 'What did you spend on?' : 'Expense title'}
            {...register('title', { required: 'Required' })}
          />
          <input
            className="input w-full sm:w-24"
            type="number"
            placeholder="₹"
            min="1"
            {...register('amount', {
              required: 'Required',
              min: { value: 1, message: 'Min ₹1' },
            })}
          />
          <button type="submit" className="btn-primary min-w-[72px] shrink-0 px-4" disabled={saving}>
            {saving ? '…' : 'Add'}
          </button>
        </div>

        {(errors.title || errors.amount) && (
          <p className="mt-2 text-xs text-red-300">
            {errors.title?.message || errors.amount?.message}
          </p>
        )}

        <button
          type="button"
          className="mt-2 w-full border-0 bg-transparent p-1 text-left text-xs text-muted hover:text-primary"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
        >
          {showDetails ? 'Hide options ⬆' : 'Category, date & payment ⬇'}
        </button>

        {showDetails && (
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-edge pt-3 sm:grid-cols-2">
            <input type="date" className="input sm:col-span-2" {...register('date', { required: true })} />
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
          </div>
        )}
      </form>
    </section>
  );
}
