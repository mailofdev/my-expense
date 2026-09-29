const CHANGES = [
  {
    title: 'Today',
    points: [
      'Left to spend is the large centered number. Safe to spend sits under it, with a short explanation.',
      'Income, Spent, Set aside, and Left are centered. Received back appears when a friend has paid you back.',
      'Add expense is directly under that summary. Amount and date are on one line. Category, payment, and account are chips, and a suggestion appears as you type.',
      'Upcoming bills show the date and amount. Search sits on this page and opens the matching day.',
      'Tap the date to open the calendar. The arrows move the day and keep you in the same month.',
    ],
  },
  {
    title: 'Income',
    points: [
      'Salary is income. Money a friend sends back is Money back. It raises left to spend and does not raise Income.',
      'Entries you already saved stay income. Tap Money back on a row only when that amount was a repayment. Left to spend stays the same.',
      'This screen no longer repeats the Today dashboard. One line shows what is left and opens Today.',
      'The money calculator suggests a salary split: 25% investment, 10% emergency fund, 15% bike/car, 15% personal, and 35% home. Edit any line, then save.',
      'Accounts, transfers, and card payments stay under Accounts. A savings target, goals, and repeats stay under Goals & repeats.',
    ],
  },
  {
    title: 'Reports and Tools',
    points: [
      'Spent is centered. The review centers Income, Spent, and Left, then compares the month and lists the largest expenses.',
      'A large expense or a day opens that day on Today. The chart and category limits stay under Show.',
      'Guide and What’s new are in the profile menu. Tools is search and export, split bills, and resetting this month. Category limits are set in the money calculator.',
      'Reset still removes only this month’s income, money back, expenses, and transfers. Accounts, repeats, and other months stay.',
    ],
  },
];

export default function WhatsNewPanel() {
  return (
    <div>
      <p className="m-0 text-sm leading-relaxed text-muted">
        What changed in this update. Your saved salary, spends, and accounts were not rewritten.
      </p>
      <div className="mt-4 space-y-4">
        {CHANGES.map((group) => (
          <section key={group.title}>
            <h3 className="m-0 text-sm font-semibold text-ink">{group.title}</h3>
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {group.points.map((point) => (
                <li key={point} className="border-t border-edge/50 pt-2 text-sm leading-relaxed text-ink first:border-0 first:pt-0">
                  {point}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
