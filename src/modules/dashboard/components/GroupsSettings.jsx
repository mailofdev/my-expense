import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createGroupId,
  createMemberId,
  ensurePeopleGroups,
  resolveSelfMemberName,
  MAX_MEMBERS_PER_GROUP,
  MAX_PEOPLE_GROUPS,
} from '../utils/groups';
import { updateFinanceSettings, selectPeopleGroups } from '../store/dashboardSlice';

export default function GroupsSettings({ embedded = false }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { saving } = useSelector((state) => state.dashboard);
  const peopleGroups = useSelector(selectPeopleGroups);
  const selfName = resolveSelfMemberName(user);

  const [groups, setGroups] = useState(peopleGroups);
  const [selectedId, setSelectedId] = useState(peopleGroups[0]?.id || '');
  const [newGroupName, setNewGroupName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setGroups(peopleGroups);
    if (!peopleGroups.some((g) => g.id === selectedId)) {
      setSelectedId(peopleGroups[0]?.id || '');
    }
  }, [peopleGroups, selectedId]);

  const selected = useMemo(
    () => groups.find((g) => g.id === selectedId) || null,
    [groups, selectedId]
  );

  const persist = (nextGroups, successMessage) => {
    const cleaned = ensurePeopleGroups(nextGroups, [], { selfName });
    setMessage('');
    dispatch(
      updateFinanceSettings({
        uid: user.uid,
        updates: { peopleGroups: cleaned },
      })
    ).then((result) => {
      if (!result.error) {
        setGroups(cleaned);
        setMessage(successMessage);
      } else {
        setMessage(typeof result.payload === 'string' ? result.payload : 'Could not save.');
      }
    });
  };

  const handleAddGroup = (e) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) {
      setMessage('Enter a group name.');
      return;
    }
    if (groups.length >= MAX_PEOPLE_GROUPS) {
      setMessage(`You can add up to ${MAX_PEOPLE_GROUPS} groups.`);
      return;
    }
    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      setMessage('That group name already exists.');
      return;
    }
    const next = [
      ...groups,
      {
        id: createGroupId(),
        name,
        members: [{ id: createMemberId(), name: selfName, isSelf: true }],
      },
    ];
    setNewGroupName('');
    setSelectedId(next[next.length - 1].id);
    persist(next, 'Group added.');
  };

  const handleRenameGroup = () => {
    if (!selected) return;
    const name = selected.name.trim();
    if (!name) {
      setMessage('Group needs a name.');
      return;
    }
    persist(
      groups.map((g) => (g.id === selected.id ? { ...g, name } : g)),
      'Group saved.'
    );
  };

  const handleDeleteGroup = () => {
    if (!selected) return;
    const ok = window.confirm(
      `Remove group “${selected.name}”? Past expense splits that used it will hide split details.`
    );
    if (!ok) return;
    const next = groups.filter((g) => g.id !== selected.id);
    setSelectedId(next[0]?.id || '');
    persist(next, 'Group removed.');
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!selected) return;
    const name = newMemberName.trim();
    if (!name) {
      setMessage('Enter a name.');
      return;
    }
    if (selected.members.length >= MAX_MEMBERS_PER_GROUP) {
      setMessage(`Up to ${MAX_MEMBERS_PER_GROUP} people per group.`);
      return;
    }
    if (selected.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      setMessage('That name is already in this group.');
      return;
    }
    const next = groups.map((g) =>
      g.id === selected.id
        ? {
            ...g,
            members: [...g.members, { id: createMemberId(), name, isSelf: false }],
          }
        : g
    );
    setNewMemberName('');
    persist(next, 'Person added.');
  };

  const handleRemoveMember = (memberId) => {
    if (!selected) return;
    const member = selected.members.find((m) => m.id === memberId);
    if (member?.isSelf) {
      setMessage(`Keep “${selfName}” in the group.`);
      return;
    }
    if (selected.members.length <= 1) {
      setMessage('Keep at least one person.');
      return;
    }
    const next = groups.map((g) =>
      g.id === selected.id
        ? { ...g, members: g.members.filter((m) => m.id !== memberId) }
        : g
    );
    persist(next, 'Person removed.');
  };

  const updateSelectedName = (name) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === selectedId ? { ...g, name } : g))
    );
    setMessage('');
  };

  return (
    <section className={embedded ? '' : 'card'}>
      {!embedded && (
        <>
          <h2 className="card-title mb-1">People groups</h2>
          <p className="card-desc mb-3">
            Groups like Trip or Flatmates. Use them to split expenses equally.
          </p>
        </>
      )}

      {message && (
        <p
          className={`mb-2 mt-0 text-sm ${
            message.endsWith('.') && !message.startsWith('Could') && !message.startsWith('Enter') && !message.startsWith('That') && !message.startsWith('You') && !message.startsWith('Up') && !message.startsWith('Keep') && !message.startsWith('Group needs')
              ? 'text-success'
              : message === 'Group added.' ||
                  message === 'Group saved.' ||
                  message === 'Group removed.' ||
                  message === 'Person added.' ||
                  message === 'Person removed.'
                ? 'text-success'
                : 'text-danger'
          }`}
        >
          {message}
        </p>
      )}

      <form className="mb-3 flex gap-2" onSubmit={handleAddGroup}>
        <input
          className="input py-2 text-sm"
          value={newGroupName}
          onChange={(e) => {
            setNewGroupName(e.target.value);
            setMessage('');
          }}
          placeholder="New group name"
          aria-label="New group name"
        />
        <button
          type="submit"
          className="btn-primary shrink-0"
          disabled={saving || groups.length >= MAX_PEOPLE_GROUPS}
        >
          Add
        </button>
      </form>

      {groups.length === 0 ? (
        <p className="m-0 text-sm text-muted">No groups yet. Add one to start splitting.</p>
      ) : (
        <>
          <ul className="m-0 mb-3 flex list-none flex-wrap gap-2 p-0">
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  className={`rounded-sm border px-2.5 py-1.5 text-sm ${
                    group.id === selectedId
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-edge/70 bg-surface text-[#f0f4f2]'
                  }`}
                  onClick={() => setSelectedId(group.id)}
                >
                  {group.name}
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="space-y-3 rounded-sm border border-edge/60 bg-surface-2/40 p-3">
              <label className="label mb-0">
                Group name
                <div className="mt-1 flex gap-2">
                  <input
                    className="input"
                    value={selected.name}
                    onChange={(e) => updateSelectedName(e.target.value)}
                    aria-label="Group name"
                  />
                  <button
                    type="button"
                    className="btn-outline shrink-0"
                    onClick={handleRenameGroup}
                    disabled={saving}
                  >
                    Save
                  </button>
                </div>
              </label>

              <div>
                <p className="label mb-2">People</p>
                <ul className="m-0 mb-2 list-none space-y-1 p-0">
                  {selected.members.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-2 rounded-sm border border-edge/50 px-2 py-1.5"
                    >
                      <span className="text-sm">
                        {member.name}
                        {member.isSelf ? (
                          <span className="ml-1 text-xs text-muted">(you)</span>
                        ) : null}
                      </span>
                      {!member.isSelf && (
                        <button
                          type="button"
                          className="border-0 bg-transparent p-0 text-sm text-muted hover:text-danger"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={saving}
                          aria-label={`Remove ${member.name}`}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <form className="flex gap-2" onSubmit={handleAddMember}>
                  <input
                    className="input py-2 text-sm"
                    value={newMemberName}
                    onChange={(e) => {
                      setNewMemberName(e.target.value);
                      setMessage('');
                    }}
                    placeholder="Add person"
                    aria-label="Add person"
                  />
                  <button
                    type="submit"
                    className="btn-primary shrink-0"
                    disabled={saving || selected.members.length >= MAX_MEMBERS_PER_GROUP}
                  >
                    Add
                  </button>
                </form>
              </div>

              <button
                type="button"
                className="btn-outline btn-full border-danger/50 text-danger hover:bg-danger/10"
                onClick={handleDeleteGroup}
                disabled={saving}
              >
                Remove group
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
