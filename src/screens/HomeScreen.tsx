import { Link } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { StatusBadge } from '../components/StatusBadge'
import { formatMoney, formatShortDate, toISODate } from '../lib/dates'
import { compareTenantStatus, getTenantStatus } from '../lib/status'
import type { TenantWithPayments } from '../lib/useTenantsData'

type Props = {
  tenants: TenantWithPayments[]
  loading: boolean
  error: string | null
}

export function HomeScreen({ tenants, loading, error }: Props) {
  const rows = tenants
    .map((t) => ({ tenant: t, status: getTenantStatus(t, t.payments) }))
    .sort((a, b) => {
      const byStatus = compareTenantStatus(a.status, b.status)
      if (byStatus !== 0) return byStatus
      return a.tenant.name.localeCompare(b.tenant.name)
    })

  const expected = tenants.reduce((sum, t) => sum + t.monthly_rent, 0)
  const collected = rows.reduce((sum, r) => sum + Math.min(r.status.paidThisMonth, r.tenant.monthly_rent), 0)

  return (
    <Screen
      title="Who owes rent?"
      action={
        <Link to="/tenants/new" className="btn btn--primary btn--compact">
          Add Tenant
        </Link>
      }
    >
      <p className="summary-line">
        Collected this month:{' '}
        <strong>
          {formatMoney(collected)} / {formatMoney(expected)} expected
        </strong>
      </p>

      {error && <div className="banner banner--error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && !error && rows.length === 0 && (
        <div className="empty-state">
          <p>No tenants yet.</p>
          <Link to="/tenants/new" className="btn btn--primary btn--block">
            Add your first tenant
          </Link>
        </div>
      )}

      <ul className="tenant-list">
        {rows.map(({ tenant, status }) => (
          <li key={tenant.id}>
            <Link to={`/tenants/${tenant.id}`} className="tenant-row">
              <div className="tenant-row__main">
                <span className="tenant-row__name">{tenant.name}</span>
                <span className="tenant-row__meta">{tenant.unit_address}</span>
                {status.kind !== 'paid' && status.remaining > 0 && (
                  <span className="tenant-row__balance">
                    {formatMoney(status.remaining)} left · Due {formatShortDate(toISODate(status.dueDate))}
                  </span>
                )}
              </div>
              <StatusBadge kind={status.kind} />
            </Link>
          </li>
        ))}
      </ul>
    </Screen>
  )
}
