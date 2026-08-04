import { Link, useNavigate, useParams } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { StatusBadge } from '../components/StatusBadge'
import { formatMoney, formatShortDate, toISODate } from '../lib/dates'
import { getTenantStatus } from '../lib/status'
import { supabase } from '../lib/supabase'
import type { TenantWithPayments } from '../lib/useTenantsData'

type Props = {
  tenants: TenantWithPayments[]
  loading: boolean
  onChanged: () => Promise<void>
}

export function TenantDetailScreen({ tenants, loading, onChanged }: Props) {
  const { id } = useParams()
  const navigate = useNavigate()
  const tenant = tenants.find((t) => t.id === id)

  if (loading && !tenant) {
    return (
      <Screen title="Tenant" backTo="/">
        <p className="muted">Loading…</p>
      </Screen>
    )
  }

  if (!tenant) {
    return (
      <Screen title="Not found" backTo="/">
        <p className="muted">That tenant was removed or does not exist.</p>
        <Link to="/" className="btn btn--primary btn--block">
          Back home
        </Link>
      </Screen>
    )
  }

  const status = getTenantStatus(tenant, tenant.payments)
  const history = [...tenant.payments].sort((a, b) => b.paid_on.localeCompare(a.paid_on))

  async function handleDelete() {
    if (!window.confirm(`Remove ${tenant!.name}? This also deletes their payment history.`)) {
      return
    }
    const { error } = await supabase.from('tenants').delete().eq('id', tenant!.id)
    if (error) {
      window.alert(error.message)
      return
    }
    await onChanged()
    navigate('/')
  }

  return (
    <Screen
      title={tenant.name}
      backTo="/"
      backLabel="Home"
      action={
        <Link to={`/tenants/${tenant.id}/edit`} className="text-link">
          Edit
        </Link>
      }
    >
      <div className="detail-card">
        <p className="detail-card__unit">{tenant.unit_address}</p>
        <p className="detail-card__rent">{formatMoney(tenant.monthly_rent)} / month</p>
        <p className="detail-card__due">Due on day {tenant.due_day} each month</p>
        <div className="detail-card__status">
          <StatusBadge kind={status.kind} />
          {status.kind !== 'paid' && (
            <span className="detail-card__remaining">
              {formatMoney(status.remaining)} left · Due {formatShortDate(toISODate(status.dueDate))}
            </span>
          )}
        </div>
      </div>

      <Link
        to={`/tenants/${tenant.id}/pay`}
        className="btn btn--primary btn--block btn--xl"
      >
        Mark as Paid
      </Link>

      <section className="history">
        <h2 className="section-title">Payment history</h2>
        {history.length === 0 ? (
          <p className="muted">No payments recorded yet.</p>
        ) : (
          <ul className="history-list">
            {history.map((p) => (
              <li key={p.id} className="history-row">
                <div>
                  <span className="history-row__date">{formatShortDate(p.paid_on)}</span>
                  <span className={`pill pill--${p.status === 'Paid' ? 'paid' : 'partial'}`}>
                    {p.status}
                  </span>
                </div>
                <span className="history-row__amount">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" className="btn btn--danger-ghost btn--block" onClick={handleDelete}>
        Remove tenant
      </button>
    </Screen>
  )
}
