/**
 * Convert Firestore Timestamp / Date / string into a Redux-safe ISO string (or null).
 */
export function toSerializableDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return null;
}

/** Recursively convert known timestamp fields on a profile/user object. */
export function sanitizeProfileDates(profile) {
  if (!profile || typeof profile !== 'object') return profile;
  return {
    ...profile,
    createdAt: toSerializableDate(profile.createdAt),
    updatedAt: toSerializableDate(profile.updatedAt),
  };
}
