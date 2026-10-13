import { Link, NavLink, Outlet } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import ThemeToggle from '../components/ThemeToggle'
import { useAuth } from './AuthContext'

export default function AdminLayout() {
  const { admin, logout } = useAuth()

  return (
    <div className="admin">
      <a className="skip-link" href="#admin-content">
        Skip to content
      </a>
      <header className="admin-header">
        <div className="admin-bar">
          <Link to="/admin" className="brand" aria-label="DevSphere admin home">
            <BrandLogo size={36} />
            <span className="admin-tag">Admin</span>
          </Link>
          <div className="admin-user">
            <span className="admin-email" title={admin?.email}>
              {admin?.email}
            </span>
            <ThemeToggle />
            <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
        <nav className="admin-nav" aria-label="Admin">
          <NavLink to="/admin" end>
            Dashboard
          </NavLink>
          <NavLink to="/admin/listings">Listings</NavLink>
          <NavLink to="/admin/leads">Leads</NavLink>
          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-site-link">
            View website<span className="sr-only"> (opens in a new tab)</span> ↗
          </a>
        </nav>
      </header>
      <main id="admin-content" tabIndex={-1} className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
