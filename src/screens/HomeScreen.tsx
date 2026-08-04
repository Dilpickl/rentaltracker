import { Link } from 'react-router-dom'
import { ErrorBanner } from '../components/ErrorBanner'
import { LoadingBlock } from '../components/LoadingBlock'
import { Screen } from '../components/Screen'
import { StatusBadge } from '../components/StatusBadge'
import { formatMoney, formatShortDate, toISODate } from '../lib/dates'
import { compareTenantStatus, getTenantStatus } from '../lib/status'
import type { TenantWithPayments } from '../lib/useTenantsData'

type Props = {
  tenants: TenantWithPayments[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function HomeScreen({ tenants, loading, error, onRetry }: Props) {
  const active = tenants.filter((t) => !t.archived)
  const archivedCount = tenants.length - active.length

  const rows = active
    .map((t) => ({ tenant: t, status: getTenantStatus(t, t.payments) }))
    .sort((a, b) => {
      const byStatus = compareTenantStatus(a.status, b.status)
      if (byStatus !== 0) return byStatus
      return a.tenant.name.localeCompare(b.tenant.name)
    })

  const expected = active.reduce((sum, t) => sum + t.monthly_rent, 0)
  const collected = rows.reduce(
    (sum, r) => sum + Math.min(r.status.paidThisPeriod, r.tenant.monthly_rent),
    0,
  )

  return (
    <Screen
      title="Who owes rent?"
      action={
        <Link to="/tenants/new" className="btn btn--primary btn--compact">
          Add Tenant
        </Link>
      }
    >
      <div className="summary-banner" aria-label="Collected this month">
        <p className="summary-banner__label">Collected this month</p>
        <p className="summary-banner__amount">
          <span className="summary-banner__collected">{formatMoney(collected)}</span>
          <span className="summary-banner__of"> of {formatMoney(expected)}</span>
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={onRetry} />}

      {loading && !error && <LoadingBlock message="Loading tenants…" />}

      {!loading && !error && rows.length === 0 && (
        <div className="empty-state">
          <p>No tenants yet — tap Add Tenant to get started.</p>
          <Link to="/tenants/new" className="btn btn--primary btn--block">
            Add Tenant
          </Link>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <ul className="tenant-list">
          {rows.map(({ tenant, status }) => (
            <li key={tenant.id}>
              <Link to={`/tenants/${tenant.id}`} className="tenant-row">
                <div className="tenant-row__main">
                  <span className="tenant-row__name">{tenant.name}</span>
                  <span className="tenant-row__meta">{tenant.unit_address}</span>
                  {status.kind !== 'paid' && status.remaining > 0 && (
                    <span className="tenant-row__balance">
                      {formatMoney(status.remaining)} left · Due{' '}
                      {formatShortDate(toISODate(status.dueDate))}
                    </span>
                  )}
                </div>
                <StatusBadge kind={status.kind} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && (
        <Link to="/archived" className="text-link text-link--center">
          {archivedCount > 0
            ? `Archived tenants (${archivedCount})`
            : 'Archived tenants'}
        </Link>
      )}
    </Screen>
  )
}
