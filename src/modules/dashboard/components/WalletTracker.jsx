import { useState } from "react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import {
  formatINR,
  ledgerAmountClass,
  ledgerTypeLabelClass,
} from "../../../core/utils/currency";
import { isInMonthYear } from "../../../core/utils/date";
import { getAccountById, getDefaultAccountId } from "../utils/accounts";
import { resolveLedgerDayKey, toMillis } from "../utils/moneyFlows";
import AddIncomeForm from "./AddIncomeForm";
import TransferForm from "./TransferForm";
import BankManager from "./BankManager";
import MoneyNextStep from "./MoneyNextStep";
import AllocationPlanner from "./AllocationPlanner";
import RecurringPanel from "./RecurringPanel";
import GoalsPanel from "./GoalsPanel";
import SpendPlanNote from "./SafeToSpend";
import {
  selectFilterMonthKey,
  selectFilteredMonthLabel,
  selectMonthWalletFunded,
  selectMonthWalletRemaining,
  selectMonthWalletUsagePercent,
  selectSetAsideParked,
  selectMonthExpenses,
  selectMonthIncome,
  selectAccountsWithBalances,
  selectAccounts,
} from "../store/dashboardSlice";

export default function WalletTracker({ onGoToHome }) {
  const { walletTransactions } = useSelector((state) => state.dashboard);
  const accounts = useSelector(selectAccounts);
  const {
    accounts: accountsWithBal,
    total: accountsTotal,
    setAsideTotal,
    creditOutstanding,
  } = useSelector(selectAccountsWithBalances);
  const monthKey = useSelector(selectFilterMonthKey);
  const monthLabel = useSelector(selectFilteredMonthLabel);
  const monthFunded = useSelector(selectMonthWalletFunded);
  const monthRemaining = useSelector(selectMonthWalletRemaining);
  const walletUsagePercent = useSelector(selectMonthWalletUsagePercent);
  const setAsideParked = useSelector(selectSetAsideParked);
  const monthExpenses = useSelector(selectMonthExpenses);
  const monthIncome = useSelector(selectMonthIncome);
  const monthSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const filter = useSelector((state) => ({
    month: state.dashboard.filterMonth,
    year: state.dashboard.filterYear,
  }));
  const defaultAccountId = getDefaultAccountId(accounts);
  const [showActivity, setShowActivity] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);

  const isTxInFilteredMonth = (tx) => {
    if (tx.monthKey) return tx.monthKey === monthKey;
    const dayKey = resolveLedgerDayKey(tx);
    return isInMonthYear(dayKey, filter.month, filter.year);
  };

  // Full month ledger, newest day first; within a day, newest action first.
  const monthHistory = [
    ...walletTransactions.filter(isTxInFilteredMonth).map((tx) => {
      const dayKey = resolveLedgerDayKey(tx);
      const sortTime = toMillis(tx.createdAt);
      if (tx.type === "transfer") {
        const from = getAccountById(accounts, tx.fromAccountId)?.name || "Bank";
        const toAcc = getAccountById(accounts, tx.toAccountId);
        const to = toAcc?.name || "Bank";
        const isCardPay = toAcc?.kind === "credit";
        const customNote =
          tx.note && tx.note !== "Transfer" && tx.note !== "Card payment"
            ? ` · ${tx.note}`
            : "";
        return {
          id: `tx-${tx.id}`,
          type: "transfer",
          amount: tx.amount,
          label: isCardPay
            ? `Card payment · ${to}${customNote}`
            : `${from} → ${to}${customNote}`,
          dayKey,
          sortTime,
          sortId: String(tx.id || ""),
          transferKind: isCardPay ? "card_payment" : "transfer",
        };
      }
      const accountName = getAccountById(
        accounts,
        tx.accountId || defaultAccountId,
      )?.name;
      return {
        id: `tx-${tx.id}`,
        type: tx.type === "credit" ? "credit" : tx.type,
        amount: tx.amount,
        label: `${tx.note || "Income"}${
          accountName ? ` · ${accountName}` : ""
        }`,
        dayKey,
        sortTime,
        sortId: String(tx.id || ""),
      };
    }),
    ...monthExpenses.map((e) => {
      const accountName = getAccountById(
        accounts,
        e.accountId || defaultAccountId,
      )?.name;
      return {
        id: `exp-${e.id}`,
        type: "debit",
        amount: e.amount,
        label: `${e.title}${accountName ? ` · ${accountName}` : ""}`,
        dayKey: resolveLedgerDayKey(e),
        sortTime: toMillis(e.createdAt),
        sortId: String(e.id || ""),
      };
    }),
  ].sort((a, b) => {
    const byDay = String(b.dayKey || "").localeCompare(String(a.dayKey || ""));
    if (byDay !== 0) return byDay;
    if (b.sortTime !== a.sortTime) return b.sortTime - a.sortTime;
    return String(b.sortId).localeCompare(String(a.sortId));
  });

  const historyByDay = monthHistory.reduce((groups, item) => {
    const key = item.dayKey || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});

  const historyDays = Object.keys(historyByDay).sort((a, b) =>
    b.localeCompare(a),
  );

  const barPercent = monthFunded > 0 ? Math.min(100, walletUsagePercent) : 0;
  const monthIn = monthIncome > 0 ? monthIncome : monthFunded;
  const spendingAccounts = accountsWithBal.filter(
    (account) => !account.isCredit && !account.setAside,
  );
  const setAsideAccounts = accountsWithBal.filter(
    (account) => !account.isCredit && account.setAside,
  );
  const hasSetAside = setAsideAccounts.length > 0;

  return (
    <div className="feature-panel">
      <p className="m-0 px-0.5 text-sm text-muted">Add money you received.</p>
      <MoneyNextStep onGoToHome={onGoToHome} />
      {monthFunded <= 0 && <AddIncomeForm />}

      <section className="relative overflow-hidden rounded-lg border border-edge bg-surface px-5 py-6 text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-40 w-56 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />
        <p
          className={`hero-amount relative ${
            monthFunded > 0 && monthRemaining < 0
              ? "text-danger"
              : monthFunded > 0
                ? ""
                : "text-muted"
          }`}
        >
          {monthFunded > 0 ? formatINR(monthRemaining) : formatINR(0)}
        </p>
        <p className="relative m-0 mt-2 text-sm text-muted">
          {monthFunded > 0
            ? "left to spend this month"
            : "Add income to start this month"}
        </p>
        {monthFunded > 0 && (
          <SpendPlanNote className="relative m-0 mt-2 text-xs leading-relaxed text-muted" />
        )}
        {monthFunded > 0 && setAsideParked > 0 && (
          <p className="relative m-0 mt-1 text-xs leading-relaxed text-muted">
            {formatINR(setAsideParked)} in a set-aside account is not included.
          </p>
        )}

        {monthFunded > 0 && (
          <div className="relative mx-auto mt-4 max-w-xs">
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className={`h-full rounded-full transition-all ${
                  monthRemaining < 0
                    ? "bg-danger"
                    : walletUsagePercent >= 80
                      ? "bg-accent"
                      : "bg-primary"
                }`}
                style={{ width: `${barPercent}%` }}
              />
            </div>
            <div className="flex justify-between gap-2 text-xs text-muted">
              <span className="text-success">In {formatINR(monthIn)}</span>
              {setAsideParked > 0 && (
                <span>Set aside {formatINR(setAsideParked)}</span>
              )}
              <span className="text-danger">Out {formatINR(monthSpent)}</span>
            </div>
          </div>
        )}
      </section>

      {monthFunded > 0 && <AddIncomeForm />}

      <section className="card">
        <button
          type="button"
          className="flex w-full items-center justify-between border-0 bg-transparent p-0 text-left"
          onClick={() => setShowAccounts((prev) => !prev)}
        >
          <div className="min-w-0">
            <h2 className="card-title mb-0">Accounts</h2>
            <p className="card-desc mb-0 mt-1">
              {accountsWithBal.length}{" "}
              {accountsWithBal.length === 1 ? "account" : "accounts"}
              {hasSetAside
                ? ` · ${formatINR(accountsTotal)} to use · ${formatINR(setAsideTotal)} set aside`
                : accountsTotal
                  ? ` · ${formatINR(accountsTotal)}`
                  : ""}
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-primary">
            {showAccounts ? "Hide" : "Show"}
          </span>
        </button>

        {showAccounts && (
          <div className="mt-3">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="card-title mb-0">
                {hasSetAside ? "To use" : "Balances"}
              </h2>
              <p className="m-0 text-sm font-semibold text-primary">
                {formatINR(accountsTotal)}
              </p>
            </div>
            {spendingAccounts.length === 0 && (
              <p className="m-0 text-xs text-muted">
                No accounts in the spending total.
              </p>
            )}
            <ul className="m-0 list-none space-y-0 p-0">
              {spendingAccounts.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-3 border-t border-edge/50 py-3 first:border-0 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-medium">{account.name}</p>
                    {account.kind === "debit" && (
                      <p className="m-0 text-xs text-muted">Debit card</p>
                    )}
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      account.balance < 0 ? "text-danger" : "text-ink"
                    }`}
                  >
                    {formatINR(account.balance)}
                  </span>
                </li>
              ))}
            </ul>

            {hasSetAside && (
              <div className="mt-4 border-t border-edge/50 pt-3">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <p className="m-0 text-sm font-medium">Set aside</p>
                  <p className="m-0 text-sm font-semibold text-ink">
                    {formatINR(setAsideTotal)}
                  </p>
                </div>
                <p className="m-0 mb-2 text-xs text-muted">
                  Not included in the total above. This money stays in the
                  account.
                </p>
                <ul className="m-0 list-none space-y-0 p-0">
                  {setAsideAccounts.map((account) => (
                    <li
                      key={account.id}
                      className="flex items-center justify-between gap-3 border-t border-edge/50 py-3 first:border-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="m-0 text-sm font-medium">
                          {account.name}
                        </p>
                        <p className="m-0 text-xs text-muted">
                          {account.kind === "debit"
                            ? "Debit card · Not in the spending total"
                            : "Not in the spending total"}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          account.balance < 0 ? "text-danger" : "text-ink"
                        }`}
                      >
                        {formatINR(account.balance)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {accountsWithBal.some((a) => a.isCredit) && (
              <div className="mt-4 border-t border-edge/50 pt-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="m-0 text-sm font-medium">Credit cards</p>
                  {creditOutstanding > 0 && (
                    <p className="m-0 text-xs text-danger">
                      Owed {formatINR(creditOutstanding)}
                    </p>
                  )}
                </div>
                <ul className="m-0 list-none space-y-0 p-0">
                  {accountsWithBal
                    .filter((account) => account.isCredit)
                    .map((account) => (
                      <li
                        key={account.id}
                        className="flex items-center justify-between gap-3 border-t border-edge/50 py-3 first:border-0 first:pt-0"
                      >
                        <div className="min-w-0">
                          <p className="m-0 text-sm font-medium">
                            {account.name}
                          </p>
                          <p className="m-0 text-xs text-muted">
                            Available {formatINR(account.available || 0)}
                            {account.creditLimit
                              ? ` · Limit ${formatINR(account.creditLimit)}`
                              : ""}
                            {account.dueDay
                              ? ` · Bill on the ${account.dueDay}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            account.outstanding > 0 ? "text-danger" : "text-ink"
                          }`}
                        >
                          {formatINR(account.outstanding)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <BankManager />

            {accountsWithBal.length >= 2 && (
              <div className="mt-4 border-t border-edge/50 pt-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-0 bg-transparent p-0 text-left"
                  onClick={() => setShowTransfer((prev) => !prev)}
                >
                  <span className="text-sm font-medium">
                    Transfer or pay card
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    {showTransfer ? "Hide" : "Show"}
                  </span>
                </button>
                {showTransfer && (
                  <div className="mt-3">
                    <TransferForm />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <AllocationPlanner />
      <RecurringPanel />
      <GoalsPanel />

      {monthHistory.length > 0 && (
        <section className="card">
          <button
            type="button"
            className="flex w-full items-center justify-between border-0 bg-transparent p-0 text-left"
            onClick={() => setShowActivity((prev) => !prev)}
          >
            <div className="min-w-0">
              <h2 className="card-title mb-0">{monthLabel} history</h2>
              <p className="card-desc mb-0 mt-1">
                {monthHistory.length} item{monthHistory.length === 1 ? "" : "s"}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-primary">
              {showActivity ? "Hide" : "Show"}
            </span>
          </button>
          {showActivity && (
            <div className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto">
              {historyDays.map((day) => (
                <div key={day}>
                  <p className="section-label mb-1 mt-0">
                    {day === "unknown"
                      ? "Unknown date"
                      : dayjs(day).format("D MMM YYYY")}
                  </p>
                  <ul className="m-0 list-none space-y-0 p-0">
                    {historyByDay[day].map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 border-t border-edge/50 py-2.5 first:border-0 first:pt-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="m-0 truncate text-sm">{item.label}</p>
                          <p
                            className={`m-0 text-xs ${ledgerTypeLabelClass(item.type)}`}
                          >
                            {item.type === "transfer"
                              ? item.transferKind === "card_payment"
                                ? "Card payment"
                                : "Transfer"
                              : item.type === "credit"
                                ? "Income"
                                : "Expense"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-sm font-semibold ${ledgerAmountClass(item.type)}`}
                        >
                          {item.type === "credit"
                            ? "+"
                            : item.type === "transfer"
                              ? "↔"
                              : "−"}
                          {formatINR(item.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
