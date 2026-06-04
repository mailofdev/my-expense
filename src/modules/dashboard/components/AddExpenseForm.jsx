import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import DisclosureToggle from '../../../shared/components/DisclosureToggle';
import {
  addExpense,
  setDayFilter,
  selectFilterDate,
  selectIsTodaySelected,
  updateFinanceSettings,
} from '../store/dashboardSlice';

export default function AddExpenseForm() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, paymentModes, saving } = useSelector((state) => state.dashboard);
  const filterDate = useSelector(selectFilterDate);
  const isToday = useSelector(selectIsTodaySelected);
  const [showDetails, setShowDetails] = useState(false);
  const [newCategory, setNewCategory] = useState('');

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

  useEffect(() => {
    if (categories?.length) {
      setValue('category', categories[0]);
    }
  }, [categories, setValue]);

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

  const handleAddCustomCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const nextCategories = [...categories, trimmed];
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: { categories: nextCategories },
      })
    );
    setValue('category', trimmed);
    setNewCategory('');
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
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="number"
            placeholder="Amount in ₹"
            min="1"
            {...register('amount', {
              required: 'Enter amount',
              min: { value: 1, message: 'Min ₹1' },
            })}
          />
          <button type="submit" className="btn-primary shrink-0 px-6" disabled={saving}>
            {saving ? '…' : 'Add'}
          </button>
        </div>

        {(errors.title || errors.amount) && (
          <p className="text-xs text-red-300">
            {errors.title?.message || errors.amount?.message}
          </p>
        )}

        <DisclosureToggle
          open={showDetails}
          onToggle={() => setShowDetails((v) => !v)}
          title="Category & date"
          hintClosed="Tap to add category, payment & date"
          controlsId="expense-extra-options"
        />

        {showDetails && (
          <div
            id="expense-extra-options"
            className="space-y-2 rounded-sm border border-edge/60 bg-surface-2/40 p-3"
          >
            <label className="label">
              Category
              <select className="input mt-1" {...register('category')}>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <div>
              <p className="label">Add custom category</p>
              <div className="flex gap-2">
                <input
                  className="input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Pets"
                />
                <button
                  type="button"
                  className="btn-outline shrink-0"
                  onClick={handleAddCustomCategory}
                  disabled={!newCategory.trim() || categories.includes(newCategory.trim()) || saving}
                >
                  Add
                </button>
              </div>
            </div>
            <label className="label">
              Payment
              <select className="input mt-1" {...register('paymentMode')}>
                {paymentModes.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Date
              <input type="date" className="input mt-1" {...register('date', { required: true })} />
            </label>
          </div>
        )}
      </form>
    </section>
  );
}
