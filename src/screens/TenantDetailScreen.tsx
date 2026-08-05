import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LoadingBlock } from '../components/LoadingBlock'
import { Screen } from '../components/Screen'
import { StatusBadge } from '../components/StatusBadge'
import { formatMoney, formatShortDate, toISODate } from '../lib/dates'
import { getTenantStatus } from '../lib/status'
import { supabase } from '../lib/supabase'
import type { Expense, Payment } from '../types'
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
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (loading && !tenant) {
    return (
      <Screen title="Tenant" backTo="/">
        <LoadingBlock />
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
  const expenses = [...tenant.expenses].sort((a, b) =>
    b.incurred_on.localeCompare(a.incurred_on),
  )
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  const backTo = tenant.archived ? '/archived' : '/'
  const backLabel = tenant.archived ? 'Archived' : 'Home'

  async function handleArchive() {
    if (
      !window.confirm(
        `Mark ${tenant!.name} as moved out?\n\nThey’ll leave the home list, but their payment history will be kept.`,
      )
    ) {
      return
    }

    setBusy(true)
    setActionError(null)
    const { error } = await supabase
      .from('tenants')
      .update({ archived: true })
      .eq('id', tenant!.id)
    setBusy(false)

    if (error) {
      setActionError(error.message)
      return
    }

    await onChanged()
    navigate('/archived')
  }

  async function handleRestore() {
    setBusy(true)
    setActionError(null)
    const { error } = await supabase
      .from('tenants')
      .update({ archived: false })
      .eq('id', tenant!.id)
    setBusy(false)

    if (error) {
      setActionError(error.message)
      return
    }

    await onChanged()
    navigate(`/tenants/${tenant!.id}`)
  }

  async function handleDeleteTenant() {
    if (
      !window.confirm(
        `Delete ${tenant!.name} forever?\n\nThis also deletes their payment and expense history. Prefer “Mark as Moved Out” if you want to keep records.`,
      )
    ) {
      return
    }

    setBusy(true)
    setActionError(null)
    const { error } = await supabase.from('tenants').delete().eq('id', tenant!.id)
    setBusy(false)

    if (error) {
      setActionError(error.message)
      return
    }

    await onChanged()
    navigate(tenant!.archived ? '/archived' : '/')
  }

  async function handleDeletePayment(payment: Payment) {
    if (
      !window.confirm(
        `Delete this payment of ${formatMoney(payment.amount)} on ${formatShortDate(payment.paid_on)}?\n\nThis cannot be undone.`,
      )
    ) {
      return
    }

    setBusy(true)
    setActionError(null)
    const { error } = await supabase.from('payments').delete().eq('id', payment.id)
    setBusy(false)

    if (error) {
      setActionError(error.message)
      return
    }

    await onChanged()
  }

  async function handleDeleteExpense(expense: Expense) {
    if (
      !window.confirm(
        `Delete this expense of ${formatMoney(expense.amount)} for “${expense.description}”?\n\nThis cannot be undone.`,
      )
    ) {
      return
    }

    setBusy(true)
    setActionError(null)
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id)
    setBusy(false)

    if (error) {
      setActionError(error.message)
      return
    }

    await onChanged()
  }

  return (
    <Screen
      title={tenant.name}
      backTo={backTo}
      backLabel={backLabel}
      action={
        !tenant.archived ? (
          <Link to={`/tenants/${tenant.id}/edit`} className="text-link">
            Edit
          </Link>
        ) : undefined
      }
    >
      {tenant.archived && (
        <div className="banner banner--warn">This tenant has moved out (archived).</div>
      )}

      <div className="detail-card">
        <p className="detail-card__unit">{tenant.unit_address}</p>
        <p className="detail-card__rent">{formatMoney(tenant.monthly_rent)} / month</p>
        <p className="detail-card__due">Due on day {tenant.due_day} each month</p>
        {!tenant.archived && (
          <div className="detail-card__status">
            <StatusBadge kind={status.kind} />
            {status.kind !== 'paid' && (
              <span className="detail-card__remaining">
                {formatMoney(status.remaining)} left · Due{' '}
                {formatShortDate(toISODate(status.dueDate))}
              </span>
            )}
          </div>
        )}
      </div>

      {!tenant.archived && (
        <div className="action-stack">
          <Link
            to={`/tenants/${tenant.id}/pay`}
            className="btn btn--primary btn--block btn--xl"
          >
            Mark as Paid
          </Link>
          <Link
            to={`/tenants/${tenant.id}/expenses/new`}
            className="btn btn--secondary btn--block btn--xl"
          >
            Add Expense
          </Link>
        </div>
      )}

      <section className="history">
        <h2 className="section-title">Payment history</h2>
        {history.length === 0 ? (
          <p className="muted">No payments recorded yet.</p>
        ) : (
          <ul className="history-list">
            {history.map((p) => (
              <li key={p.id} className="history-row history-row--actions">
                <div className="history-row__info">
                  <div className="history-row__top">
                    <span className="history-row__date">{formatShortDate(p.paid_on)}</span>
                    <span className={`pill pill--${p.status === 'Paid' ? 'paid' : 'partial'}`}>
                      {p.status}
                    </span>
                  </div>
                  <span className="history-row__amount">{formatMoney(p.amount)}</span>
                </div>
                <div className="history-row__buttons">
                  <Link
                    to={`/tenants/${tenant.id}/payments/${p.id}`}
                    className="btn btn--secondary btn--compact"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn btn--danger-outline btn--compact"
                    disabled={busy}
                    onClick={() => void handleDeletePayment(p)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="history">
        <div className="section-title-row">
          <h2 className="section-title">Expenses</h2>
          {expenses.length > 0 && (
            <span className="section-title-meta">Total {formatMoney(expenseTotal)}</span>
          )}
        </div>
        {expenses.length === 0 ? (
          <p className="muted">No expenses recorded yet.</p>
        ) : (
          <ul className="history-list">
            {expenses.map((e) => (
              <li key={e.id} className="history-row history-row--actions">
                <div className="history-row__info">
                  <div className="history-row__text">
                    <span className="history-row__date">{formatShortDate(e.incurred_on)}</span>
                    <span className="history-row__desc">{e.description}</span>
                  </div>
                  <span className="history-row__amount">{formatMoney(e.amount)}</span>
                </div>
                <div className="history-row__buttons">
                  <Link
                    to={`/tenants/${tenant.id}/expenses/${e.id}`}
                    className="btn btn--secondary btn--compact"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn btn--danger-outline btn--compact"
                    disabled={busy}
                    onClick={() => void handleDeleteExpense(e)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {actionError && <div className="banner banner--error">{actionError}</div>}

      {tenant.archived ? (
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void handleRestore()}
        >
          Move back to active
        </button>
      ) : (
        <button
          type="button"
          className="btn btn--secondary btn--block"
          disabled={busy}
          onClick={() => void handleArchive()}
        >
          Mark as Moved Out
        </button>
      )}

      <button
        type="button"
        className="btn btn--danger-ghost btn--block"
        disabled={busy}
        onClick={() => void handleDeleteTenant()}
      >
        Delete tenant forever
      </button>
    </Screen>
  )
}
