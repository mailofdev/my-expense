import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatINR } from '../../../core/utils/currency';
import { openingsForDesiredBalances } from '../utils/accounts';
import {
  updateFinanceSettings,
  selectAccountsWithBalances,
} from '../store/dashboardSlice';

/**
 * Set each account to what the bank / card actually shows.
 * Adjusts openings so live balances match without deleting history.
 */
export default function UpdateAccountBalances() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { expenses, walletTransactions, saving } = useSelector((state) => state.dashboard);
  const { accounts } = useSelector(selectAccountsWithBalances);

  const [open, setOpen] = useState(false);
  const [amounts, setAmounts] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    const next = {};
    accounts.forEach((account) => {
      next[account.id] = String(
        account.isCredit ? Math.round(account.outstanding || 0) : Math.round(account.balance || 0)
      );
    });
    setAmounts(next);
  }, [accounts]);

  const setAmount = (id, value) => {
    setAmounts((prev) => ({ ...prev, [id]: value }));
    setMessage('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    setMessage('');

    const desiredById = {};
    for (const account of accounts) {
      const raw = amounts[account.id];
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        setMessage(
          account.isCredit
            ? `Enter outstanding for ${account.name} (0 or more).`
            : `Enter a balance for ${account.name} (0 or more).`
        );
        return;
      }
      desiredById[account.id] = Math.round(value);
    }

    const accountOpenings = openingsForDesiredBalances({
      accounts,
      expenses,
      walletTransactions,
      desiredById,
    });

    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: { accountOpenings },
      })
    ).then((result) => {
      if (!result.error) {
        setMessage('Balances updated.');
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not save.');
      }
    });
  };

  if (!accounts.length) return null;

  return (
    <div className="mt-4 border-t border-edge/50 pt-3">
      <button
        type="button"
        className="flex w-full items-center justify-between border-0 bg-transparent p-0 text-left"
        onClick={() => {
          setOpen((prev) => !prev);
          setMessage('');
        }}
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">Update balances</span>
          <span className="block text-xs text-muted">
            When the app and your bank do not match
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-primary">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <form className="mt-3 space-y-3" onSubmit={handleSave}>
          <p className="m-0 text-xs text-muted">
            Enter what each account shows now. Past income and spends stay; only the
            starting figures change so totals match.
          </p>
          <ul className="m-0 list-none space-y-3 p-0">
            {accounts.map((account) => (
              <li key={account.id}>
                <label className="label m-0 text-xs">
                  {account.name}
                  <span className="font-normal text-muted">
                    {account.isCredit
                      ? ` · owed now ${formatINR(account.outstanding || 0)}`
                      : ` · now ${formatINR(account.balance || 0)}`}
                  </span>
                  <input
                    className="input mt-1 py-2 text-sm"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={amounts[account.id] ?? ''}
                    onChange={(e) => setAmount(account.id, e.target.value)}
                    aria-label={
                      account.isCredit
                        ? `Outstanding on ${account.name}`
                        : `Balance for ${account.name}`
                    }
                    placeholder={account.isCredit ? 'Outstanding owed' : 'Current balance'}
                  />
                </label>
              </li>
            ))}
          </ul>
          <button type="submit" className="btn-primary btn-full btn-sm" disabled={saving}>
            {saving ? 'Saving…' : 'Save balances'}
          </button>
          {message && (
            <p
              className={`m-0 text-xs ${
                message === 'Balances updated.' ? 'text-success' : 'text-danger'
              }`}
            >
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
