import { STORAGE_KEYS } from '../constants/storageKeys';

export const saveAuthToStorage = (token, user) => {
  if (token) localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  if (user) localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
};

export const clearAuthFromStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
};

export const getStoredAuth = () => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const userRaw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
  let user = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      user = null;
    }
  }
  return { token, user };
};
