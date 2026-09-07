import { summarizeLedgerRows } from './exportExpenses';

const MARGIN = 14;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/** jsPDF default fonts lack ₹ — use Rs for reliable mobile PDFs. */
export const formatMoneyPdf = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const moneyTick = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;

/** Lazy-load PDF libs so Jest / initial app load stay light. */
let pdfChartRegistered = false;

const loadPdfLibs = async () => {
  const [{ jsPDF }, { autoTable }, chartJs] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('chart.js'),
  ]);
  const {
    Chart,
    registerables,
    BarController,
    BarElement,
    DoughnutController,
    ArcElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
  } = chartJs;

  // Register once. Prefer registerables; fall back to explicit bar/doughnut controllers.
  if (!pdfChartRegistered) {
    if (Array.isArray(registerables) && registerables.length) {
      Chart.register(...registerables);
    } else {
      Chart.register(
        BarController,
        BarElement,
        DoughnutController,
        ArcElement,
        CategoryScale,
        LinearScale,
        Tooltip,
        Legend
      );
    }
    pdfChartRegistered = true;
  }

  return { jsPDF, autoTable, Chart };
};

/** Render Chart.js to PNG. Append canvas for mobile Safari reliability. */
const renderChartToDataUrl = (Chart, config, width = 720, height = 400) => {
  if (typeof document === 'undefined' || !Chart) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.cssText = 'position:fixed;left:-99999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(canvas);

  let chart;
  try {
    chart = new Chart(canvas, {
      type: config.type,
      data: config.data,
      options: {
        ...(config.options || {}),
        responsive: false,
        animation: false,
        devicePixelRatio: Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1),
      },
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('PDF chart render failed:', config?.type, error);
    return null;
  } finally {
    try {
      chart?.destroy();
    } catch (_) {
      /* ignore */
    }
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }
};

const ensureY = (doc, y, needed = 36) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
};

const addTitleBlock = (doc, title, subtitle) => {
  let y = MARGIN;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 32, 27);
  doc.text(String(title || 'Report'), MARGIN, y + 4);
  y += 10;
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(91, 107, 100);
    const lines = doc.splitTextToSize(String(subtitle), CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 4;
  }
  return y + 2;
};

const addStatLine = (doc, y, parts = []) => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(20, 32, 27);
  const text = parts.filter(Boolean).join('   ·   ');
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  y = ensureY(doc, y, lines.length * 5 + 4);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 5 + 6;
};

const addSectionHeading = (doc, y, heading) => {
  y = ensureY(doc, y, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 32, 27);
  doc.text(heading, MARGIN, y);
  return y + 6;
};

const addChartBlock = (doc, y, { title, dataUrl, widthMm = CONTENT_WIDTH, heightMm = 62 }) => {
  if (!dataUrl) return y;
  y = addSectionHeading(doc, y, title);
  y = ensureY(doc, y, heightMm + 4);
  doc.addImage(dataUrl, 'PNG', MARGIN, y, widthMm, heightMm);
  return y + heightMm + 8;
};

const addTwoCharts = (doc, y, left, right) => {
  const gap = 6;
  const width = (CONTENT_WIDTH - gap) / 2;
  const height = 58;
  const need = 12 + height + 8;
  y = ensureY(doc, y, need);

  const startY = y;
  if (left?.dataUrl) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 32, 27);
    doc.text(left.title, MARGIN, startY);
    doc.addImage(left.dataUrl, 'PNG', MARGIN, startY + 4, width, height);
  }
  if (right?.dataUrl) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 32, 27);
    doc.text(right.title, MARGIN + width + gap, startY);
    doc.addImage(right.dataUrl, 'PNG', MARGIN + width + gap, startY + 4, width, height);
  }
  return startY + 4 + height + 8;
};

const addAutoTable = (autoTable, doc, y, { head, body, columnStyles }) => {
  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [20, 32, 27],
      lineColor: [220, 228, 223],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [244, 247, 245],
      textColor: [91, 107, 100],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [250, 252, 251] },
    columnStyles,
  });
  return doc.lastAutoTable.finalY + 8;
};

const downloadPdfDoc = async (doc, filename, { preferShare = false } = {}) => {
  try {
    const blob = doc.output('blob');
    if (preferShare && typeof navigator !== 'undefined' && navigator.canShare && typeof File !== 'undefined') {
      try {
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
            text: 'Shared expense report',
          });
          return { shared: true };
        }
      } catch (error) {
        if (error?.name === 'AbortError') return { shared: false, aborted: true };
        // Fall through to save
      }
    }
  } catch (_) {
    // Fall through to save
  }

  doc.save(filename);
  return { shared: false };
};

const doughnutImage = (Chart, labels, values, colors) =>
  renderChartToDataUrl(Chart, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['No data'],
      datasets: [
        {
          data: values.length ? values : [1],
          backgroundColor: colors.length ? colors : ['#d1d5db'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
      },
    },
  });

const barImage = (Chart, labels, values, color = '#3b82f6') =>
  renderChartToDataUrl(Chart, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['—'],
      datasets: [
        {
          label: 'Spent',
          data: values.length ? values : [0],
          backgroundColor: color,
          borderRadius: 4,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: moneyTick, font: { size: 10 } },
        },
        x: { ticks: { font: { size: 10 } } },
      },
    },
  });

const horizontalBarImage = (Chart, labels, values, color = '#f59e0b') =>
  renderChartToDataUrl(Chart, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Owes',
          data: values,
          backgroundColor: color,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: moneyTick, font: { size: 10 } },
        },
        y: { ticks: { font: { size: 10 } } },
      },
    },
  });

/** Full ledger / search report as PDF. */
export async function downloadReportPdf({
  title,
  subtitle,
  rows = [],
  mode = 'ledger',
  chartData,
  settlementBalances = [],
  filename,
}) {
  const { jsPDF, autoTable, Chart } = await loadPdfLibs();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const charts = chartData || {
    incomeTotal: 0,
    expenseTotal: 0,
    categoryLabels: [],
    categoryValues: [],
    categoryColors: [],
    dayLabels: [],
    dayValues: [],
  };
  const summary =
    mode === 'ledger'
      ? summarizeLedgerRows(rows)
      : {
          total: rows.length,
          incomeTotal: 0,
          expenseTotal: charts.expenseTotal,
        };

  let y = addTitleBlock(doc, title, subtitle);

  if (mode === 'ledger') {
    y = addStatLine(doc, y, [
      `Income ${formatMoneyPdf(summary.incomeTotal)}`,
      `Expenses ${formatMoneyPdf(summary.expenseTotal)}`,
      `Left ${formatMoneyPdf(summary.incomeTotal - summary.expenseTotal)}`,
      `${summary.total} items`,
    ]);
  } else {
    y = addStatLine(doc, y, [
      `Expenses ${formatMoneyPdf(summary.expenseTotal)}`,
      `${summary.total} items`,
    ]);
  }

  if (mode === 'ledger') {
    const flowImg = doughnutImage(
      Chart,
      ['Income', 'Expenses'],
      [charts.incomeTotal, charts.expenseTotal],
      ['#16a34a', '#ef4444']
    );
    const catImg = doughnutImage(
      Chart,
      charts.categoryLabels,
      charts.categoryValues,
      charts.categoryColors
    );
    y = addTwoCharts(
      doc,
      y,
      { title: 'Income vs expenses', dataUrl: flowImg },
      { title: 'Spend by category', dataUrl: catImg }
    );
  } else {
    const catImg = doughnutImage(
      Chart,
      charts.categoryLabels,
      charts.categoryValues,
      charts.categoryColors
    );
    y = addChartBlock(doc, y, {
      title: 'Spend by category',
      dataUrl: catImg,
      widthMm: Math.min(CONTENT_WIDTH, 120),
      heightMm: 70,
    });
  }

  const dayImg = barImage(Chart, charts.dayLabels, charts.dayValues);
  y = addChartBlock(doc, y, {
    title: 'Spend by day',
    dataUrl: dayImg,
    heightMm: 58,
  });

  if (settlementBalances?.length) {
    y = addSectionHeading(doc, y, 'Split balances (net)');
    y = addAutoTable(autoTable, doc, y, {
      head: [['From', 'To', 'Amount']],
      body: settlementBalances.map((item) => [
        item.fromName,
        item.toName,
        formatMoneyPdf(item.amount),
      ]),
      columnStyles: { 2: {halign: 'right' } },
    });
  }

  y = addSectionHeading(doc, y, 'Details');
  if (mode === 'search') {
    addAutoTable(autoTable, doc, y, {
      head: [['Date', 'Title', 'Category', 'Tags', 'Account', 'Split', 'Amount']],
      body: rows.map((row) => [
        row.date || '',
        row.title || '',
        row.category || '',
        row.tags || '',
        row.account || '',
        row.split || '—',
        formatMoneyPdf(row.amount),
      ]),
      columnStyles: { 6: {halign: 'right' } },
    });
  } else {
    addAutoTable(autoTable, doc, y, {
      head: [['Date', 'Type', 'Description', 'Category', 'Account', 'Split', 'Amount']],
      body: rows.map((row) => [
        row.date || '',
        row.type || '',
        row.description || '',
        row.category || '',
        row.account || '',
        row.split || '—',
        formatMoneyPdf(row.amount),
      ]),
      columnStyles: { 6: {halign: 'right' } },
    });
  }

  return downloadPdfDoc(doc, filename);
}

/** Shareable split-only PDF (no banks/income). Prefers native share on mobile. */
export async function downloadShareableSplitPdf({
  title,
  subtitle,
  rows = [],
  chartData,
  settlementBalances = [],
  filename,
}) {
  const { jsPDF, autoTable, Chart } = await loadPdfLibs();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const charts = chartData || {
    payerLabels: [],
    payerValues: [],
    payerColors: [],
    dayLabels: [],
    dayValues: [],
    settleLabels: [],
    settleValues: [],
  };

  let y = addTitleBlock(doc, title, subtitle);
  y = addStatLine(doc, y, [
    `Split total ${formatMoneyPdf(total)}`,
    `${rows.length} expenses`,
    `${settlementBalances.length} settlements`,
  ]);

  const payerImg = doughnutImage(Chart, charts.payerLabels, charts.payerValues, charts.payerColors);
  const dayImg = barImage(Chart, charts.dayLabels, charts.dayValues);
  y = addTwoCharts(
    doc,
    y,
    { title: 'Paid by', dataUrl: payerImg },
    { title: 'Spend by day', dataUrl: dayImg }
  );

  if (charts.settleLabels?.length) {
    const settleImg = horizontalBarImage(Chart, charts.settleLabels, charts.settleValues);
    y = addChartBlock(doc, y, {
      title: 'Who owes whom',
      dataUrl: settleImg,
      heightMm: Math.min(70, 28 + charts.settleLabels.length * 8),
    });
  }

  if (settlementBalances?.length) {
    y = addSectionHeading(doc, y, 'Split balances (net)');
    y = addAutoTable(autoTable, doc, y, {
      head: [['From', 'To', 'Amount']],
      body: settlementBalances.map((item) => [
        item.fromName,
        item.toName,
        formatMoneyPdf(item.amount),
      ]),
      columnStyles: { 2: {halign: 'right' } },
    });
  }

  y = addSectionHeading(doc, y, 'Split expenses');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(91, 107, 100);
  doc.text('Safe to share — no bank or income details.', MARGIN, y);
  y += 5;

  addAutoTable(autoTable, doc, y, {
    head: [['Date', 'Expense', 'Paid by', 'Shared with', 'Amount', 'Each']],
    body: rows.map((row) => [
      row.date || '',
      row.title || '',
      row.paidBy || '',
      row.sharedWith || '',
      formatMoneyPdf(row.amount),
      formatMoneyPdf(row.each),
    ]),
    columnStyles: {
      4: {halign: 'right' },
      5: {halign: 'right' },
    },
  });

  return downloadPdfDoc(doc, filename, { preferShare: true });
}
