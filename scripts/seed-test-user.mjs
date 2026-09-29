/**
 * Creates test@gmail.com and fills 25 Aug 2026 – 5 Oct 2026
 * so every Glow Money screen has data to check.
 *
 * Usage: node scripts/seed-test-user.mjs
 */
import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

const EMAIL = 'test@gmail.com';
const PASSWORD = 'test123';
const DISPLAY_NAME = 'Test User';

const START = '2026-08-25';
const END = '2026-10-05';

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function equalSplit(groupId, paidBy, memberIds, amount) {
  const count = memberIds.length;
  const base = Math.floor((amount * 100) / count) / 100;
  let remainder = Math.round((amount - base * count) * 100) / 100;
  const shares = memberIds.map((memberId) => {
    let shareAmount = base;
    if (remainder >= 0.01) {
      shareAmount = Math.round((shareAmount + 0.01) * 100) / 100;
      remainder = Math.round((remainder - 0.01) * 100) / 100;
    }
    return { memberId, amount: shareAmount };
  });
  const sum = shares.reduce((total, item) => total + item.amount, 0);
  const drift = Math.round((amount - sum) * 100) / 100;
  if (drift !== 0) {
    shares[shares.length - 1].amount = Math.round((shares[shares.length - 1].amount + drift) * 100) / 100;
  }
  return { groupId, paidBy, memberIds, mode: 'equal', shares };
}

const ACCOUNTS = {
  hdfc: 'acc_hdfc',
  sbi: 'acc_sbi',
  cash: 'acc_cash',
  debit: 'acc_debit',
  card: 'acc_cc',
};

const MEMBERS = {
  self: 'mem_self',
  priya: 'mem_priya',
  rahul: 'mem_rahul',
  mom: 'mem_mom',
  dad: 'mem_dad',
};

const GROUPS = {
  flat: 'grp_flatmates',
  family: 'grp_family',
};

const flatMembers = [MEMBERS.self, MEMBERS.priya, MEMBERS.rahul];
const familyMembers = [MEMBERS.self, MEMBERS.mom, MEMBERS.dad];

function spend(id, fields) {
  return {
    id,
    title: fields.title,
    amount: fields.amount,
    category: fields.category,
    subcategory: fields.subcategory || '',
    tags: fields.tags || [],
    paymentMode: fields.paymentMode || 'UPI',
    accountId: fields.accountId || ACCOUNTS.hdfc,
    date: fields.date,
    split: fields.split || null,
    recurringTemplateId: fields.recurringTemplateId || null,
    occurrenceDate: fields.occurrenceDate || null,
  };
}

const expenses = [
  spend('exp_0825_groceries', {
    title: 'BigBasket groceries',
    amount: 980,
    category: 'Food & Groceries',
    subcategory: 'Groceries',
    tags: ['home'],
    date: '2026-08-25',
  }),
  spend('exp_0826_auto', {
    title: 'Auto to office',
    amount: 120,
    category: 'Transport & Fuel',
    subcategory: 'Cab',
    tags: ['commute'],
    paymentMode: 'Cash',
    accountId: ACCOUNTS.cash,
    date: '2026-08-26',
  }),
  spend('exp_0827_tea', {
    title: 'Chai',
    amount: 40,
    category: 'Food & Groceries',
    subcategory: 'Tea & Coffee',
    tags: ['office'],
    paymentMode: 'Cash',
    accountId: ACCOUNTS.cash,
    date: '2026-08-27',
  }),
  spend('exp_0828_medicine', {
    title: 'Pharmacy',
    amount: 220,
    category: 'Personal & Gifts',
    subcategory: 'Health',
    tags: ['health'],
    date: '2026-08-28',
  }),
  spend('exp_0829_dinner', {
    title: 'Flatmates dinner',
    amount: 1500,
    category: 'Food & Groceries',
    subcategory: 'Eating out',
    tags: ['weekend', 'shared'],
    date: '2026-08-29',
    split: equalSplit(GROUPS.flat, MEMBERS.self, flatMembers, 1500),
  }),
  spend('exp_0830_myntra', {
    title: 'Myntra shirt',
    amount: 740,
    category: 'Shopping & Lifestyle',
    subcategory: 'Clothes',
    tags: ['shopping'],
    paymentMode: 'Card',
    accountId: ACCOUNTS.card,
    date: '2026-08-30',
  }),
  spend('exp_0831_petrol', {
    title: 'Petrol',
    amount: 900,
    category: 'Transport & Fuel',
    subcategory: 'Fuel',
    tags: ['commute'],
    date: '2026-08-31',
  }),

  spend('exp_0901_groceries', {
    title: 'Monthly groceries',
    amount: 2200,
    category: 'Food & Groceries',
    subcategory: 'Groceries',
    tags: ['home'],
    date: '2026-09-01',
  }),
  spend('rec_rent_2026-09-05', {
    title: 'House rent',
    amount: 18000,
    category: 'Household & Living',
    subcategory: 'Rent',
    tags: ['rent'],
    paymentMode: 'Bank',
    date: '2026-09-05',
    recurringTemplateId: 'rent',
    occurrenceDate: '2026-09-05',
  }),
  spend('rec_mobile_2026-09-02', {
    title: 'Mobile recharge',
    amount: 599,
    category: 'Bills & EMIs',
    subcategory: 'Mobile',
    tags: ['bills'],
    date: '2026-09-02',
    recurringTemplateId: 'mobile',
    occurrenceDate: '2026-09-02',
  }),
  spend('exp_0902_petrol', {
    title: 'Petrol',
    amount: 1800,
    category: 'Transport & Fuel',
    subcategory: 'Fuel',
    tags: ['commute'],
    paymentMode: 'Card',
    accountId: ACCOUNTS.debit,
    date: '2026-09-02',
  }),
  spend('exp_0903_lunch', {
    title: 'Office lunch',
    amount: 180,
    category: 'Food & Groceries',
    subcategory: 'Eating out',
    tags: ['office'],
    accountId: ACCOUNTS.debit,
    date: '2026-09-03',
  }),
  spend('exp_0904_mom', {
    title: 'Sent to Mom',
    amount: 5000,
    category: 'Family & Transfers',
    subcategory: 'Parents',
    tags: ['family'],
    date: '2026-09-04',
  }),
  spend('exp_0906_dinner', {
    title: 'Saturday dinner',
    amount: 1800,
    category: 'Food & Groceries',
    subcategory: 'Eating out',
    tags: ['weekend', 'shared'],
    date: '2026-09-06',
    split: equalSplit(GROUPS.flat, MEMBERS.self, flatMembers, 1800),
  }),
  spend('exp_0907_shirt', {
    title: 'Myntra kurta',
    amount: 900,
    category: 'Shopping & Lifestyle',
    subcategory: 'Clothes',
    tags: ['shopping'],
    paymentMode: 'Card',
    accountId: ACCOUNTS.card,
    date: '2026-09-07',
  }),
  spend('exp_0908_uber', {
    title: 'Uber to airport',
    amount: 650,
    category: 'Transport & Fuel',
    subcategory: 'Cab',
    tags: ['travel'],
    date: '2026-09-08',
  }),
  spend('exp_0909_wifi', {
    title: 'Wifi bill',
    amount: 999,
    category: 'Bills & EMIs',
    subcategory: 'Internet',
    tags: ['bills'],
    date: '2026-09-09',
  }),
  spend('exp_0909_tea', {
    title: 'Tea and snacks',
    amount: 120,
    category: 'Food & Groceries',
    subcategory: 'Tea & Coffee',
    tags: ['office'],
    paymentMode: 'Cash',
    accountId: ACCOUNTS.cash,
    date: '2026-09-09',
  }),
  spend('exp_0910_pharmacy', {
    title: 'Pharmacy',
    amount: 450,
    category: 'Personal & Gifts',
    subcategory: 'Health',
    tags: ['health'],
    accountId: ACCOUNTS.debit,
    date: '2026-09-10',
  }),
  spend('exp_0911_electricity', {
    title: 'Electricity bill',
    amount: 400,
    category: 'Household & Living',
    subcategory: 'Utilities',
    tags: ['bills'],
    date: '2026-09-11',
  }),
  spend('exp_0912_swiggy', {
    title: 'Swiggy dinner',
    amount: 450,
    category: 'Food & Groceries',
    subcategory: 'Eating out',
    tags: ['weekend'],
    accountId: ACCOUNTS.debit,
    date: '2026-09-12',
  }),
  spend('exp_0912_family', {
    title: 'Family dinner',
    amount: 2400,
    category: 'Food & Groceries',
    subcategory: 'Eating out',
    tags: ['family', 'shared'],
    date: '2026-09-12',
    split: equalSplit(GROUPS.family, MEMBERS.mom, familyMembers, 2400),
  }),
  spend('exp_0913_rapido', {
    title: 'Rapido',
    amount: 250,
    category: 'Transport & Fuel',
    subcategory: 'Cab',
    tags: ['commute'],
    date: '2026-09-13',
  }),
  spend('exp_0914_haircut', {
    title: 'Haircut',
    amount: 350,
    category: 'Personal & Gifts',
    subcategory: 'Health',
    tags: ['personal'],
    paymentMode: 'Cash',
    accountId: ACCOUNTS.cash,
    date: '2026-09-14',
  }),
  spend('exp_0915_veg', {
    title: 'Vegetables and milk',
    amount: 380,
    category: 'Food & Groceries',
    subcategory: 'Groceries',
    tags: ['home'],
    date: '2026-09-15',
  }),
  spend('exp_0916_metro', {
    title: 'Metro card',
    amount: 200,
    category: 'Transport & Fuel',
    subcategory: 'Cab',
    tags: ['commute'],
    accountId: ACCOUNTS.debit,
    date: '2026-09-16',
  }),
  spend('rec_netflix_2026-09-17', {
    title: 'Netflix',
    amount: 649,
    category: 'Shopping & Lifestyle',
    subcategory: 'Subscriptions',
    tags: ['bills'],
    date: '2026-09-17',
    recurringTemplateId: 'netflix',
    occurrenceDate: '2026-09-17',
  }),
  spend('exp_0918_toll', {
    title: 'Toll',
    amount: 350,
    category: 'Transport & Fuel',
    subcategory: 'Fuel',
    tags: ['travel'],
    date: '2026-09-18',
  }),
  spend('exp_0919_cafe', {
    title: 'Cafe coffee',
    amount: 160,
    category: 'Food & Groceries',
    subcategory: 'Tea & Coffee',
    tags: ['weekend'],
    paymentMode: 'Card',
    accountId: ACCOUNTS.card,
    date: '2026-09-19',
  }),
  spend('exp_0920_emi', {
    title: 'Gadget EMI',
    amount: 602,
    category: 'Bills & EMIs',
    subcategory: 'EMI',
    tags: ['bills'],
    paymentMode: 'Bank',
    date: '2026-09-20',
  }),
  spend('exp_0921_fastag', {
    title: 'Fastag recharge',
    amount: 500,
    category: 'Transport & Fuel',
    subcategory: 'Fuel',
    tags: ['commute'],
    date: '2026-09-21',
  }),
  spend('exp_0922_gift', {
    title: 'Gift for Priya',
    amount: 1050,
    category: 'Personal & Gifts',
    subcategory: 'Gifts',
    tags: ['gift'],
    paymentMode: 'Card',
    accountId: ACCOUNTS.card,
    date: '2026-09-22',
  }),
  spend('exp_0923_biryani', {
    title: 'Weekend biryani',
    amount: 620,
    category: 'Food & Groceries',
    subcategory: 'Eating out',
    tags: ['weekend'],
    date: '2026-09-23',
  }),
  spend('exp_0924_earbuds', {
    title: 'Amazon earbuds',
    amount: 51,
    category: 'Shopping & Lifestyle',
    subcategory: 'Clothes',
    tags: ['shopping'],
    paymentMode: 'Card',
    accountId: ACCOUNTS.debit,
    date: '2026-09-24',
  }),
  spend('exp_0925_brother', {
    title: 'Brother birthday',
    amount: 3000,
    category: 'Family & Transfers',
    subcategory: 'Sibling',
    tags: ['family', 'gift'],
    date: '2026-09-25',
  }),
  spend('exp_0926_ola', {
    title: 'Ola night ride',
    amount: 350,
    category: 'Transport & Fuel',
    subcategory: 'Cab',
    tags: ['weekend'],
    paymentMode: 'Cash',
    accountId: ACCOUNTS.cash,
    date: '2026-09-26',
  }),
  spend('exp_0927_groceries', {
    title: 'Corner store groceries',
    amount: 490,
    category: 'Food & Groceries',
    subcategory: 'Groceries',
    tags: ['home'],
    paymentMode: 'Cash',
    accountId: ACCOUNTS.cash,
    date: '2026-09-27',
  }),
  spend('exp_0928_parking', {
    title: 'Parking',
    amount: 100,
    category: 'Transport & Fuel',
    subcategory: 'Fuel',
    tags: ['commute'],
    paymentMode: 'Cash',
    accountId: ACCOUNTS.cash,
    date: '2026-09-28',
  }),
  spend('exp_0929_stationery', {
    title: 'Stationery',
    amount: 350,
    category: 'Miscellaneous',
    subcategory: 'Other',
    tags: ['office'],
    date: '2026-09-29',
  }),
  spend('exp_0929_chai', {
    title: 'Morning chai',
    amount: 40,
    category: 'Food & Groceries',
    subcategory: 'Tea & Coffee',
    tags: ['office'],
    paymentMode: 'Cash',
    accountId: ACCOUNTS.cash,
    date: '2026-09-29',
  }),

  spend('exp_1001_groceries', {
    title: 'October groceries',
    amount: 1100,
    category: 'Food & Groceries',
    subcategory: 'Groceries',
    tags: ['home'],
    date: '2026-10-01',
  }),
  spend('rec_mobile_2026-10-02', {
    title: 'Mobile recharge',
    amount: 599,
    category: 'Bills & EMIs',
    subcategory: 'Mobile',
    tags: ['bills'],
    date: '2026-10-02',
    recurringTemplateId: 'mobile',
    occurrenceDate: '2026-10-02',
  }),
  spend('exp_1002_petrol', {
    title: 'Petrol',
    amount: 1600,
    category: 'Transport & Fuel',
    subcategory: 'Fuel',
    tags: ['commute'],
    paymentMode: 'Card',
    accountId: ACCOUNTS.debit,
    date: '2026-10-02',
  }),
  spend('exp_1003_lunch', {
    title: 'Client lunch',
    amount: 280,
    category: 'Food & Groceries',
    subcategory: 'Eating out',
    tags: ['office', 'client'],
    date: '2026-10-03',
  }),
  spend('rec_insurance_2026-10-04', {
    title: 'Health insurance',
    amount: 12000,
    category: 'Bills & EMIs',
    subcategory: 'EMI',
    tags: ['bills', 'health'],
    paymentMode: 'Bank',
    date: '2026-10-04',
    recurringTemplateId: 'insurance',
    occurrenceDate: '2026-10-04',
  }),
  spend('exp_1004_giftwrap', {
    title: 'Gift wrap',
    amount: 150,
    category: 'Personal & Gifts',
    subcategory: 'Gifts',
    tags: ['gift'],
    paymentMode: 'Cash',
    accountId: ACCOUNTS.cash,
    date: '2026-10-04',
  }),
  spend('rec_rent_2026-10-05', {
    title: 'House rent',
    amount: 18000,
    category: 'Household & Living',
    subcategory: 'Rent',
    tags: ['rent'],
    paymentMode: 'Bank',
    date: '2026-10-05',
    recurringTemplateId: 'rent',
    occurrenceDate: '2026-10-05',
  }),
];

function credit(id, fields) {
  return {
    id,
    type: 'credit',
    amount: fields.amount,
    note: fields.note,
    source: fields.source,
    accountId: fields.accountId || ACCOUNTS.hdfc,
    date: fields.date,
    monthKey: fields.date.slice(0, 7),
    recurringTemplateId: fields.recurringTemplateId || null,
    occurrenceDate: fields.occurrenceDate || null,
  };
}

function transfer(id, fields) {
  return {
    id,
    type: 'transfer',
    amount: fields.amount,
    note: fields.note,
    fromAccountId: fields.fromAccountId,
    toAccountId: fields.toAccountId,
    date: fields.date,
    monthKey: fields.date.slice(0, 7),
  };
}

const walletTransactions = [
  credit('tx_0825_freelance', {
    amount: 18000,
    note: 'Freelance project',
    source: 'income',
    date: '2026-08-25',
  }),
  transfer('tx_0826_savings', {
    amount: 10000,
    note: 'Move to savings',
    fromAccountId: ACCOUNTS.hdfc,
    toAccountId: ACCOUNTS.sbi,
    date: '2026-08-26',
  }),
  credit('tx_0828_priya', {
    amount: 800,
    note: 'Priya paid back',
    source: 'money_back',
    accountId: ACCOUNTS.cash,
    date: '2026-08-28',
  }),
  credit('rec_salary_2026-09-01', {
    amount: 85000,
    note: 'Salary',
    source: 'income',
    date: '2026-09-01',
    recurringTemplateId: 'salary',
    occurrenceDate: '2026-09-01',
  }),
  transfer('tx_0902_savings', {
    amount: 20000,
    note: 'Monthly savings',
    fromAccountId: ACCOUNTS.hdfc,
    toAccountId: ACCOUNTS.sbi,
    date: '2026-09-02',
  }),
  transfer('tx_0905_cash', {
    amount: 3000,
    note: 'Cash for the week',
    fromAccountId: ACCOUNTS.hdfc,
    toAccountId: ACCOUNTS.cash,
    date: '2026-09-05',
  }),
  transfer('tx_0910_card', {
    amount: 6500,
    note: 'Credit card bill',
    fromAccountId: ACCOUNTS.hdfc,
    toAccountId: ACCOUNTS.card,
    date: '2026-09-10',
  }),
  credit('tx_0914_freelance', {
    amount: 15000,
    note: 'Freelance design',
    source: 'income',
    date: '2026-09-14',
  }),
  credit('tx_0918_deposit', {
    amount: 2000,
    note: 'Cash deposit',
    source: 'manual',
    accountId: ACCOUNTS.cash,
    date: '2026-09-18',
  }),
  credit('tx_0922_rahul', {
    amount: 1200,
    note: 'Rahul paid back',
    source: 'money_back',
    accountId: ACCOUNTS.cash,
    date: '2026-09-22',
  }),
  credit('rec_salary_2026-10-01', {
    amount: 85000,
    note: 'Salary',
    source: 'income',
    date: '2026-10-01',
    recurringTemplateId: 'salary',
    occurrenceDate: '2026-10-01',
  }),
  transfer('tx_1002_savings', {
    amount: 15000,
    note: 'October savings',
    fromAccountId: ACCOUNTS.hdfc,
    toAccountId: ACCOUNTS.sbi,
    date: '2026-10-02',
  }),
  credit('tx_1003_client', {
    amount: 6000,
    note: 'Client payment',
    source: 'income',
    date: '2026-10-03',
  }),
];

const outOfRange = [...expenses, ...walletTransactions].filter(
  (row) => row.date < START || row.date > END
);
if (outOfRange.length) {
  throw new Error(`Rows outside ${START}..${END}: ${outOfRange.map((row) => row.id).join(', ')}`);
}

const monthlyIncomes = {};
const monthlyWallets = {};
for (const tx of walletTransactions) {
  if (tx.type !== 'credit') continue;
  monthlyWallets[tx.monthKey] = (monthlyWallets[tx.monthKey] || 0) + tx.amount;
  if (tx.source === 'income') {
    monthlyIncomes[tx.monthKey] = (monthlyIncomes[tx.monthKey] || 0) + tx.amount;
  }
}

const CATEGORY_NAMES = [
  'Food & Groceries',
  'Household & Living',
  'Transport & Fuel',
  'Shopping & Lifestyle',
  'Bills & EMIs',
  'Family & Transfers',
  'Personal & Gifts',
  'Miscellaneous',
];

const MAIN_IDS = [
  'food_groceries',
  'household_living',
  'transport_fuel',
  'shopping_lifestyle',
  'bills_emis',
  'family_transfers',
  'personal_gifts',
  'miscellaneous',
];

const categoryColors = {
  'Food & Groceries': '#f59e0b',
  'Household & Living': '#3b82f6',
  'Transport & Fuel': '#8b5cf6',
  'Shopping & Lifestyle': '#ec4899',
  'Bills & EMIs': '#10b981',
  'Family & Transfers': '#06b6d4',
  'Personal & Gifts': '#ef4444',
  Miscellaneous: '#6b7280',
};

function profileBody() {
  return {
    email: EMAIL,
    displayName: DISPLAY_NAME,
    role: 'user',
    monthlyWallets,
    monthlyIncomes,
    monthlyBudget: 0,
    monthlyIncome: monthlyIncomes['2026-09'] || 0,
    categoryBudgets: {
      'Food & Groceries': 11000,
      'Household & Living': 20000,
      'Transport & Fuel': 4000,
      'Shopping & Lifestyle': 5000,
      'Bills & EMIs': 4000,
      'Family & Transfers': 10000,
      'Personal & Gifts': 2000,
      Miscellaneous: 2000,
    },
    categories: CATEGORY_NAMES,
    mainCategories: MAIN_IDS.map((id, index) => ({
      id,
      name: CATEGORY_NAMES[index],
      hidden: false,
    })),
    subcategories: {
      food_groceries: ['Groceries', 'Eating out', 'Tea & Coffee'],
      household_living: ['Rent', 'Utilities'],
      transport_fuel: ['Fuel', 'Cab'],
      shopping_lifestyle: ['Clothes', 'Subscriptions'],
      bills_emis: ['Mobile', 'Internet', 'EMI'],
      family_transfers: ['Parents', 'Sibling'],
      personal_gifts: ['Health', 'Gifts'],
      miscellaneous: ['Other'],
    },
    categoryColors,
    habits: {
      savingsGoalPercent: 20,
      savingsGoalEnabled: true,
      limitThresholds: [50, 75, 90, 100],
    },
    accounts: [
      { id: ACCOUNTS.hdfc, name: 'HDFC Salary', kind: 'salary' },
      { id: ACCOUNTS.sbi, name: 'SBI Savings', kind: 'savings', setAside: true },
      { id: ACCOUNTS.cash, name: 'Cash', kind: 'other' },
      { id: ACCOUNTS.debit, name: 'ICICI Debit', kind: 'debit' },
      {
        id: ACCOUNTS.card,
        name: 'HDFC Credit Card',
        kind: 'credit',
        creditLimit: 50000,
        dueDay: 10,
      },
    ],
    accountOpenings: {
      [ACCOUNTS.hdfc]: 8000,
      [ACCOUNTS.sbi]: 40000,
      [ACCOUNTS.cash]: 1500,
      [ACCOUNTS.debit]: 0,
      [ACCOUNTS.card]: 6500,
    },
    peopleGroups: [
      {
        id: GROUPS.flat,
        name: 'Flatmates',
        members: [
          { id: MEMBERS.self, name: DISPLAY_NAME, isSelf: true },
          { id: MEMBERS.priya, name: 'Priya', isSelf: false },
          { id: MEMBERS.rahul, name: 'Rahul', isSelf: false },
        ],
      },
      {
        id: GROUPS.family,
        name: 'Family',
        members: [
          { id: MEMBERS.self, name: DISPLAY_NAME, isSelf: true },
          { id: MEMBERS.mom, name: 'Mom', isSelf: false },
          { id: MEMBERS.dad, name: 'Dad', isSelf: false },
        ],
      },
    ],
    splitGroups: [],
    recurringExpenses: [
      {
        id: 'rent',
        title: 'House rent',
        amount: 18000,
        category: 'Household & Living',
        paymentMode: 'Bank',
        accountId: ACCOUNTS.hdfc,
        cadence: 'monthly',
        nextDate: '2026-11-05',
        endDate: null,
        maxOccurrences: null,
        runCount: 2,
        enabled: true,
        postedDates: ['2026-09-05', '2026-10-05'],
      },
      {
        id: 'mobile',
        title: 'Mobile recharge',
        amount: 599,
        category: 'Bills & EMIs',
        paymentMode: 'UPI',
        accountId: ACCOUNTS.hdfc,
        cadence: 'monthly',
        nextDate: '2026-11-02',
        endDate: null,
        maxOccurrences: null,
        runCount: 2,
        enabled: true,
        postedDates: ['2026-09-02', '2026-10-02'],
      },
      {
        id: 'netflix',
        title: 'Netflix',
        amount: 649,
        category: 'Shopping & Lifestyle',
        paymentMode: 'UPI',
        accountId: ACCOUNTS.hdfc,
        cadence: 'monthly',
        nextDate: '2026-10-17',
        endDate: null,
        maxOccurrences: null,
        runCount: 1,
        enabled: true,
        postedDates: ['2026-09-17'],
      },
      {
        id: 'insurance',
        title: 'Health insurance',
        amount: 12000,
        category: 'Bills & EMIs',
        paymentMode: 'Bank',
        accountId: ACCOUNTS.hdfc,
        cadence: 'yearly',
        nextDate: '2027-10-04',
        endDate: null,
        maxOccurrences: null,
        runCount: 1,
        enabled: true,
        postedDates: ['2026-10-04'],
      },
      {
        id: 'tea',
        title: 'Weekly chai',
        amount: 40,
        category: 'Food & Groceries',
        paymentMode: 'Cash',
        accountId: ACCOUNTS.cash,
        cadence: 'weekly',
        nextDate: '2026-10-06',
        endDate: null,
        maxOccurrences: null,
        runCount: 1,
        enabled: true,
        postedDates: ['2026-09-29'],
      },
      {
        id: 'maintenance',
        title: 'Society maintenance',
        amount: 500,
        category: 'Household & Living',
        paymentMode: 'UPI',
        accountId: ACCOUNTS.hdfc,
        cadence: 'monthly',
        nextDate: '2026-09-29',
        endDate: null,
        maxOccurrences: null,
        runCount: 0,
        enabled: true,
        postedDates: [],
      },
      {
        id: 'gym',
        title: 'Gym membership',
        amount: 1500,
        category: 'Personal & Gifts',
        paymentMode: 'UPI',
        accountId: ACCOUNTS.hdfc,
        cadence: 'monthly',
        nextDate: '2026-09-15',
        endDate: null,
        maxOccurrences: null,
        runCount: 0,
        enabled: false,
        postedDates: [],
      },
    ],
    recurringIncome: [
      {
        id: 'salary',
        title: 'Salary',
        amount: 85000,
        cadence: 'monthly',
        nextDate: '2026-11-01',
        accountId: ACCOUNTS.hdfc,
        enabled: true,
        runCount: 2,
        postedDates: ['2026-09-01', '2026-10-01'],
      },
      {
        id: 'retainer',
        title: 'Freelance retainer',
        amount: 4000,
        cadence: 'weekly',
        nextDate: '2026-10-06',
        accountId: ACCOUNTS.hdfc,
        enabled: true,
        runCount: 0,
        postedDates: [],
      },
    ],
    monthlyAllocations: {
      '2026-08': {
        essentials: 8000,
        bills: 1000,
        savings: 10000,
        goals: 2000,
        investment: 0,
        flexible: 3000,
      },
      '2026-09': {
        essentials: 25000,
        bills: 8000,
        savings: 20000,
        goals: 8000,
        investment: 5000,
        flexible: 15000,
      },
      '2026-10': {
        essentials: 25000,
        bills: 14000,
        savings: 15000,
        goals: 8000,
        investment: 5000,
        flexible: 12000,
      },
    },
    goals: [
      {
        id: 'goal_emergency',
        name: 'Emergency fund',
        kind: 'emergency',
        target: 180000,
        saved: 45000,
        monthlyContribution: 10000,
        deadline: '',
      },
      {
        id: 'goal_goa',
        name: 'Goa trip',
        kind: 'custom',
        target: 40000,
        saved: 12000,
        monthlyContribution: 8000,
        deadline: '2026-12-20',
      },
      {
        id: 'goal_laptop',
        name: 'New laptop',
        kind: 'custom',
        target: 80000,
        saved: 25000,
        monthlyContribution: 5000,
        deadline: '2027-03-01',
      },
    ],
    activityLog: [],
    loginCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function clearCollection(db, uid, name) {
  const snap = await getDocs(collection(db, 'users', uid, name));
  let batch = writeBatch(db);
  let count = 0;
  let pending = 0;
  for (const item of snap.docs) {
    batch.delete(item.ref);
    pending += 1;
    count += 1;
    if (pending === 400) {
      await batch.commit();
      batch = writeBatch(db);
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  return count;
}

async function writeRows(db, uid, name, rows) {
  let batch = writeBatch(db);
  let pending = 0;
  for (const row of rows) {
    const { id, ...data } = row;
    const payload = { ...data, createdAt: serverTimestamp() };
    if (!payload.recurringTemplateId) {
      delete payload.recurringTemplateId;
      delete payload.occurrenceDate;
    }
    batch.set(doc(db, 'users', uid, name, id), payload);
    pending += 1;
    if (pending === 400) {
      await batch.commit();
      batch = writeBatch(db);
      pending = 0;
    }
  }
  if (pending) await batch.commit();
}

async function main() {
  const env = loadEnv(new URL('../.env', import.meta.url));
  const app = initializeApp({
    apiKey: env.REACT_APP_FIREBASE_API_KEY,
    authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.REACT_APP_FIREBASE_APP_ID,
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  let created = false;
  let user;
  try {
    const credential = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    user = credential.user;
    created = true;
  } catch (error) {
    if (error?.code !== 'auth/email-already-in-use') throw error;
    const credential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
    user = credential.user;
  }

  await updateProfile(user, { displayName: DISPLAY_NAME });
  const uid = user.uid;

  const removedExpenses = await clearCollection(db, uid, 'expenses');
  const removedWallet = await clearCollection(db, uid, 'walletTransactions');
  await setDoc(doc(db, 'users', uid), profileBody());
  await writeRows(db, uid, 'expenses', expenses);
  await writeRows(db, uid, 'walletTransactions', walletTransactions);

  const byCategory = {};
  for (const expense of expenses.filter((row) => row.date.startsWith('2026-09'))) {
    byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
  }

  console.log(JSON.stringify({
    created,
    uid,
    email: EMAIL,
    range: `${START} to ${END}`,
    expenses: expenses.length,
    walletTransactions: walletTransactions.length,
    replacedExpenses: removedExpenses,
    replacedWallet: removedWallet,
    septemberSpendByCategory: byCategory,
    monthlyIncomes,
    monthlyWallets,
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error?.code || 'seed-failed', error?.message || error);
    process.exit(1);
  });
