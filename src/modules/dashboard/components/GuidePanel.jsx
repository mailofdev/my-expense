import { useState } from 'react';

const PAGES = [
  {
    id: 'today',
    title: 'Today',
    lead: 'Home. It answers how much money is still yours this month.',
    points: [
      'The large centered number is left to spend: income, plus money back, minus spends, minus money in a set-aside account.',
      'Safe today is what remains after planned savings and bills still due, split across the days left. Income, Spent, Set aside, and Left sit under it. Received back appears only after a friend pays you.',
      'Add an expense next. Name, then amount and date on one line, then category, payment, and account. A suggestion appears as you type. Tap another chip to change it.',
      'Upcoming lists bills due in the next two weeks, with the date and amount.',
      'Search finds a shop, tag, category, or date, then opens that day.',
      'Tap the date to open the calendar. The arrows move between days and stay in the same month.',
    ],
  },
  {
    id: 'income',
    title: 'Income',
    lead: 'Where money comes in. The full month picture stays on Today.',
    points: [
      'Choose Salary for money you earned. Left to spend appears on Today after that.',
      'Choose Money back when a friend pays their share. Left to spend goes up. Income does not.',
      'An amount you already saved stays income until you tap Money back on that row. Left to spend does not change when you mark it.',
      'The line at the top shows what is left and opens Today.',
      'Accounts show balances. A card purchase is the expense. Paying the card later is a transfer, not a second expense. A transfer between your accounts is not spending.',
      'The money calculator splits monthly salary into investment, an emergency fund, and category limits. Edit any amount, then save.',
      'A savings target, goals, and repeats stay under Goals & repeats.',
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    lead: 'Where the money went, without starting from a chart.',
    points: [
      'The centered total is what you spent. The review centers Income, Spent, and Left, then compares this month with the last one.',
      'Largest expenses list the biggest individual spends. Tap one to open that day on Today.',
      'Search works the same way as on Today.',
      'The category chart is under Show. Spending limits come from the money calculator on Income.',
      'By day lists each day. Tap a day to open it on Today.',
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    lead: 'Search, sharing, and cleanup. Nothing here is required to track spending.',
    points: [
      'Search & export finds spends, then downloads a PDF or CSV.',
      'Split bills keeps people groups so one expense can be shared.',
      'Guide and What’s new are in the profile menu, under your initials. They are not part of Tools.',
      'Data management resets this month’s income, money back, expenses, and transfers. Accounts, repeats, limits, and other months stay as they are.',
    ],
  },
];

export default function GuidePanel({ onDone }) {
  const [index, setIndex] = useState(0);
  const page = PAGES[index];
  const last = index === PAGES.length - 1;

  return (
    <div>
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        {index + 1} of {PAGES.length}
      </p>
      <h3 className="m-0 mt-1 text-lg font-semibold tracking-tight text-ink">{page.title}</h3>
      <p className="m-0 mt-1 text-sm leading-relaxed text-muted">{page.lead}</p>
      <ol className="m-0 mt-4 list-none space-y-3 p-0">
        {page.points.map((point) => (
          <li key={point} className="border-t border-edge/50 pt-3 text-sm leading-relaxed text-ink first:border-0 first:pt-0">
            {point}
          </li>
        ))}
      </ol>
      <div className="mt-5 flex gap-2">
        {index > 0 && (
          <button
            type="button"
            className="btn-outline min-h-11 flex-1"
            onClick={() => setIndex((current) => current - 1)}
          >
            Back
          </button>
        )}
        <button
          type="button"
          className="btn-primary min-h-11 flex-1"
          onClick={() => {
            if (last) onDone?.();
            else setIndex((current) => current + 1);
          }}
        >
          {last ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  );
}
