import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import dayjs from 'dayjs';
import dashboardReducer from '../store/dashboardSlice';
import ExportDataPanel from './ExportDataPanel';

jest.mock('../../../core/config/firebase', () => ({
  auth: {},
  db: {},
}));

const today = dayjs().format('YYYY-MM-DD');

function renderPanel() {
  const base = dashboardReducer(undefined, { type: '@@INIT' });
  const store = configureStore({
    reducer: { dashboard: dashboardReducer },
    preloadedState: {
      dashboard: {
        ...base,
        expenses: [
          {
            id: 'e1',
            title: 'Swiggy',
            amount: 450,
            category: 'Food',
            date: today,
            createdAt: `${today}T10:00:00.000Z`,
          },
          {
            id: 'e2',
            title: 'Groceries',
            amount: 1200,
            category: 'Food',
            date: today,
            tags: ['home'],
            createdAt: `${today}T11:00:00.000Z`,
          },
        ],
        walletTransactions: [
          {
            id: 't1',
            type: 'credit',
            source: 'income',
            amount: 50000,
            note: 'Salary',
            date: today,
            monthKey: dayjs().format('YYYY-MM'),
            createdAt: `${today}T08:00:00.000Z`,
          },
        ],
      },
    },
  });

  return render(
    <Provider store={store}>
      <ExportDataPanel />
    </Provider>
  );
}

describe('ExportDataPanel copy', () => {
  const writeText = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.assign(navigator, { clipboard: { writeText } });
  });

  test('copies every preview row as one line after export view', async () => {
    renderPanel();
    userEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByRole('button', { name: 'Copy selected' })).toBeDisabled();
    userEvent.click(screen.getByRole('button', { name: 'Copy all' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();

    const text = writeText.mock.calls[0][0];
    expect(text).toContain('Income · Salary');
    expect(text).toContain('Expense · Swiggy');
    expect(text).toContain('Expense · Groceries');
    expect(text.split('\n').length).toBeGreaterThan(1);
    expect(text).not.toContain('\t');
  });

  test('copies only checked search rows', async () => {
    renderPanel();
    userEvent.click(screen.getByRole('button', { name: 'Search expenses' }));
    userEvent.type(screen.getByLabelText('Search expenses'), 'food');
    userEvent.click(screen.getByRole('button', { name: 'Preview' }));

    userEvent.click(screen.getByRole('checkbox', { name: 'Select Swiggy' }));
    userEvent.click(screen.getByRole('button', { name: 'Copy selected' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();

    const text = writeText.mock.calls[0][0];
    expect(text).toBe(`${dayjs().format('D MMM YYYY')} · Swiggy · Food & Groceries · Cash · ₹450`);
    expect(text).not.toContain('₹1,200');
    expect(text).not.toContain('\n');
  });
});