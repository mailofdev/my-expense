import { sanitizeProfileDates, toSerializableDate } from './firestoreDates';

describe('firestoreDates', () => {
  test('toSerializableDate converts Timestamp-like objects', () => {
    const ts = {
      seconds: 1700000000,
      nanoseconds: 0,
      toDate() {
        return new Date(1700000000 * 1000);
      },
    };
    expect(toSerializableDate(ts)).toBe(new Date(1700000000 * 1000).toISOString());
  });

  test('toSerializableDate passes through ISO strings', () => {
    expect(toSerializableDate('2026-01-01T00:00:00.000Z')).toBe('2026-01-01T00:00:00.000Z');
  });

  test('sanitizeProfileDates serializes createdAt and updatedAt', () => {
    const profile = sanitizeProfileDates({
      uid: 'u1',
      createdAt: { seconds: 1700000000, nanoseconds: 0, toDate: () => new Date(1700000000 * 1000) },
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    expect(typeof profile.createdAt).toBe('string');
    expect(profile.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });
});
