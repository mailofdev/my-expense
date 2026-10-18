import dayjs from 'dayjs';
import { formatINR } from '../../../core/utils/currency';

const formatCopyDate = (date) =>
  dayjs(date).isValid() ? dayjs(date).format('D MMM YYYY') : '';

const joinParts = (parts) => parts.filter(Boolean).join(' · ');

/** One line for a money-history row: date, type, description, then amount. */
export function formatLedgerCopyLine(row) {
  return joinParts([
    formatCopyDate(row.date),
    row.type,
    row.description || row.type,
    row.category,
    formatINR(row.amount),
    row.split,
  ]);
}

/** One line for a search result: date, title, details, then amount. */
export function formatSearchCopyLine(row) {
  return joinParts([
    formatCopyDate(row.date),
    row.title || 'Untitled',
    row.category,
    row.tags,
    row.account,
    formatINR(row.amount),
    row.split,
  ]);
}

export function buildCopyText(lines) {
  return (lines || []).filter(Boolean).join('\n');
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  if (!ok) throw new Error('Could not copy');
}
