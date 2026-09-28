import { useState } from 'react';

const PAGES = [
  {
    id: 'today',
    title: 'Today',
    lead: 'Home. It answers how much money is still yours this month.',
    points: [
      'The large number is left to spend: income, minus spends, minus money parked in a set-aside account.',
      'Safe today is what remains after planned savings and bills still due, split across the days left.',
      'Upcoming shows bills and income due in the next two weeks, with the date and amount.',
      'Add an expense with a name, amount, category, payment, account, and date. A suggestion appears as you type. Tap another chip to change it.',
      'Search finds a shop, tag, category, or date, then opens that day.',
      'The day bar moves between days and stays in the same month.',
    ],
  },
  {
    id: 'income',
    title: 'Income',
    lead: 'Where money comes in, and where account balances live.',
    points: [
      'Add income first, and choose Salary. Left to spend and safe to spend appear after that.',
      'Money a friend sends back is Money back, not Salary. It raises left to spend and stays out of Income. An older income entry stays income until you mark it.',
      'Accounts show what is available. Set-aside balances are parked and are not part of left to spend.',
      'A card purchase is the expense. Paying the card later is a transfer, not a second expense.',
      'A transfer moves money from one account to another. It does not count as spending.',
      'Plan holds savings, goals, allocation, and repeats. Open it when you want them. They stay out of the way until then.',
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    lead: 'Where the money went, without starting from a chart.',
    points: [
      'The month total is what you spent. The review compares it with last month and shows the biggest categories.',
      'Largest expenses list the biggest individual spends. Tap one to open that day on Today.',
      'Search works the same way as on Today.',
      'The category chart and category limits are under Show.',
      'By day lists each day. Tap a day to open it on Today.',
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    lead: 'Search, sharing, limits, and cleanup. Nothing here is required to track spending.',
    points: [
      'Search & export finds spends, then downloads a PDF or CSV.',
      'Split bills keeps people groups so one expense can be shared.',
      'Category limits are optional monthly caps. Warnings appear on Today when you are close.',
      'Data management resets this month’s income, expenses, and transfers. Accounts, repeats, limits, and other months stay as they are.',
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
