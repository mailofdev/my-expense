import dayjs from 'dayjs';
import { isInDateRange } from '../../../core/utils/date';
import { getAccountById, getDefaultAccountId } from './accounts';
import { resolveLedgerDayKey, toMillis } from './moneyFlows';
import { normalizeTags, resolveMainCategoryName } from './categories';

const COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'account', label: 'Account' },
  { key: 'amount', label: 'Amount' },
];

const escapeCsvCell = (value) => {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/** Build income, expense, and transfer rows for a date range (same content as Money history). */
export const buildLedgerRows = ({
  expenses = [],
  walletTransactions = [],
  accounts = [],
  mainCategories = [],
  startDate,
  endDate,
}) => {
  const defaultAccountId = getDefaultAccountId(accounts);
  const inRange = (dayKey) => isInDateRange(dayKey, startDate, endDate);
  const rows = [];

  (walletTransactions || []).forEach((tx) => {
    const dayKey = resolveLedgerDayKey(tx);
    if (!inRange(dayKey)) return;

    if (tx.type === 'transfer') {
      const from = getAccountById(accounts, tx.fromAccountId)?.name || 'Bank';
      const to = getAccountById(accounts, tx.toAccountId)?.name || 'Bank';
      const note = tx.note && tx.note !== 'Transfer' ? ` · ${tx.note}` : '';
      rows.push({
        date: dayKey,
        type: 'Transfer',
        description: `${from} → ${to}${note}`,
        category: '',
        account: `${from} → ${to}`,
        amount: Number(tx.amount) || 0,
        sortTime: toMillis(tx.createdAt),
        sortId: String(tx.id || ''),
      });
      return;
    }

    if (tx.type === 'credit') {
      const accountName = getAccountById(accounts, tx.accountId || defaultAccountId)?.name || '';
      const label = tx.note || (tx.source === 'income' ? 'Income' : 'Added');
      rows.push({
        date: dayKey,
        type: 'Income',
        description: accountName ? `${label} · ${accountName}` : label,
        category: '',
        account: accountName,
        amount: Number(tx.amount) || 0,
        sortTime: toMillis(tx.createdAt),
        sortId: String(tx.id || ''),
      });
    }
  });

  (expenses || []).forEach((expense) => {
    const dayKey = resolveLedgerDayKey(expense);
    if (!inRange(dayKey)) return;

    const accountName = getAccountById(accounts, expense.accountId || defaultAccountId)?.name || '';
    const category = resolveMainCategoryName(expense.category, mainCategories);
    rows.push({
      date: dayKey,
      type: 'Expense',
      description: accountName ? `${expense.title} · ${accountName}` : expense.title || '',
      category,
      account: accountName,
      amount: Number(expense.amount) || 0,
      sortTime: toMillis(expense.createdAt),
      sortId: String(expense.id || ''),
    });
  });

  return rows.sort((a, b) => {
    const byDay = a.date.localeCompare(b.date);
    if (byDay !== 0) return byDay;
    if (a.sortTime !== b.sortTime) return a.sortTime - b.sortTime;
    return a.sortId.localeCompare(b.sortId);
  });
};

export const filterLedgerByDateRange = (params) => buildLedgerRows(params);

/** @deprecated Use buildLedgerCsv */
export const filterExpensesByDateRange = (expenses, startDate, endDate) =>
  buildLedgerRows({ expenses, walletTransactions: [], accounts: [], mainCategories: [], startDate, endDate })
    .filter((row) => row.type === 'Expense');

export const buildLedgerCsv = (rows) => {
  const header = COLUMNS.map((col) => escapeCsvCell(col.label)).join(',');
  const body = rows.map((row) =>
    COLUMNS.map((col) => {
      if (col.key === 'amount') return escapeCsvCell(Number(row.amount) || 0);
      return escapeCsvCell(row[col.key] ?? '');
    }).join(',')
  );
  return [header, ...body].join('\n');
};

/** @deprecated Use buildLedgerCsv */
export const buildExpenseCsv = (expenses) =>
  buildLedgerCsv(
    (expenses || []).map((expense) => ({
      date: expense.date,
      type: 'Expense',
      description: expense.title || '',
      category: expense.category || '',
      account: expense.accountId || '',
      amount: Number(expense.amount) || 0,
    }))
  );

export const summarizeLedgerRows = (rows) => {
  const summary = {
    total: rows.length,
    income: 0,
    expenses: 0,
    transfers: 0,
    incomeTotal: 0,
    expenseTotal: 0,
    transferTotal: 0,
  };

  rows.forEach((row) => {
    const amount = Number(row.amount) || 0;
    if (row.type === 'Income') {
      summary.income += 1;
      summary.incomeTotal += amount;
    } else if (row.type === 'Expense') {
      summary.expenses += 1;
      summary.expenseTotal += amount;
    } else if (row.type === 'Transfer') {
      summary.transfers += 1;
      summary.transferTotal += amount;
    }
  });

  return summary;
};

export const downloadLedgerCsv = (rows, startDate, endDate) => {
  const csv = buildLedgerCsv(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const from = dayjs(startDate).format('YYYY-MM-DD');
  const to = dayjs(endDate).format('YYYY-MM-DD');
  link.href = url;
  link.download = `money_history_${from}_to_${to}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const SEARCH_EXPORT_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category' },
  { key: 'tags', label: 'Tags' },
  { key: 'account', label: 'Account' },
  { key: 'amount', label: 'Amount' },
];

/** Build CSV rows from Find expenses search results (includes tags). */
export const buildSearchExportRows = ({
  expenses = [],
  accounts = [],
  mainCategories = [],
}) => {
  const defaultAccountId = getDefaultAccountId(accounts);
  return (expenses || []).map((expense) => {
    const accountName =
      getAccountById(accounts, expense.accountId || defaultAccountId)?.name || '';
    const tags = normalizeTags(expense.tags);
    return {
      date: resolveLedgerDayKey(expense) || expense.date || '',
      title: expense.title || '',
      category: resolveMainCategoryName(expense.category, mainCategories),
      tags: tags.map((tag) => `#${tag}`).join(' '),
      account: accountName,
      amount: Number(expense.amount) || 0,
    };
  });
};

export const buildSearchExportCsv = (rows) => {
  const header = SEARCH_EXPORT_COLUMNS.map((col) => escapeCsvCell(col.label)).join(',');
  const body = rows.map((row) =>
    SEARCH_EXPORT_COLUMNS.map((col) => {
      if (col.key === 'amount') return escapeCsvCell(Number(row.amount) || 0);
      return escapeCsvCell(row[col.key] ?? '');
    }).join(',')
  );
  return [header, ...body].join('\n');
};

export const downloadSearchResultsCsv = ({
  expenses = [],
  accounts = [],
  mainCategories = [],
  query = '',
}) => {
  const rows = buildSearchExportRows({ expenses, accounts, mainCategories });
  const csv = buildSearchExportCsv(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeQuery = String(query || 'results')
    .trim()
    .replace(/^#+/, '')
    .replace(/[^\w-]+/g, '_')
    .slice(0, 40) || 'results';
  link.href = url;
  link.download = `expenses_${safeQuery}_${dayjs().format('YYYY-MM-DD')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
