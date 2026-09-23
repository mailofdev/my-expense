import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import DashboardHeader from '../../dashboard/components/DashboardHeader';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import { userService } from '../../auth/services/userService';
import {
  adminUserStats,
  filterAdminUsers,
  sortAdminUsers,
  toAdminUserRow,
} from '../utils/adminUsers';

function formatWhen(value) {
  if (!value) return 'Never';
  const date = dayjs(value);
  if (!date.isValid()) return 'Never';
  return date.format('D MMM YYYY, h:mm A');
}

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'uid', label: 'User id' },
  { key: 'lastLoginAt', label: 'Last login', when: true },
  { key: 'lastSeenAt', label: 'Last seen', when: true },
  { key: 'createdAt', label: 'Joined', when: true },
  { key: 'updatedAt', label: 'Profile updated', when: true },
  { key: 'loginCount', label: 'Logins' },
  { key: 'incomeThisMonth', label: 'Income this month', yesNo: true },
  { key: 'monthsTracked', label: 'Income months' },
  { key: 'hasPlan', label: 'Has a plan', yesNo: true },
  { key: 'planMonths', label: 'Plan months' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'creditCards', label: 'Credit cards' },
  { key: 'groups', label: 'Groups' },
  { key: 'goals', label: 'Goals' },
  { key: 'emergencyFund', label: 'Emergency fund', yesNo: true },
  { key: 'hasRepeats', label: 'Has repeats', yesNo: true },
  { key: 'recurring', label: 'Repeats' },
  { key: 'repeatsActive', label: 'Repeats on' },
  { key: 'repeatsPaused', label: 'Repeats paused' },
  { key: 'limits', label: 'Category limits' },
];

function Cell({ user, column }) {
  if (column.key === 'role') {
    return <span className={`admin-badge admin-badge--${user.role}`}>{user.role}</span>;
  }
  if (column.yesNo) {
    const on = Boolean(user[column.key]);
    return <span className={`admin-badge ${on ? 'admin-badge--yes' : 'admin-badge--no'}`}>{on ? 'Yes' : 'No'}</span>;
  }
  if (column.when) return formatWhen(user[column.key]);
  if (column.key === 'email') return user.email || '—';
  if (column.key === 'uid') return <span className="font-mono text-xs text-muted">{user.uid}</span>;
  return user[column.key];
}

function ViewToggle({ view, onChange }) {
  const options = [
    { id: 'table', label: 'Table' },
    { id: 'card', label: 'Cards' },
  ];
  return (
    <div className="admin-toggle" role="tablist" aria-label="User list layout">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={view === option.id}
          className={`admin-toggle__btn ${view === option.id ? 'is-active' : ''}`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function UserTable({ users }) {
  return (
    <div className="admin-panel">
      <table className="admin-table">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.uid}>
              {COLUMNS.map((column) => (
                <td key={column.key}>
                  <Cell user={user} column={column} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserCards({ users }) {
  return (
    <ul className="admin-cards m-0 list-none p-0">
      {users.map((user) => (
        <li key={user.uid} className="admin-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="m-0 mt-0.5 truncate text-xs text-muted">{user.email || '—'}</p>
            </div>
            <span className={`admin-badge admin-badge--${user.role}`}>{user.role}</span>
          </div>
          <dl className="mb-0 mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {COLUMNS.filter((column) => !['name', 'email', 'role'].includes(column.key)).map((column) => (
              <div key={column.key} className="min-w-0">
                <dt className="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{column.label}</dt>
                <dd className="m-0 mt-0.5 truncate text-ink">
                  <Cell user={user} column={column} />
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}

export default function AdminPage({ embedded = false }) {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('table');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    userService
      .listUsers()
      .then((profiles) => {
        if (!active) return;
        setRows(sortAdminUsers(profiles.map(toAdminUserRow)));
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        const denied = err?.code === 'permission-denied';
        setError(
          denied
            ? 'Firestore is still blocking the user list. Publish the rules in firestore.rules, and keep role set to admin on your user document.'
            : 'Could not load users. Try again in a moment.'
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => filterAdminUsers(rows, query), [rows, query]);
  const stats = useMemo(() => adminUserStats(rows), [rows]);

  const body = (
    <div className="admin-dashboard">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Directory</p>
          <h1 className="m-0 mt-1 text-2xl font-semibold tracking-tight text-ink">Users</h1>
        </div>
        {!embedded && (
          <Link to="/dashboard" className="text-sm font-semibold text-primary">
            Back to app
          </Link>
        )}
      </div>

      {loading && <LoadingSpinner message="Loading users…" />}

      {!loading && error && <div className="alert-error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="admin-kpis">
            <article className="admin-kpi">
              <p className="admin-kpi__label">Users</p>
              <p className="admin-kpi__value">{stats.total}</p>
            </article>
            <article className="admin-kpi">
              <p className="admin-kpi__label">Admins</p>
              <p className="admin-kpi__value">{stats.admins}</p>
            </article>
            <article className="admin-kpi">
              <p className="admin-kpi__label">Active in 7 days</p>
              <p className="admin-kpi__value">{stats.active}</p>
            </article>
          </section>

          <div className="admin-toolbar">
            <input
              className="admin-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or email"
              aria-label="Search users"
            />
            <ViewToggle view={view} onChange={setView} />
          </div>

          {visible.length === 0 ? (
            <p className="admin-empty">No users match that search.</p>
          ) : view === 'table' ? (
            <UserTable users={visible} />
          ) : (
            <UserCards users={visible} />
          )}
        </>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <div className="min-h-screen min-h-dvh">
      <DashboardHeader />
      <main className="mx-auto w-full max-w-content px-4 pb-10 pt-4 sm:px-6">{body}</main>
    </div>
  );
}
