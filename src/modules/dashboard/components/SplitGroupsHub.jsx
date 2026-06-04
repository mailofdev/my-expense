import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DisclosureToggle from '../../../shared/components/DisclosureToggle';
import {
  addSplitGroupExpense,
  createSplitGroup,
  markOnboardingSeen,
  markSettlementPaid,
  selectSplitOverview,
  updateFinanceSettings,
} from '../store/dashboardSlice';
import {
  calculateGroupDebts,
  computeSplitShares,
  sharesMatchTotal,
  sumShares,
} from '../../../core/utils/split';
import { formatINR } from '../../../core/utils/currency';

const SPLIT_TYPES = [
  { value: 'equal', label: 'Split equally' },
  { value: 'exact', label: 'Exact amounts (₹)' },
  { value: 'percentage', label: 'By percentage (%)' },
  { value: 'unequal', label: 'By shares (weights)' },
];

const splitHint = {
  equal: 'Total is divided equally among all members.',
  exact: 'Enter how much each person owes in ₹.',
  percentage: 'Enter % per person (should add to 100).',
  unequal: 'Enter weights (e.g. 2 and 1 → 2/3 and 1/3).',
};

export default function SplitGroupsHub() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { splitGroups, onboardingSeen, saving, error } = useSelector((state) => state.dashboard);
  const splitOverview = useSelector(selectSplitOverview);

  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [paidBy, setPaidBy] = useState('You');
  const [splitType, setSplitType] = useState('equal');
  const [memberValues, setMemberValues] = useState({});
  const [showCustomSplit, setShowCustomSplit] = useState(false);
  const [formError, setFormError] = useState('');

  const selectedGroup = useMemo(
    () => splitGroups.find((group) => group.id === selectedGroupId) || splitGroups[0],
    [selectedGroupId, splitGroups]
  );

  const members = useMemo(
    () => selectedGroup?.members || ['You'],
    [selectedGroup?.members]
  );

  useEffect(() => {
    if (selectedGroup?.id && !selectedGroupId) {
      setSelectedGroupId(selectedGroup.id);
    }
  }, [selectedGroup, selectedGroupId]);

  useEffect(() => {
    if (members.includes(paidBy)) return;
    setPaidBy(members[0] || 'You');
  }, [members, paidBy]);

  useEffect(() => {
    const next = {};
    members.forEach((member) => {
      next[member] = memberValues[member] ?? '';
    });
    setMemberValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset inputs when member list changes
  }, [members.join('|'), splitType]);

  const amountNum = Number(expenseAmount) || 0;
  const previewShares = useMemo(() => {
    if (amountNum <= 0 || !members.length) return {};
    const sharesConfig = { shares: {} };
    members.forEach((member) => {
      sharesConfig.shares[member] = Number(memberValues[member]) || 0;
    });
    return computeSplitShares(amountNum, members, splitType, sharesConfig);
  }, [amountNum, members, splitType, memberValues]);

  const previewValid = amountNum > 0 && sharesMatchTotal(previewShares, amountNum);

  const liveDebtState = useMemo(() => {
    if (!selectedGroup) return null;
    return calculateGroupDebts(selectedGroup);
  }, [selectedGroup]);

  const memberBalances = liveDebtState?.balances || {};
  const pendingSettlements = liveDebtState?.simplifiedDebts || [];

  const handleCreateGroup = (event) => {
    event.preventDefault();
    setFormError('');
    const extra = groupMembers
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    dispatch(createSplitGroup({ uid: user.uid, group: { name: groupName, members: extra } })).then(
      (result) => {
        if (!result.error) {
          setGroupName('');
          setGroupMembers('');
          setSelectedGroupId(result.payload.id);
        }
      }
    );
  };

  const handleAddExpense = (event) => {
    event.preventDefault();
    setFormError('');
    if (!selectedGroup) return;

    if (amountNum <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }

    if (splitType !== 'equal' && !previewValid) {
      setFormError('Split amounts must match the expense total.');
      return;
    }

    const sharesConfig = { shares: {} };
    members.forEach((member) => {
      sharesConfig.shares[member] = Number(memberValues[member]) || 0;
    });

    dispatch(
      addSplitGroupExpense({
        uid: user.uid,
        groupId: selectedGroup.id,
        expenseInput: {
          title: expenseTitle,
          amount: amountNum,
          paidBy,
          splitType,
          participants: members,
          splitConfig: splitType === 'equal' ? {} : sharesConfig,
        },
      })
    ).then((result) => {
      if (result.error) {
        setFormError(result.payload || 'Could not add expense.');
        return;
      }
      setExpenseTitle('');
      setExpenseAmount('');
      setSplitType('equal');
      setShowCustomSplit(false);
      setMemberValues({});
    });
  };

  const balanceLabel = (value) => {
    if (value > 0.01) return { text: `gets back ${formatINR(value)}`, className: 'text-success' };
    if (value < -0.01) return { text: `owes ${formatINR(Math.abs(value))}`, className: 'text-danger' };
    return { text: 'settled', className: 'text-muted' };
  };

  return (
    <div className="feature-panel">
      {!onboardingSeen && (
        <section className="card card-subtle">
          <h2 className="card-title">How splitting works</h2>
          <ol className="m-0 space-y-2 pl-5 text-sm text-muted">
            <li>Create a group and add member names.</li>
            <li>Add an expense — who paid and how to split.</li>
            <li>We calculate who owes whom (minimum payments).</li>
          </ol>
          <button
            type="button"
            className="btn-outline btn-sm mt-4"
            onClick={() => {
              dispatch(markOnboardingSeen());
              dispatch(updateFinanceSettings({ uid: user.uid, updates: { onboardingSeen: true } }));
            }}
          >
            Got it
          </button>
        </section>
      )}

      <section className="card">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-sm bg-surface-2 p-3">
            <p className="m-0 section-label">You owe</p>
            <p className="m-0 font-semibold text-danger">{formatINR(splitOverview.youOwe)}</p>
          </div>
          <div className="rounded-sm bg-surface-2 p-3">
            <p className="m-0 section-label">Owed to you</p>
            <p className="m-0 font-semibold text-success">{formatINR(splitOverview.owedToYou)}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">New group</h2>
        <form className="space-y-3" onSubmit={handleCreateGroup}>
          <input
            className="input"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name (e.g. Goa Trip)"
            required
          />
          <input
            className="input"
            value={groupMembers}
            onChange={(e) => setGroupMembers(e.target.value)}
            placeholder="Other members: Raj, Priya (comma separated)"
          />
          <p className="m-0 text-xs text-muted">You are always included as &quot;You&quot;.</p>
          <button className="btn-primary btn-full" type="submit" disabled={saving}>
            Create group
          </button>
        </form>
      </section>

      {!!splitGroups.length && selectedGroup && (
        <>
          <section className="card">
            <label className="label">
              Active group
              <select
                className="input mt-1"
                value={selectedGroup.id}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {splitGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <p className="section-label mt-4">Member balances</p>
            <ul className="m-0 list-none space-y-2 p-0">
              {members.map((member) => {
                const bal = memberBalances[member] ?? 0;
                const label = balanceLabel(bal);
                return (
                  <li
                    key={member}
                    className="flex items-center justify-between rounded-sm bg-surface-2 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{member}</span>
                    <span className={label.className}>{label.text}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card">
            <h2 className="card-title">Add expense</h2>
            {(formError || error) && (
              <p className="mb-3 text-sm text-red-300">{formError || error}</p>
            )}
            <form className="space-y-3" onSubmit={handleAddExpense}>
              <input
                className="input"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                placeholder="What was it? (Dinner, Cab…)"
                required
              />
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="Total amount (₹)"
                required
              />
              <label className="label">
                Paid by
                <select className="input mt-1" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                  {members.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </label>

              <DisclosureToggle
                open={showCustomSplit}
                onToggle={() => setShowCustomSplit((v) => !v)}
                title="Custom split"
                hintClosed="Default: split equally among everyone"
                controlsId="custom-split-panel"
              />

              {showCustomSplit && (
                <div id="custom-split-panel" className="space-y-3 rounded-sm border border-edge/60 bg-surface-2/40 p-3">
                  <label className="label">
                    Split method
                    <select
                      className="input mt-1"
                      value={splitType}
                      onChange={(e) => setSplitType(e.target.value)}
                    >
                      {SPLIT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="m-0 text-xs text-muted">{splitHint[splitType]}</p>

                  {splitType !== 'equal' &&
                    members.map((member) => (
                      <label key={member} className="label">
                        {member}
                        <input
                          className="input mt-1"
                          type="number"
                          min="0"
                          step="0.01"
                          value={memberValues[member] ?? ''}
                          onChange={(e) =>
                            setMemberValues((prev) => ({ ...prev, [member]: e.target.value }))
                          }
                          placeholder={
                            splitType === 'percentage'
                              ? '%'
                              : splitType === 'unequal'
                                ? 'weight'
                                : '₹'
                          }
                        />
                      </label>
                    ))}

                  {amountNum > 0 && (
                    <div className="rounded-sm bg-surface-2 px-3 py-2 text-xs">
                      <p className="m-0 mb-1 font-medium text-[#f0f4f2]">Preview</p>
                      {members.map((member) => (
                        <p key={member} className="m-0 text-muted">
                          {member}: {formatINR(previewShares[member] || 0)}
                        </p>
                      ))}
                      <p className={`m-0 mt-2 ${previewValid ? 'text-success' : 'text-danger'}`}>
                        Total: {formatINR(sumShares(previewShares))}
                        {!previewValid && ' — must match expense amount'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button className="btn-primary btn-full" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Add expense'}
              </button>
            </form>
          </section>

          {!!pendingSettlements.length && (
            <section className="card">
              <h2 className="card-title">Settle up</h2>
              <p className="card-desc">Suggested payments to clear all balances.</p>
              <div className="space-y-2">
                {pendingSettlements.map((settlement) => (
                  <div
                    key={settlement.id}
                    className="flex items-center justify-between gap-2 rounded-sm border border-edge bg-surface-2 px-3 py-2 text-sm"
                  >
                    <span>
                      <strong>{settlement.from}</strong> → <strong>{settlement.to}</strong>{' '}
                      {formatINR(settlement.amount)}
                    </span>
                    <button
                      type="button"
                      className="btn-outline btn-sm shrink-0"
                      onClick={() =>
                        dispatch(
                          markSettlementPaid({
                            uid: user.uid,
                            groupId: selectedGroup.id,
                            settlementId: settlement.id || `${settlement.from}-${settlement.to}`,
                          })
                        )
                      }
                    >
                      Paid
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!!selectedGroup.expenses?.length && (
            <section className="card">
              <h2 className="card-title">Recent in this group</h2>
              <ul className="m-0 list-none space-y-2 p-0">
                {selectedGroup.expenses.slice(0, 8).map((expense) => (
                  <li
                    key={expense.id}
                    className="rounded-sm bg-surface-2 px-3 py-2 text-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{expense.title}</span>
                      <span>{formatINR(expense.amount)}</span>
                    </div>
                    <p className="m-0 mt-1 text-xs text-muted">
                      {expense.paidBy} paid · {expense.splitType || 'equal'} split
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {!splitGroups.length && (
        <p className="empty-state">Create a group above to start splitting expenses.</p>
      )}
    </div>
  );
}
