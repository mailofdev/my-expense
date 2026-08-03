import { useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';
import { isInMonthYear } from '../../../core/utils/date';
import { getAccountById, getDefaultAccountId } from '../utils/accounts';
import AddIncomeForm from './AddIncomeForm';
import TransferForm from './TransferForm';
import {
  selectFilterMonthKey,
  selectFilteredMonthLabel,
  selectMonthWalletFunded,
  selectMonthWalletRemaining,
  selectMonthWalletUsagePercent,
  selectMonthExpenses,
  selectMonthIncome,
  selectAccountsWithBalances,
  selectAccounts,
} from '../store/dashboardSlice';

export default function WalletTracker() {
  const { walletTransactions } = useSelector((state) => state.dashboard);
  const accounts = useSelector(selectAccounts);
  const { accounts: accountsWithBal, total: accountsTotal } = useSelector(selectAccountsWithBalances);
  const monthKey = useSelector(selectFilterMonthKey);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const monthFunded = useSelector(selectMonthWalletFunded);
  const monthRemaining = useSelector(selectMonthWalletRemaining);
  const walletUsagePercent = useSelector(selectMonthWalletUsagePercent);
  const monthExpenses = useSelector(selectMonthExpenses);
  const monthIncome = useSelector(selectMonthIncome);
  const monthSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const filter = useSelector((state) => ({
    month: state.dashboard.filterMonth,
    year: state.dashboard.filterYear,
  }));
  const defaultAccountId = getDefaultAccountId(accounts);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const monthTransactions = walletTransactions.filter((tx) => {
    const dateStr = tx.createdAt?.slice(0, 10);
    return (
      tx.monthKey === monthKey ||
      (!tx.monthKey && isInMonthYear(dateStr, filter.month, filter.year))
    );
  });

  const recentActivity = [
    ...monthTransactions.map((tx) => {
      if (tx.type === 'transfer') {
        const from = getAccountById(accounts, tx.fromAccountId)?.name || 'Account';
        const to = getAccountById(accounts, tx.toAccountId)?.name || 'Account';
        return {
          id: `tx-${tx.id}`,
          type: 'transfer',
          amount: tx.amount,
          label: `${from} → ${to}`,
          date: tx.createdAt,
        };
      }
      const accountName = getAccountById(accounts, tx.accountId || defaultAccountId)?.name;
      return {
        id: `tx-${tx.id}`,
        type: tx.type,
        amount: tx.amount,
        label: `${tx.note || (tx.source === 'income' ? 'Income' : 'Added')}${
          accountName ? ` · ${accountName}` : ''
        }`,
        date: tx.createdAt,
      };
    }),
    ...monthExpenses.slice(0, 6).map((e) => {
      const accountName = getAccountById(accounts, e.accountId || defaultAccountId)?.name;
      return {
        id: `exp-${e.id}`,
        type: 'debit',
        amount: e.amount,
        label: `${e.title}${accountName ? ` · ${accountName}` : ''}`,
        date: e.date,
      };
    }),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  const barPercent = monthFunded > 0 ? Math.min(100, walletUsagePercent) : 0;

  return (
    <div className="feature-panel">
      <section className="card text-center">
        <p className="section-label m-0">{monthLabel}</p>
        <p
          className={`text-glow m-0 mt-1 text-[clamp(1.75rem,8vw,2.5rem)] font-bold ${
            monthFunded > 0 && monthRemaining < 0
              ? 'text-danger'
              : monthFunded > 0
                ? 'text-primary'
                : 'text-muted'
          }`}
        >
          {monthFunded > 0 ? formatINR(monthRemaining) : formatINR(0)}
        </p>
        <p className="m-0 mt-1 text-sm text-muted">
          {monthFunded > 0 ? 'left to spend' : 'Add money below to start'}
        </p>

        {monthFunded > 0 && (
          <div className="mx-auto mt-4 max-w-xs">
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-all ${
                  monthRemaining < 0
                    ? 'bg-danger'
                    : walletUsagePercent >= 80
                      ? 'bg-accent'
                      : 'bg-primary'
                }`}
                style={{ width: `${barPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>In {formatINR(monthIncome || monthFunded)}</span>
              <span>Out {formatINR(monthSpent)}</span>
            </div>
          </div>
        )}
      </section>

      <AddIncomeForm />

      <section className="card">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="card-title mb-0">Banks</h2>
          <p className="m-0 text-sm font-semibold text-primary">{formatINR(accountsTotal)}</p>
        </div>
        <ul className="m-0 list-none space-y-0 p-0">
          {accountsWithBal.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-3 border-t border-edge/50 py-3 first:border-0 first:pt-0"
            >
              <p className="m-0 text-sm font-medium">{account.name}</p>
              <span
                className={`text-sm font-semibold ${
                  account.balance < 0 ? 'text-danger' : 'text-[#f0f4f2]'
                }`}
              >
                {formatINR(account.balance)}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="mt-3 border-0 bg-transparent p-0 text-xs font-semibold text-primary"
          onClick={() => setShowTransfer((prev) => !prev)}
        >
          {showTransfer ? 'Hide transfer' : 'Transfer between banks'}
        </button>
        {showTransfer && (
          <div className="mt-3">
            <TransferForm />
          </div>
        )}
      </section>

      {recentActivity.length > 0 && (
        <section className="card">
          <button
            type="button"
            className="flex w-full items-center justify-between border-0 bg-transparent p-0 text-left"
            onClick={() => setShowActivity((prev) => !prev)}
          >
            <h2 className="card-title mb-0">Recent activity</h2>
            <span className="text-xs font-semibold text-primary">
              {showActivity ? 'Hide' : 'Show'}
            </span>
          </button>
          {showActivity && (
            <ul className="m-0 mt-3 list-none space-y-0 p-0">
              {recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-t border-edge/50 py-3 first:border-0 first:pt-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-sm">{item.label}</p>
                    <p className="m-0 text-xs text-muted">{dayjs(item.date).format('D MMM')}</p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      item.type === 'credit'
                        ? 'text-success'
                        : item.type === 'transfer'
                          ? 'text-muted'
                          : 'text-[#f0f4f2]'
                    }`}
                  >
                    {item.type === 'credit' ? '+' : item.type === 'transfer' ? '↔' : '−'}
                    {formatINR(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
