import dayjs from 'dayjs';
import { CATEGORY_PALETTE } from '../../../core/constants/finance';
import { summarizeLedgerRows } from './exportExpenses';
import {
  aggregateSplitBalances,
  getGroupById,
  normalizeExpenseSplit,
} from './groups';
import { resolveLedgerDayKey } from './moneyFlows';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatMoney = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const downloadBlob = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Aggregate chart-ready series from ledger or expense-search rows. */
export const buildReportChartData = (rows = [], { mode = 'ledger' } = {}) => {
  const list = rows || [];
  const byCategory = {};
  const byDay = {};
  let incomeTotal = 0;
  let expenseTotal = 0;

  list.forEach((row) => {
    const amount = Number(row.amount) || 0;
    if (amount <= 0) return;

    const type = row.type || 'Expense';
    const day = row.date || 'Unknown';

    if (mode === 'ledger') {
      if (type === 'Income') {
        incomeTotal += amount;
        return;
      }
      if (type === 'Transfer') return;
    }

    expenseTotal += amount;
    const category = row.category || 'Miscellaneous';
    byCategory[category] = (byCategory[category] || 0) + amount;
    byDay[day] = (byDay[day] || 0) + amount;
  });

  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const dayEntries = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));

  return {
    incomeTotal,
    expenseTotal,
    categoryLabels: categoryEntries.map(([label]) => label),
    categoryValues: categoryEntries.map(([, value]) => value),
    categoryColors: categoryEntries.map((_, index) => CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]),
    dayLabels: dayEntries.map(([day]) =>
      dayjs(day).isValid() ? dayjs(day).format('D MMM') : day
    ),
    dayValues: dayEntries.map(([, value]) => value),
  };
};

const buildTableRowsHtml = (rows, mode) => {
  if (mode === 'search') {
    return rows
      .map(
        (row) => `<tr>
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(row.title)}</td>
      <td>${escapeHtml(row.category)}</td>
      <td>${escapeHtml(row.tags)}</td>
      <td>${escapeHtml(row.account)}</td>
      <td>${escapeHtml(row.split || '—')}</td>
      <td class="num">${escapeHtml(formatMoney(row.amount))}</td>
    </tr>`
      )
      .join('\n');
  }

  return rows
    .map(
      (row) => `<tr>
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(row.type)}</td>
      <td>${escapeHtml(row.description)}</td>
      <td>${escapeHtml(row.category)}</td>
      <td>${escapeHtml(row.account)}</td>
      <td>${escapeHtml(row.split || '—')}</td>
      <td class="num">${escapeHtml(formatMoney(row.amount))}</td>
    </tr>`
    )
    .join('\n');
};

const buildSettlementHtml = (balances) => {
  if (!balances?.length) return '';
  const rows = balances
    .map(
      (item) => `<tr>
      <td>${escapeHtml(item.fromName)}</td>
      <td>${escapeHtml(item.toName)}</td>
      <td class="num">${escapeHtml(formatMoney(item.amount))}</td>
    </tr>`
    )
    .join('\n');

  return `<section class="card">
      <h2>Split balances</h2>
      <p class="sub" style="margin-bottom:12px">Net who owes whom after cancelling opposing debts.</p>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>From</th><th>To</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
};

export const buildReportHtml = ({
  title,
  subtitle,
  rows = [],
  mode = 'ledger',
  settlementBalances = [],
}) => {
  const chartData = buildReportChartData(rows, { mode });
  const summary =
    mode === 'ledger'
      ? summarizeLedgerRows(rows)
      : {
          total: rows.length,
          income: 0,
          expenses: rows.length,
          transfers: 0,
          incomeTotal: 0,
          expenseTotal: chartData.expenseTotal,
          transferTotal: 0,
        };

  const tableHead =
    mode === 'search'
      ? `<tr><th>Date</th><th>Title</th><th>Category</th><th>Tags</th><th>Account</th><th>Split</th><th>Amount</th></tr>`
      : `<tr><th>Date</th><th>Type</th><th>Description</th><th>Category</th><th>Account</th><th>Split</th><th>Amount</th></tr>`;

  const overviewCards =
    mode === 'ledger'
      ? `
      <div class="stat"><span>Income</span><strong>${escapeHtml(formatMoney(summary.incomeTotal))}</strong></div>
      <div class="stat"><span>Expenses</span><strong>${escapeHtml(formatMoney(summary.expenseTotal))}</strong></div>
      <div class="stat"><span>Left</span><strong>${escapeHtml(
        formatMoney(summary.incomeTotal - summary.expenseTotal)
      )}</strong></div>
      <div class="stat"><span>Items</span><strong>${summary.total}</strong></div>`
      : `
      <div class="stat"><span>Expenses</span><strong>${escapeHtml(formatMoney(summary.expenseTotal))}</strong></div>
      <div class="stat"><span>Items</span><strong>${summary.total}</strong></div>`;

  const flowChartBlock =
    mode === 'ledger'
      ? `<section class="card">
        <h2>Income vs expenses</h2>
        <div class="chart-wrap"><canvas id="flowChart"></canvas></div>
      </section>`
      : '';

  const payload = {
    mode,
    incomeTotal: chartData.incomeTotal,
    expenseTotal: chartData.expenseTotal,
    categoryLabels: chartData.categoryLabels,
    categoryValues: chartData.categoryValues,
    categoryColors: chartData.categoryColors,
    dayLabels: chartData.dayLabels,
    dayValues: chartData.dayValues,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; font-family: Inter, system-ui, -apple-system, sans-serif; background: #f4f7f5; color: #14201b; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
    h1 { margin: 0 0 4px; font-size: 1.6rem; }
    .sub { margin: 0 0 20px; color: #5b6b64; font-size: 0.95rem; }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-bottom: 16px; }
    .stat { background: #fff; border: 1px solid #d7e0db; border-radius: 10px; padding: 12px 14px; }
    .stat span { display: block; font-size: 0.75rem; color: #5b6b64; margin-bottom: 4px; }
    .stat strong { font-size: 1.1rem; }
    .charts { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-bottom: 16px; }
    .card { background: #fff; border: 1px solid #d7e0db; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .card h2 { margin: 0 0 12px; font-size: 1rem; }
    .chart-wrap { position: relative; height: 240px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e4ebe7; vertical-align: top; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: #5b6b64; }
    td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .note { margin-top: 18px; color: #5b6b64; font-size: 0.8rem; }
    @media print {
      body { background: #fff; }
      .wrap { max-width: none; padding: 0; }
      .card, .stat { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(title)}</h1>
    <p class="sub">${escapeHtml(subtitle)}</p>
    <div class="grid">${overviewCards}</div>
    <div class="charts">
      ${flowChartBlock}
      <section class="card">
        <h2>Spend by category</h2>
        <div class="chart-wrap"><canvas id="categoryChart"></canvas></div>
      </section>
      <section class="card">
        <h2>Spend by day</h2>
        <div class="chart-wrap"><canvas id="dayChart"></canvas></div>
      </section>
    </div>
    ${buildSettlementHtml(settlementBalances)}
    <section class="card">
      <h2>Details</h2>
      <div style="overflow-x:auto">
        <table>
          <thead>${tableHead}</thead>
          <tbody>
            ${buildTableRowsHtml(rows, mode)}
          </tbody>
        </table>
      </div>
    </section>
    <p class="note">Charts are drawn from your data when this file opens in a browser. Print or Save as PDF from the browser if needed.</p>
  </div>
  <script>
    const data = ${JSON.stringify(payload)};
    const money = (v) => '₹' + Number(v || 0).toLocaleString('en-IN');

    if (typeof Chart !== 'undefined') {
      if (data.mode === 'ledger') {
        const flowEl = document.getElementById('flowChart');
        if (flowEl) {
          new Chart(flowEl, {
            type: 'doughnut',
            data: {
              labels: ['Income', 'Expenses'],
              datasets: [{
                data: [data.incomeTotal, data.expenseTotal],
                backgroundColor: ['#16a34a', '#ef4444'],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: (ctx) => ' ' + money(ctx.raw) } }
              }
            }
          });
        }
      }

      const catEl = document.getElementById('categoryChart');
      if (catEl) {
        new Chart(catEl, {
          type: 'doughnut',
          data: {
            labels: data.categoryLabels.length ? data.categoryLabels : ['No expenses'],
            datasets: [{
              data: data.categoryValues.length ? data.categoryValues : [1],
              backgroundColor: data.categoryColors.length ? data.categoryColors : ['#d1d5db'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12 } },
              tooltip: { callbacks: { label: (ctx) => ' ' + money(ctx.raw) } }
            }
          }
        });
      }

      const dayEl = document.getElementById('dayChart');
      if (dayEl) {
        new Chart(dayEl, {
          type: 'bar',
          data: {
            labels: data.dayLabels.length ? data.dayLabels : ['—'],
            datasets: [{
              label: 'Spent',
              data: data.dayValues.length ? data.dayValues : [0],
              backgroundColor: '#3b82f6',
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => ' ' + money(ctx.raw) } }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN') }
              }
            }
          }
        });
      }
    }
  </script>
</body>
</html>`;
};

export const downloadLedgerReport = (
  rows,
  startDate,
  endDate,
  { expenses = [], peopleGroups = [] } = {}
) => {
  const from = dayjs(startDate).format('YYYY-MM-DD');
  const to = dayjs(endDate).format('YYYY-MM-DD');
  const settlementBalances = aggregateSplitBalances(expenses, peopleGroups);
  const html = buildReportHtml({
    title: 'Glow Money report',
    subtitle: `${from} to ${to} · income, expenses, and transfers`,
    rows,
    mode: 'ledger',
    settlementBalances,
  });
  downloadBlob(html, `money_report_${from}_to_${to}.html`, 'text/html;charset=utf-8');
};

export const downloadSearchReport = ({
  rows = [],
  query = '',
  expenses = [],
  peopleGroups = [],
}) => {
  const list = rows || [];
  const safeQuery =
    String(query || 'results')
      .trim()
      .replace(/^#+/, '')
      .replace(/[^\w-]+/g, '_')
      .slice(0, 40) || 'results';
  const settlementBalances = aggregateSplitBalances(expenses, peopleGroups);
  const html = buildReportHtml({
    title: 'Glow Money report',
    subtitle: `Filtered expenses for “${query}” · ${list.length} item${list.length === 1 ? '' : 's'}`,
    rows: list,
    mode: 'search',
    settlementBalances,
  });
  downloadBlob(
    html,
    `expenses_report_${safeQuery}_${dayjs().format('YYYY-MM-DD')}.html`,
    'text/html;charset=utf-8'
  );
};

/**
 * Rows safe to share with a group: no bank/account columns.
 * Only expenses that have a split are included.
 */
export const buildShareableSplitRows = (expenses = [], peopleGroups = []) => {
  const rows = [];
  (expenses || []).forEach((expense) => {
    const normalized = normalizeExpenseSplit(expense.split, peopleGroups);
    if (!normalized) return;
    const group = getGroupById(peopleGroups, normalized.groupId);
    const nameOf = (id) =>
      group?.members?.find((m) => m.id === id)?.name || 'Someone';
    const amount = Number(expense.amount) || 0;
    const each =
      normalized.shares?.[0]?.amount ??
      (normalized.memberIds.length
        ? Math.round((amount / normalized.memberIds.length) * 100) / 100
        : 0);
    rows.push({
      date: resolveLedgerDayKey(expense) || expense.date || '',
      title: expense.title || 'Expense',
      groupName: group?.name || 'Group',
      paidBy: nameOf(normalized.paidBy),
      sharedWith: normalized.memberIds.map(nameOf).join(', '),
      amount,
      each,
    });
  });
  return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
};

const buildShareableTableRowsHtml = (rows) =>
  rows
    .map(
      (row) => `<tr>
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(row.title)}</td>
      <td>${escapeHtml(row.paidBy)}</td>
      <td>${escapeHtml(row.sharedWith)}</td>
      <td class="num">${escapeHtml(formatMoney(row.amount))}</td>
      <td class="num">${escapeHtml(formatMoney(row.each))}</td>
    </tr>`
    )
    .join('\n');

/** Chart series for shareable split reports (no bank/income data). */
export const buildShareableSplitChartData = (rows = [], settlementBalances = []) => {
  const byPayer = {};
  const byDay = {};

  (rows || []).forEach((row) => {
    const amount = Number(row.amount) || 0;
    if (amount <= 0) return;
    const payer = row.paidBy || 'Someone';
    byPayer[payer] = (byPayer[payer] || 0) + amount;
    const day = row.date || 'Unknown';
    byDay[day] = (byDay[day] || 0) + amount;
  });

  const payerEntries = Object.entries(byPayer).sort((a, b) => b[1] - a[1]);
  const dayEntries = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
  const settleEntries = (settlementBalances || [])
    .filter((item) => Number(item.amount) > 0)
    .map((item) => ({
      label: `${item.fromName} → ${item.toName}`,
      amount: Number(item.amount) || 0,
    }));

  return {
    payerLabels: payerEntries.map(([label]) => label),
    payerValues: payerEntries.map(([, value]) => value),
    payerColors: payerEntries.map((_, index) => CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]),
    dayLabels: dayEntries.map(([day]) =>
      dayjs(day).isValid() ? dayjs(day).format('D MMM') : day
    ),
    dayValues: dayEntries.map(([, value]) => value),
    settleLabels: settleEntries.map((item) => item.label),
    settleValues: settleEntries.map((item) => item.amount),
  };
};

/** HTML report meant for sharing with trip/flat mates (split-only, no banks). */
export const buildShareableSplitHtml = ({
  title = 'Shared expenses',
  subtitle = '',
  rows = [],
  settlementBalances = [],
}) => {
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const groupNames = [...new Set(rows.map((r) => r.groupName).filter(Boolean))];
  const heading =
    groupNames.length === 1 ? `${title} · ${groupNames[0]}` : title;
  const chartData = buildShareableSplitChartData(rows, settlementBalances);
  const hasSettlements = chartData.settleLabels.length > 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(heading)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f7f8f6; color: #1a221e; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 24px 16px 48px; }
    h1 { margin: 0 0 4px; font-size: 1.45rem; }
    .sub { margin: 0 0 18px; color: #5b6b64; font-size: 0.95rem; }
    .grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); margin-bottom: 14px; }
    .stat { background: #fff; border: 1px solid #d7e0db; border-radius: 10px; padding: 12px 14px; }
    .stat span { display: block; font-size: 0.75rem; color: #5b6b64; margin-bottom: 4px; }
    .stat strong { font-size: 1.05rem; }
    .charts { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-bottom: 14px; }
    .card { background: #fff; border: 1px solid #d7e0db; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
    .card h2 { margin: 0 0 10px; font-size: 1rem; }
    .chart-wrap { position: relative; height: 220px; }
    .hint { margin: 0 0 12px; color: #5b6b64; font-size: 0.85rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e4ebe7; vertical-align: top; }
    th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #5b6b64; }
    td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .note { margin-top: 16px; color: #5b6b64; font-size: 0.8rem; }
    @media print {
      body { background: #fff; }
      .wrap { max-width: none; padding: 0; }
      .card, .stat { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(heading)}</h1>
    <p class="sub">${escapeHtml(subtitle)}</p>
    <div class="grid">
      <div class="stat"><span>Split total</span><strong>${escapeHtml(formatMoney(total))}</strong></div>
      <div class="stat"><span>Expenses</span><strong>${rows.length}</strong></div>
      <div class="stat"><span>Settlements</span><strong>${settlementBalances.length}</strong></div>
    </div>
    <div class="charts">
      <section class="card">
        <h2>Paid by</h2>
        <div class="chart-wrap"><canvas id="payerChart"></canvas></div>
      </section>
      <section class="card">
        <h2>Spend by day</h2>
        <div class="chart-wrap"><canvas id="dayChart"></canvas></div>
      </section>
      ${
        hasSettlements
          ? `<section class="card">
        <h2>Who owes whom</h2>
        <div class="chart-wrap"><canvas id="settleChart"></canvas></div>
      </section>`
          : ''
      }
    </div>
    ${buildSettlementHtml(settlementBalances)}
    <section class="card">
      <h2>Split expenses</h2>
      <p class="hint">Who paid and how each expense was shared. Safe to forward — no bank or income details.</p>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Expense</th>
              <th>Paid by</th>
              <th>Shared with</th>
              <th>Amount</th>
              <th>Each</th>
            </tr>
          </thead>
          <tbody>
            ${buildShareableTableRowsHtml(rows)}
          </tbody>
        </table>
      </div>
    </section>
    <p class="note">Charts load when this file opens in a browser · Print or Save as PDF to send to your group.</p>
  </div>
  <script>
    const data = ${JSON.stringify(chartData)};
    const money = (v) => '₹' + Number(v || 0).toLocaleString('en-IN');

    if (typeof Chart !== 'undefined') {
      const payerEl = document.getElementById('payerChart');
      if (payerEl) {
        new Chart(payerEl, {
          type: 'doughnut',
          data: {
            labels: data.payerLabels.length ? data.payerLabels : ['No data'],
            datasets: [{
              data: data.payerValues.length ? data.payerValues : [1],
              backgroundColor: data.payerColors.length ? data.payerColors : ['#d1d5db'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12 } },
              tooltip: { callbacks: { label: (ctx) => ' ' + money(ctx.raw) } }
            }
          }
        });
      }

      const dayEl = document.getElementById('dayChart');
      if (dayEl) {
        new Chart(dayEl, {
          type: 'bar',
          data: {
            labels: data.dayLabels.length ? data.dayLabels : ['—'],
            datasets: [{
              label: 'Spent',
              data: data.dayValues.length ? data.dayValues : [0],
              backgroundColor: '#3b82f6',
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => ' ' + money(ctx.raw) } }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN') }
              }
            }
          }
        });
      }

      const settleEl = document.getElementById('settleChart');
      if (settleEl && data.settleLabels.length) {
        new Chart(settleEl, {
          type: 'bar',
          data: {
            labels: data.settleLabels,
            datasets: [{
              label: 'Owes',
              data: data.settleValues,
              backgroundColor: '#f59e0b',
              borderRadius: 4
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => ' ' + money(ctx.raw) } }
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN') }
              }
            }
          }
        });
      }
    }
  </script>
</body>
</html>`;
};

export const downloadShareableSplitReport = ({
  expenses = [],
  peopleGroups = [],
  query = '',
}) => {
  const splitExpenses = (expenses || []).filter((expense) =>
    Boolean(normalizeExpenseSplit(expense.split, peopleGroups))
  );
  const rows = buildShareableSplitRows(splitExpenses, peopleGroups);
  const settlementBalances = aggregateSplitBalances(splitExpenses, peopleGroups);
  const safeQuery =
    String(query || 'split')
      .trim()
      .replace(/^#+/, '')
      .replace(/[^\w-]+/g, '_')
      .slice(0, 40) || 'split';
  const label = query ? `“${query}”` : 'selected expenses';
  const html = buildShareableSplitHtml({
    title: 'Shared expenses',
    subtitle: `${label} · ${rows.length} split item${rows.length === 1 ? '' : 's'} · ready to share`,
    rows,
    settlementBalances,
  });
  downloadBlob(
    html,
    `shared_split_${safeQuery}_${dayjs().format('YYYY-MM-DD')}.html`,
    'text/html;charset=utf-8'
  );
  return { count: rows.length };
};
