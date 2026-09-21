/** Internal tab ids stay stable; URL and labels are user-facing. */
export const TAB_IDS = {
  overview: 'overview',
  wallet: 'wallet',
  analyzer: 'analyzer',
  settings: 'settings',
};

export const TAB_TO_URL = {
  overview: 'today',
  wallet: 'income',
  analyzer: 'reports',
  settings: 'tools',
};

const URL_TO_TAB = {
  today: 'overview',
  income: 'wallet',
  reports: 'analyzer',
  tools: 'settings',
  overview: 'overview',
  wallet: 'wallet',
  analyzer: 'analyzer',
  settings: 'settings',
  home: 'overview',
  money: 'wallet',
  charts: 'analyzer',
  more: 'settings',
};

export function tabFromUrl(value) {
  return URL_TO_TAB[String(value || '').toLowerCase()] || 'overview';
}

export function urlFromTab(tabId) {
  return TAB_TO_URL[tabId] || 'today';
}
