import dayjs from 'dayjs';
import { isInDateRange } from '../../../core/utils/date';

const COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'paymentMode', label: 'Payment mode' },
];

const escapeCsvCell = (value) => {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const filterExpensesByDateRange = (expenses, startDate, endDate) =>
  (expenses || [])
    .filter((expense) => isInDateRange(expense.date, startDate, endDate))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title?.localeCompare(b.title || '') || 0);

export const buildExpenseCsv = (expenses) => {
  const header = COLUMNS.map((col) => escapeCsvCell(col.label)).join(',');
  const rows = expenses.map((expense) =>
    COLUMNS.map((col) => {
      if (col.key === 'amount') return escapeCsvCell(Number(expense.amount) || 0);
      return escapeCsvCell(expense[col.key] ?? '');
    }).join(',')
  );
  return [header, ...rows].join('\n');
};

export const downloadExpenseCsv = (expenses, startDate, endDate) => {
  const csv = buildExpenseCsv(expenses);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const from = dayjs(startDate).format('YYYY-MM-DD');
  const to = dayjs(endDate).format('YYYY-MM-DD');
  link.href = url;
  link.download = `expenses_${from}_to_${to}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
