import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { assetUrl } from '../api/client'
import Pagination from '../components/Pagination'
import PropertyArt from '../components/PropertyArt'
import { EmptyState, ErrorBox, Loading } from '../components/States'
import { useDebounced } from '../hooks/useDebounced'
import { useFetch } from '../hooks/useFetch'
import { formatArea, formatPrice, kindLabel, typeLabel } from '../utils/format'
import { useSeo } from '../utils/seo'
import { adminApi } from './adminApi'
import ConfirmDialog from './ConfirmDialog'
import { useToast } from './Toast'

const STATUSES = ['available', 'sold', 'rented', 'hidden']
const PAGE_SIZE = 15

function Thumb({ listing }) {
  return (
    <span className="thumb">
      {listing.cover_url ? <img src={assetUrl(listing.cover_url)} alt="" loading="lazy" /> : <PropertyArt type={listing.property_type} />}
    </span>
  )
}

/** The quick-action buttons that make sense for this listing's current state. */
function quickActions(listing) {
  const actions = []
  if (listing.status !== 'available') actions.push(['available', 'Mark available'])
  if (listing.kind === 'sale' && listing.status !== 'sold') actions.push(['sold', 'Mark sold'])
  if (listing.kind === 'rent' && listing.status !== 'rented') actions.push(['rented', 'Mark rented'])
  if (listing.status !== 'hidden') actions.push(['hidden', 'Hide'])
  return actions
}

export default function ListingsManager() {
  useSeo({ title: 'Manage listings' })
  const notify = useToast()
  const [params, setParams] = useSearchParams()
  const status = STATUSES.includes(params.get('status')) ? params.get('status') : ''
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1)

  const [search, setSearch] = useState(params.get('q') || '')
  const q = useDebounced(search.trim())
  const [toDelete, setToDelete] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // keep the URL in sync with the (debounced) search box
  useEffect(() => {
    if ((params.get('q') || '') === q) return
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    next.delete('page')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const query = { q: params.get('q') || '', status, page, page_size: PAGE_SIZE }
  const { data, error, loading, reload } = useFetch((signal) => adminApi.listings(query, signal), JSON.stringify(query))

  function setFilter(changes) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  async function changeStatus(listing, newStatus) {
    setBusyId(listing.id)
    try {
      await adminApi.patchListing(listing.id, { status: newStatus })
      notify(`${listing.ref_code} is now ${newStatus}.`)
      reload()
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await adminApi.deleteListing(toDelete.id)
      notify(`${toDelete.ref_code} was deleted.`)
      setToDelete(null)
      reload()
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="admin-head">
        <h1>Listings</h1>
        <Link to="/admin/listings/new" className="btn btn-primary">
          + Add property
        </Link>
      </div>

      <div className="toolbar">
        <div className="field">
          <label htmlFor="l-search">Search</label>
          <input
            id="l-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ref code, title, locality or city"
            maxLength={100}
          />
        </div>
        <div className="field">
          <label htmlFor="l-status">Status</label>
          <select id="l-status" value={status} onChange={(e) => setFilter({ status: e.target.value })}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !data && <Loading label="Loading listings…" />}
      {error && <ErrorBox error={error} onRetry={reload} title="We could not load listings" />}

      {data && !error && data.items.length === 0 && (
        <EmptyState title={q || status ? 'No listings match' : 'No properties yet'}>
          <p>{q || status ? 'Try a different search or status.' : 'Add your first property to see it on the website.'}</p>
          {!q && !status && (
            <Link to="/admin/listings/new" className="btn btn-primary">
              + Add property
            </Link>
          )}
        </EmptyState>
      )}

      {data && !error && data.items.length > 0 && (
        <>
          <p className="results-count" aria-live="polite">
            {data.total} {data.total === 1 ? 'listing' : 'listings'}
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Property</th>
                  <th scope="col">Type</th>
                  <th scope="col">Price</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="cell-listing">
                        <Thumb listing={l} />
                        <div>
                          <Link to={`/admin/listings/${l.id}`} className="cell-title">
                            {l.title}
                          </Link>
                          <div className="cell-sub">
                            {l.ref_code} · {l.locality}, {l.city}
                          </div>
                          {l.is_featured && <span className="badge badge-featured">Featured</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {typeLabel[l.property_type]}
                      <div className="cell-sub">
                        {kindLabel[l.kind]} · {formatArea(l.carpet_area_sqft)}
                      </div>
                    </td>
                    <td className="nowrap">{formatPrice(l.price, l.kind)}</td>
                    <td>
                      <span className={`badge badge-${l.status}`}>{l.status}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/admin/listings/${l.id}`} className="btn btn-ghost btn-xs">
                          Edit<span className="sr-only"> {l.ref_code}</span>
                        </Link>
                        {quickActions(l).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            className="btn btn-ghost btn-xs"
                            disabled={busyId === l.id}
                            onClick={() => changeStatus(l, value)}
                          >
                            {label}
                            <span className="sr-only"> {l.ref_code}</span>
                          </button>
                        ))}
                        <button type="button" className="btn btn-danger-ghost btn-xs" onClick={() => setToDelete(l)}>
                          Delete<span className="sr-only"> {l.ref_code}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={(p) => setFilter({ page: p > 1 ? String(p) : '' })} />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this property?"
        confirmLabel="Delete property"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>
          <strong>{toDelete?.ref_code}</strong>: {toDelete?.title}
        </p>
        <p>This also deletes its photos and cannot be undone. Enquiries about it are kept. To only remove it from the website, use Hide instead.</p>
      </ConfirmDialog>
    </>
  )
}
