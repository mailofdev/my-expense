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
    <section className="quick-add card card--flat">
      <form className="quick-add__form" onSubmit={handleSubmit(onSubmit)}>
        <div className="quick-add__row">
          <input
            className="quick-add__title"
            placeholder={isToday ? 'What did you spend on?' : 'Expense title'}
            {...register('title', { required: 'Required' })}
          />
          <input
            className="quick-add__amount"
            type="number"
            placeholder="₹"
            min="1"
            {...register('amount', {
              required: 'Required',
              min: { value: 1, message: 'Min ₹1' },
            })}
          />
          <button type="submit" className="btn btn--primary quick-add__submit" disabled={saving}>
            {saving ? '…' : 'Add'}
          </button>
        </div>

        {(errors.title || errors.amount) && (
          <p className="form-field__error">
            {errors.title?.message || errors.amount?.message}
          </p>
        )}

        <button
          type="button"
          className="quick-add__toggle"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
        >
          {showDetails ? 'Hide options' : 'Category, date & payment'}
        </button>

        {showDetails && (
          <div className="quick-add__details">
            <input type="date" {...register('date', { required: true })} />
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
          </div>
        )}
      </form>
    </section>
  );
}
