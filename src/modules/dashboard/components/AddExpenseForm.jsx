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
  selectPeopleGroups,
} from '../store/dashboardSlice';
import {
  collectExpenseTags,
  suggestCategoryFromTitle,
} from '../utils/categories';
import TagInput from './TagInput';
import ExpenseSplitFields, { resolveSplitPayload } from './ExpenseSplitFields';

const EMPTY_SPLIT = { enabled: false, groupId: '', paidBy: '', memberIds: [] };

export default function AddExpenseForm({ onGoToMoney }) {
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

  const categoryTouchedRef = useRef(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      amount: '',
      date: filterDate,
      category: categories[0] || 'Miscellaneous',
      tags: '',
      paymentMode: paymentModes[0],
      accountId: defaultAccountId,
    },
  });

  const watchedDate = watch('date') || filterDate;
  const watchedAmount = Number(watch('amount')) || 0;
  const watchedCategory = watch('category') || categories[0];
  const watchedTitle = watch('title') || '';
  const watchedTags = watch('tags') || '';
  const expenseWallet = useSelector((state) => selectMonthWalletStatsByDate(state, watchedDate));
  const projectedRemaining = expenseWallet.remaining - watchedAmount;

  useEffect(() => {
    setValue('date', filterDate);
  }, [filterDate, setValue]);

  useEffect(() => {
    if (!categories?.length) return;
    if (!categories.includes(watchedCategory)) {
      setValue('category', categories[0]);
      categoryTouchedRef.current = false;
    }
  }, [categories, watchedCategory, setValue]);

  useEffect(() => {
    if (!accounts.length) return;
    setValue('accountId', defaultAccountId);
  }, [accounts, defaultAccountId, setValue]);

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
  }, [watchedTitle, mainCategories, subcategoriesMap, watchedCategory, setValue]);

  const handleCategoryChange = (event) => {
    categoryTouchedRef.current = true;
    setValue('category', event.target.value);
  };

  const onSubmit = (data) => {
    const expenseDate = data.date || filterDate;
    if (dayjs(expenseDate).isAfter(dayjs(), 'day')) return;

    const category = data.category || categories[0];
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
        reset({
          title: '',
          amount: '',
          date: expenseDate,
          category: categories.includes(category) ? category : categories[0],
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

          {showBankPicker && (
            <select className="input" {...register('accountId')} aria-label="Paid from">
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            className="input"
            type="date"
            max={dayjs().format('YYYY-MM-DD')}
            {...register('date')}
            aria-label="Date"
          />
          <TagInput
            className="input"
            value={watchedTags}
            onChange={(next) => setValue('tags', next)}
            placeholder="Tag · #trip"
            aria-label="Tag"
          />
        </div>

        <ExpenseSplitFields
          amount={watchedAmount}
          value={splitUi}
          onChange={setSplitUi}
        />

        {expenseWallet.funded > 0 && watchedAmount > 0 && (
          <p
            className={`m-0 rounded-sm border px-3 py-2 text-xs ${
              projectedRemaining < 0
                ? 'border-danger/40 bg-danger/10 text-red-200'
                : 'border-edge bg-surface-2 text-muted'
            }`}
          >
            {projectedRemaining < 0
              ? `${formatINR(Math.abs(projectedRemaining))} over budget after this`
              : `${formatINR(projectedRemaining)} left this month after this`}
          </p>
        )}

        {expenseWallet.funded === 0 && watchedAmount > 0 && onGoToMoney && (
          <p className="m-0 rounded-sm border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-yellow-100">
            No income added this month yet.{' '}
            <button
              type="button"
              className="border-0 bg-transparent p-0 font-semibold text-primary underline"
              onClick={onGoToMoney}
            >
              Add income
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
