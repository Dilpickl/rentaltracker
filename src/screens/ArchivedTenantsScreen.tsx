import { Link } from 'react-router-dom'
import { Screen } from '../components/Screen'
import type { TenantWithPayments } from '../lib/useTenantsData'

type Props = {
  tenants: TenantWithPayments[]
  loading: boolean
}

export function ArchivedTenantsScreen({ tenants, loading }: Props) {
  const archived = tenants
    .filter((t) => t.archived)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Screen title="Archived tenants" backTo="/" backLabel="Home">
      {loading && <p className="muted">Loading…</p>}

      {!loading && archived.length === 0 && (
        <div className="empty-state">
          <p>No archived tenants. Move someone out from their detail screen.</p>
        </div>
      )}

      <ul className="tenant-list">
        {archived.map((tenant) => (
          <li key={tenant.id}>
            <Link to={`/tenants/${tenant.id}`} className="tenant-row">
              <div className="tenant-row__main">
                <span className="tenant-row__name">{tenant.name}</span>
                <span className="tenant-row__meta">{tenant.unit_address}</span>
              </div>
              <span className="status-badge status-badge--upcoming">Moved out</span>
            </Link>
          </li>
        ))}
      </ul>
    </Screen>
  )
}
