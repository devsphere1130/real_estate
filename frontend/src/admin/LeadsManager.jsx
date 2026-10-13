import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PhoneIcon, WhatsAppIcon } from '../components/Icons'
import Pagination from '../components/Pagination'
import { EmptyState, ErrorBox, Loading } from '../components/States'
import { useDebounced } from '../hooks/useDebounced'
import { useFetch } from '../hooks/useFetch'
import { formatDateTime, typeLabel } from '../utils/format'
import { useSeo } from '../utils/seo'
import { waLinkTo } from '../utils/whatsapp'
import { adminApi } from './adminApi'
import ConfirmDialog from './ConfirmDialog'
import { useToast } from './Toast'

const STATUSES = [
  ['new', 'New'],
  ['contacted', 'Contacted'],
  ['visit_scheduled', 'Visit scheduled'],
  ['closed', 'Closed'],
  ['lost', 'Lost'],
]
const STATUS_IDS = STATUSES.map(([v]) => v)
const PAGE_SIZE = 15

function replyMessage(lead) {
  const about = lead.listing_ref ? ` about ${lead.listing_ref} (${lead.listing_title})` : ''
  return `Hi ${lead.name}, this is DevSphere. Thank you for your enquiry${about}. When would be a good time to talk?`
}

function LeadRow({ lead, onChanged, onDelete }) {
  const notify = useToast()
  const [notes, setNotes] = useState(lead.owner_notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  useEffect(() => setNotes(lead.owner_notes || ''), [lead.owner_notes])
  const notesChanged = notes.trim() !== (lead.owner_notes || '')

  async function changeStatus(status) {
    setSavingStatus(true)
    try {
      await adminApi.patchLead(lead.id, { status })
      notify(`${lead.name} marked as ${STATUSES.find(([v]) => v === status)[1].toLowerCase()}.`)
      onChanged()
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSavingStatus(false)
    }
  }

  async function saveNotes() {
    setSavingNotes(true)
    try {
      await adminApi.patchLead(lead.id, { owner_notes: notes.trim() })
      notify('Notes saved.')
      onChanged()
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSavingNotes(false)
    }
  }

  return (
    <tr className={lead.status === 'new' ? 'row-new' : ''}>
      <td>
        <strong>{lead.name}</strong>
        <div className="cell-sub">{lead.phone}</div>
        {lead.email && <div className="cell-sub">{lead.email}</div>}
        <div className="cell-sub">{formatDateTime(lead.created_at)}</div>
      </td>
      <td className="cell-enquiry">
        <div>
          <span className="badge badge-neutral">{lead.interest === 'rent' ? 'Wants to rent' : 'Wants to buy'}</span>
          {lead.property_type && <span className="badge badge-neutral">{typeLabel[lead.property_type]}</span>}
        </div>
        {lead.listing_ref && (
          <div className="cell-sub">
            About{' '}
            <Link to={`/admin/listings/${lead.listing_id}`}>
              {lead.listing_ref}
            </Link>{' '}
            · {lead.listing_title}
          </div>
        )}
        {!lead.listing_ref && lead.source === 'listing_page' && <div className="cell-sub">About a property that was deleted</div>}
        {lead.budget_text && <div className="cell-sub">Budget: {lead.budget_text}</div>}
        {lead.message && <p className="lead-message">{lead.message}</p>}
      </td>
      <td>
        <label className="sr-only" htmlFor={`status-${lead.id}`}>
          Status for {lead.name}
        </label>
        <select
          id={`status-${lead.id}`}
          className="select-sm"
          value={lead.status}
          disabled={savingStatus}
          onChange={(e) => changeStatus(e.target.value)}
        >
          {STATUSES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="cell-notes">
        <label className="sr-only" htmlFor={`notes-${lead.id}`}>
          Notes about {lead.name}
        </label>
        <textarea
          id={`notes-${lead.id}`}
          rows={2}
          maxLength={2000}
          value={notes}
          placeholder="Private notes"
          onChange={(e) => setNotes(e.target.value)}
        />
        {notesChanged && (
          <button type="button" className="btn btn-primary btn-xs" onClick={saveNotes} disabled={savingNotes}>
            {savingNotes ? 'Saving…' : 'Save notes'}
          </button>
        )}
      </td>
      <td>
        <div className="row-actions">
          <a className="btn btn-wa btn-xs" href={waLinkTo(lead.phone, replyMessage(lead))} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon width={16} height={16} /> WhatsApp<span className="sr-only"> {lead.name} (opens in a new tab)</span>
          </a>
          <a className="btn btn-ghost btn-xs" href={`tel:+91${lead.phone}`}>
            <PhoneIcon width={16} height={16} /> Call<span className="sr-only"> {lead.name}</span>
          </a>
          <button type="button" className="btn btn-danger-ghost btn-xs" onClick={() => onDelete(lead)}>
            Delete<span className="sr-only"> lead {lead.name}</span>
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function LeadsManager() {
  useSeo({ title: 'Manage leads' })
  const notify = useToast()
  const [params, setParams] = useSearchParams()
  const status = STATUS_IDS.includes(params.get('status')) ? params.get('status') : ''
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1)

  const [search, setSearch] = useState(params.get('q') || '')
  const q = useDebounced(search.trim())
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

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
  const { data, error, loading, reload } = useFetch((signal) => adminApi.leads(query, signal), JSON.stringify(query))

  function setFilter(changes) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await adminApi.deleteLead(toDelete.id)
      notify('Lead deleted.')
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
        <h1>Leads</h1>
      </div>

      <div className="toolbar">
        <div className="field">
          <label htmlFor="ld-search">Search</label>
          <input
            id="ld-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or phone number"
            maxLength={100}
          />
        </div>
        <div className="field">
          <label htmlFor="ld-status">Status</label>
          <select id="ld-status" value={status} onChange={(e) => setFilter({ status: e.target.value })}>
            <option value="">All leads</option>
            {STATUSES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field toolbar-quick">
          <button
            type="button"
            className={`btn btn-sm ${status === 'new' ? 'btn-primary' : 'btn-ghost'}`}
            aria-pressed={status === 'new'}
            onClick={() => setFilter({ status: status === 'new' ? '' : 'new' })}
          >
            {status === 'new' ? 'Showing new only' : 'Show new only'}
          </button>
        </div>
      </div>

      {loading && !data && <Loading label="Loading leads…" />}
      {error && <ErrorBox error={error} onRetry={reload} title="We could not load leads" />}

      {data && !error && data.items.length === 0 && (
        <EmptyState title={q || status ? 'No leads match' : 'No enquiries yet'}>
          <p>{q || status ? 'Try a different search or status.' : 'Enquiries sent from the website will appear here.'}</p>
        </EmptyState>
      )}

      {data && !error && data.items.length > 0 && (
        <>
          <p className="results-count" aria-live="polite">
            {data.total} {data.total === 1 ? 'lead' : 'leads'}, newest first
          </p>
          <div className="table-wrap">
            <table className="table table-leads">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Enquiry</th>
                  <th scope="col">Status</th>
                  <th scope="col">Your notes</th>
                  <th scope="col">Contact</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} onChanged={reload} onDelete={setToDelete} />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={(p) => setFilter({ page: p > 1 ? String(p) : '' })} />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this lead?"
        confirmLabel="Delete lead"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>
          <strong>{toDelete?.name}</strong> ({toDelete?.phone}) and your notes will be removed. This cannot be undone.
        </p>
      </ConfirmDialog>
    </>
  )
}
