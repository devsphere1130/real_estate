import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loading } from '../components/States'
import '../styles/admin.css'
import AdminLayout from './AdminLayout'
import { AuthProvider, useAuth } from './AuthContext'
import Dashboard from './Dashboard'
import LeadsManager from './LeadsManager'
import ListingForm from './ListingForm'
import ListingsManager from './ListingsManager'
import Login from './Login'
import { ToastProvider } from './Toast'

function Protected({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'checking') return <Loading label="Checking your session…" />
  if (status === 'out') return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
  return children
}

export default function AdminApp() {
  // Keep the admin panel out of search engines.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route
            element={
              <Protected>
                <AdminLayout />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="listings" element={<ListingsManager />} />
            <Route path="listings/new" element={<ListingForm />} />
            <Route path="listings/:id" element={<ListingForm />} />
            <Route path="leads" element={<LeadsManager />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
