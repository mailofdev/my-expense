import dayjs from 'dayjs';

/** Cap catch-up so a very old template cannot create a huge backlog in one sync. */
export const MAX_REPEAT_CATCHUP = 24;

export function stepCadence(date, cadence) {
  const cursor = dayjs(date);
  if (!cursor.isValid()) return cursor;
  if (cadence === 'weekly') return cursor.add(1, 'week');
  if (cadence === 'yearly') return cursor.add(1, 'year');
  return cursor.add(1, 'month');
}

/**
 * Due dates from nextDate through today, one cadence step at a time.
 * Future dates are excluded. Paused templates return nothing.
 */
export function dueOccurrenceDates(template, today, { max = MAX_REPEAT_CATCHUP } = {}) {
  if (!template || template.enabled === false || !template.nextDate) return [];
  const todayD = dayjs(today);
  let cursor = dayjs(template.nextDate);
  if (!cursor.isValid() || !todayD.isValid() || cursor.isAfter(todayD, 'day')) return [];

  const end = template.endDate && dayjs(template.endDate).isValid() ? dayjs(template.endDate) : null;
  const cap = Number(template.maxOccurrences) > 0 ? Number(template.maxOccurrences) : Infinity;
  let used = Number(template.runCount) || 0;
  const dates = [];
  let guard = 0;

  while (!cursor.isAfter(todayD, 'day') && dates.length < max && guard < 120) {
    guard += 1;
    if (end && cursor.isAfter(end, 'day')) break;
    if (used >= cap) break;
    dates.push(cursor.format('YYYY-MM-DD'));
    used += 1;
    cursor = stepCadence(cursor, template.cadence || 'monthly');
  }

  return dates;
}

/** Dates already stored on the template or on a posted ledger row. */
export function postedDateSet(template, ledger = []) {
  const dates = new Set(
    (template?.postedDates || []).map((date) => String(date).slice(0, 10)).filter(Boolean)
  );
  (ledger || []).forEach((item) => {
    if (!item) return;
    if (item.recurringTemplateId && item.recurringTemplateId !== template?.id) return;
    const occurrence = item.occurrenceDate || (item.recurringTemplateId ? item.date : '');
    if (item.recurringTemplateId && occurrence) dates.add(String(occurrence).slice(0, 10));
  });
  return dates;
}

export function recurringDocId(templateId, occurrenceDate) {
  return `rec_${templateId}_${occurrenceDate}`;
}

/**
 * Move a template past one occurrence.
 * A duplicate still advances so the same date is not posted again.
 */
export function applyPostedOccurrence(template, occurrenceDate, { duplicate = false } = {}) {
  const postedDates = [...new Set([...(template.postedDates || []), occurrenceDate])].slice(-36);
  return {
    ...template,
    postedDates,
    nextDate: stepCadence(occurrenceDate, template.cadence || 'monthly').format('YYYY-MM-DD'),
    runCount: duplicate ? Number(template.runCount) || 0 : (Number(template.runCount) || 0) + 1,
    lastPost: {
      status: 'posted',
      occurrenceDate,
      message: duplicate ? 'Already recorded' : '',
      at: new Date().toISOString(),
    },
  };
}

export function applyFailedOccurrence(template, occurrenceDate, message) {
  return {
    ...template,
    lastPost: {
      status: 'failed',
      occurrenceDate,
      message: message || 'Could not post',
      at: new Date().toISOString(),
    },
  };
}

/** Short status for the repeat row: upcoming is the next date; this covers posted and failed. */
export function repeatStatusText(template) {
  const post = template?.lastPost;
  if (!post?.status) return '';
  const when = post.occurrenceDate && dayjs(post.occurrenceDate).isValid()
    ? dayjs(post.occurrenceDate).format('D MMM')
    : '';
  if (post.status === 'failed') {
    return post.message ? `Failed · ${post.message}` : 'Failed';
  }
  if (post.status === 'posted') {
    return when ? `Posted ${when}` : 'Posted';
  }
  return '';
}
