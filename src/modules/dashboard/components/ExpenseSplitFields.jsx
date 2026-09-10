import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPeopleGroups } from '../store/dashboardSlice';
import {
  buildEqualSplit,
  getGroupById,
  getSelfMember,
  describeEqualShare,
} from '../utils/groups';

/**
 * Optional equal-split controls for add/edit expense.
 * value: { enabled, groupId, paidBy, memberIds }
 */
export default function ExpenseSplitFields({ amount, value, onChange }) {
  const peopleGroups = useSelector(selectPeopleGroups);
  const enabled = Boolean(value?.enabled);
  const groupId = value?.groupId || peopleGroups[0]?.id || '';
  const group = getGroupById(peopleGroups, groupId);
  const selfId = getSelfMember(group)?.id || '';
  const paidBy = value?.paidBy || selfId;
  const memberIds = useMemo(() => {
    if (Array.isArray(value?.memberIds)) return value.memberIds;
    return group?.members?.map((m) => m.id) || [];
  }, [value?.memberIds, group?.members]);

  const preview = useMemo(() => {
    if (!enabled || !group) return null;
    return buildEqualSplit({
      amount,
      groupId: group.id,
      paidBy,
      memberIds,
      groups: peopleGroups,
    });
  }, [enabled, group, amount, paidBy, memberIds, peopleGroups]);

  if (!peopleGroups.length) {
    return null;
  }

  const patch = (partial) => {
    onChange?.({
      enabled,
      groupId,
      paidBy,
      memberIds,
      ...partial,
    });
  };

  const toggleMember = (memberId) => {
    const set = new Set(memberIds);
    if (set.has(memberId)) set.delete(memberId);
    else set.add(memberId);
    let next = [...set];
    if (!next.includes(paidBy) && paidBy) next = [paidBy, ...next];
    patch({ memberIds: next });
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-[#f0f4f2]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            if (!e.target.checked) {
              onChange?.({ enabled: false, groupId: '', paidBy: '', memberIds: [] });
              return;
            }
            const first = group || peopleGroups[0];
            onChange?.({
              enabled: true,
              groupId: first.id,
              paidBy: getSelfMember(first)?.id || first.members[0]?.id || '',
              memberIds: first.members.map((m) => m.id),
            });
          }}
        />
        Split with a group
      </label>

      {enabled && (
        <div className="space-y-2 rounded-sm border border-edge/60 bg-surface-2/40 p-3">
          <label className="label mb-0">
            Group
            <select
              className="input mt-1"
              value={groupId}
              onChange={(e) => {
                const nextGroup = getGroupById(peopleGroups, e.target.value);
                if (!nextGroup) return;
                patch({
                  groupId: nextGroup.id,
                  paidBy: getSelfMember(nextGroup)?.id || nextGroup.members[0]?.id || '',
                  memberIds: nextGroup.members.map((m) => m.id),
                });
              }}
            >
              {peopleGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          {group && (
            <>
              <label className="label mb-0">
                Paid by
                <select
                  className="input mt-1"
                  value={paidBy}
                  onChange={(e) => {
                    const nextPaidBy = e.target.value;
                    const nextMembers = memberIds.includes(nextPaidBy)
                      ? memberIds
                      : [nextPaidBy, ...memberIds];
                    patch({ paidBy: nextPaidBy, memberIds: nextMembers });
                  }}
                >
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.isSelf ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <p className="label mb-2">Shared by</p>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {group.members.map((m) => {
                    const checked = memberIds.includes(m.id);
                    return (
                      <li key={m.id}>
                        <label
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-2 py-1 text-xs ${
                            checked
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-edge/70 text-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            disabled={m.id === paidBy}
                            onChange={() => toggleMember(m.id)}
                          />
                          {m.name}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {preview ? (
                <p className="m-0 text-xs text-muted">
                  Equal split · {preview.memberIds.length} people ·{' '}
                  {describeEqualShare(preview.shares, amount, preview.memberIds.length)}
                </p>
              ) : (
                <p className="m-0 text-xs text-danger">Select at least 2 people to split.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function resolveSplitPayload(splitUi, amount, peopleGroups) {
  if (!splitUi?.enabled) return null;
  return buildEqualSplit({
    amount,
    groupId: splitUi.groupId,
    paidBy: splitUi.paidBy,
    memberIds: splitUi.memberIds,
    groups: peopleGroups,
  });
}

export function splitUiFromExpense(split, peopleGroups) {
  if (!split?.groupId) {
    return { enabled: false, groupId: '', paidBy: '', memberIds: [] };
  }
  const group = getGroupById(peopleGroups, split.groupId);
  if (!group) {
    return { enabled: false, groupId: '', paidBy: '', memberIds: [] };
  }
  return {
    enabled: true,
    groupId: split.groupId,
    paidBy: split.paidBy || getSelfMember(group)?.id || '',
    memberIds: Array.isArray(split.memberIds)
      ? split.memberIds
      : group.members.map((m) => m.id),
  };
}
