import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useTenantsData } from './lib/useTenantsData'
import { ArchivedTenantsScreen } from './screens/ArchivedTenantsScreen'
import { HomeScreen } from './screens/HomeScreen'
import { RecordPaymentScreen } from './screens/RecordPaymentScreen'
import { TenantDetailScreen } from './screens/TenantDetailScreen'
import { TenantFormScreen } from './screens/TenantFormScreen'

export default function App() {
  const { tenants, loading, error, refresh } = useTenantsData()

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route
            path="/"
            element={
              <HomeScreen
                tenants={tenants}
                loading={loading}
                error={error}
                onRetry={() => void refresh()}
              />
            }
          />
          <Route
            path="/archived"
            element={<ArchivedTenantsScreen tenants={tenants} loading={loading} />}
          />
          <Route
            path="/tenants/new"
            element={<TenantFormScreen tenants={tenants} onChanged={refresh} />}
          />
          <Route
            path="/tenants/:id"
            element={
              <TenantDetailScreen tenants={tenants} loading={loading} onChanged={refresh} />
            }
          />
          <Route
            path="/tenants/:id/edit"
            element={<TenantFormScreen tenants={tenants} onChanged={refresh} />}
          />
          <Route
            path="/tenants/:id/pay"
            element={
              <RecordPaymentScreen
                tenants={tenants}
                loading={loading}
                onChanged={refresh}
              />
            }
          />
          <Route
            path="/tenants/:id/payments/:paymentId"
            element={
              <RecordPaymentScreen
                tenants={tenants}
                loading={loading}
                onChanged={refresh}
              />
            }
          />
          <Route
            path="/pay"
            element={
              <RecordPaymentScreen
                tenants={tenants}
                loading={loading}
                onChanged={refresh}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
