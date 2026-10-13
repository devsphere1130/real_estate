import { Link } from 'react-router-dom'
import { ErrorBox, Loading } from '../components/States'
import { useFetch } from '../hooks/useFetch'
import { useSeo } from '../utils/seo'
import { adminApi } from './adminApi'
import MonthOverview from './charts/MonthOverview'

function StatCard({ label, value, to, tone }) {
  return (
    <Link to={to} className={`stat-card ${tone ? `stat-${tone}` : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </Link>
  )
}

export default function Dashboard() {
  useSeo({ title: 'Admin dashboard' })
  const { data, error, loading, reload } = useFetch(() => adminApi.stats(), 'stats')
  const month = useFetch((signal) => adminApi.monthStats(signal), 'month')

  return (
    <>
      <div className="admin-head">
        <h1>Dashboard</h1>
        <Link to="/admin/listings/new" className="btn btn-primary">
          + Add property
        </Link>
      </div>

      {month.data && <MonthOverview data={month.data} loading={month.loading} onRefresh={month.reload} />}
      {!month.data && month.loading && <Loading label="Loading this month…" />}
      {month.error && <ErrorBox error={month.error} onRetry={month.reload} title="We could not load this month's charts" />}

      {loading && <Loading label="Loading numbers…" />}
      {error && <ErrorBox error={error} onRetry={reload} title="We could not load the dashboard" />}

      {data && (
        <>
          <h2 className="admin-sub">Properties</h2>
          <div className="stat-grid">
            <StatCard label="Available" value={data.listings.available} to="/admin/listings?status=available" tone="good" />
            <StatCard label="Sold" value={data.listings.sold} to="/admin/listings?status=sold" />
            <StatCard label="Rented" value={data.listings.rented} to="/admin/listings?status=rented" />
            <StatCard label="Hidden" value={data.listings.hidden} to="/admin/listings?status=hidden" />
          </div>

          <h2 className="admin-sub">Enquiries</h2>
          <div className="stat-grid">
            <StatCard label="New leads" value={data.leads_new} to="/admin/leads?status=new" tone={data.leads_new ? 'attention' : ''} />
            <StatCard label="Leads this week" value={data.leads_new_this_week} to="/admin/leads" />
            <StatCard label="Total leads" value={data.leads_total} to="/admin/leads" />
          </div>
        </>
      )}
    </>
  )
}
