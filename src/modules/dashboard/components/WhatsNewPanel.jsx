const CHANGES = [
  {
    title: 'Today',
    points: [
      'Left to spend is the large centered number. It now subtracts money you lent. Safe to spend sits under it, with a short explanation.',
      'Income, Spent, Set aside, and Left are centered. Received back appears when a friend has paid you back. Still out appears when some of that lent money has not come back.',
      'Add expense is directly under that summary. Amount and date are on one line. Category, payment, and account are chips, and a suggestion appears as you type.',
      'Search sits on this page and opens the matching day.',
      'Tap the date to open the calendar. The arrows move the day and keep you in the same month.',
    ],
  },
  {
    title: 'Income',
    points: [
      'Income has Lent, next to Salary and Money back. Use it when you send money you expect back. It lowers left to spend and the account you paid from.',
      'When the money comes back, choose Money back. Left to spend goes up. Income does not. Until the full amount is back, the form shows how much is still out. A later return counts in the month it arrives.',
      'Salary is income. Money a friend sends back is Money back. It raises left to spend and does not raise Income.',
      'Entries you already saved stay income. Tap Money back on a row only when that amount was a repayment. Left to spend stays the same.',
      'This screen no longer repeats the Today dashboard. One line shows what is left and opens Today.',
      'Accounts, transfers, and card payments stay under Accounts. Use Update balances when the app and your bank do not match.',
    ],
  },
  {
    title: 'Reports and Tools',
    points: [
      'Spent is centered. The review centers Income, Spent, and Left, then compares the month and lists the largest expenses.',
      'A large expense or a day opens that day on Today. The category chart stays under Show.',
      'Guide and What’s new are in the profile menu. Tools is search and export, split bills, and resetting this month.',
      'Reset still removes only this month’s income, money back, lent, expenses, and transfers. Accounts and other months stay.',
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
