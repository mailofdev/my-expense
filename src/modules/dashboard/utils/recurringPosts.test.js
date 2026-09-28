import {
  applyFailedOccurrence,
  applyPostedOccurrence,
  dueOccurrenceDates,
  postedDateSet,
  recurringDocId,
  repeatStatusText,
} from './recurringPosts';

const rent = {
  id: 'rent',
  enabled: true,
  amount: 15000,
  cadence: 'monthly',
  nextDate: '2026-07-05',
  runCount: 0,
  postedDates: [],
};

describe('dueOccurrenceDates', () => {
  test('posts each missed due date and stops at today', () => {
    expect(dueOccurrenceDates(rent, '2026-09-22')).toEqual([
      '2026-07-05',
      '2026-08-05',
      '2026-09-05',
    ]);
  });

  test('skips future, paused, ended, and maxed templates', () => {
    expect(dueOccurrenceDates({ ...rent, nextDate: '2026-10-05' }, '2026-09-22')).toEqual([]);
    expect(dueOccurrenceDates({ ...rent, enabled: false }, '2026-09-22')).toEqual([]);
    expect(
      dueOccurrenceDates({ ...rent, endDate: '2026-08-01' }, '2026-09-22')
    ).toEqual(['2026-07-05']);
    expect(
      dueOccurrenceDates({ ...rent, maxOccurrences: 2 }, '2026-09-22')
    ).toEqual(['2026-07-05', '2026-08-05']);
  });
});

describe('duplicate guards', () => {
  test('treats template history and ledger rows as already posted', () => {
    const dates = postedDateSet(
      { ...rent, postedDates: ['2026-07-05'] },
      [{ recurringTemplateId: 'rent', occurrenceDate: '2026-08-05' }]
    );
    expect(dates.has('2026-07-05')).toBe(true);
    expect(dates.has('2026-08-05')).toBe(true);
    expect(recurringDocId('rent', '2026-09-05')).toBe('rec_rent_2026-09-05');
  });

  test('advances one cadence and records posted or failed status', () => {
    const posted = applyPostedOccurrence(rent, '2026-07-05');
    expect(posted.nextDate).toBe('2026-08-05');
    expect(posted.runCount).toBe(1);
    expect(posted.lastPost.status).toBe('posted');
    expect(repeatStatusText(posted)).toContain('Posted');

    const duplicate = applyPostedOccurrence(posted, '2026-08-05', { duplicate: true });
    expect(duplicate.runCount).toBe(1);
    expect(duplicate.nextDate).toBe('2026-09-05');

    const failed = applyFailedOccurrence(rent, '2026-07-05', 'Network error');
    expect(failed.nextDate).toBe('2026-07-05');
    expect(repeatStatusText(failed)).toBe('Failed · Network error');
  });
});
