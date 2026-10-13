import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listingsApi } from '../api/client'
import ListingCard from '../components/ListingCard'
import Pagination from '../components/Pagination'
import { CardSkeletons, EmptyState, ErrorBox } from '../components/States'
import WhatsAppButton from '../components/WhatsAppButton'
import { useFetch } from '../hooks/useFetch'
import { BUDGETS, budgetValueFor, splitBudget } from '../utils/budgets'
import { typeLabel } from '../utils/format'
import { useSeo } from '../utils/seo'
import { generalMessage } from '../utils/whatsapp'

const PAGE_SIZE = 9
const SORTS = [
  ['newest', 'Newest first'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
]
const KIND_TITLE = { sale: 'for sale', rent: 'for rent' }
const TYPE_PLURAL = { flat: 'Flats', villa: 'Villas', plot: 'Plots', shop: 'Shops', room: 'Rooms' }

const digits = (v) => (/^\d{1,11}$/.test(v || '') ? v : '')

/** Read and sanitise filters from the URL. */
function readParams(params) {
  const kind = ['sale', 'rent'].includes(params.get('kind')) ? params.get('kind') : ''
  const type = params.get('type') in typeLabel ? params.get('type') : ''
  const sort = SORTS.some(([v]) => v === params.get('sort')) ? params.get('sort') : 'newest'
  const bedrooms = ['1', '2', '3', '4'].includes(params.get('bedrooms')) ? params.get('bedrooms') : ''
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1)
  return {
    kind,
    type,
    sort,
    bedrooms,
    page,
    q: (params.get('q') || '').slice(0, 100),
    min_price: digits(params.get('min_price')),
    max_price: digits(params.get('max_price')),
  }
}

export default function Listings() {
  const [params, setParams] = useSearchParams()
  const f = readParams(params)
  const [qText, setQText] = useState(f.q)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const topRef = useRef(null)

  useEffect(() => setQText(f.q), [f.q])

  const title =
    `${f.type ? TYPE_PLURAL[f.type] : 'Properties'} ${f.kind ? KIND_TITLE[f.kind] : 'for sale and rent'}` +
    (f.q ? ` in ${f.q}` : '')
  useSeo({
    title,
    description: `Browse ${title.toLowerCase()} with carpet area, floor and age on every listing. Message DevSphere on WhatsApp to book a visit.`,
  })

  const query = {
    kind: f.kind,
    property_type: f.type,
    q: f.q,
    min_price: f.min_price,
    max_price: f.max_price,
    bedrooms: f.bedrooms,
    sort: f.sort,
    page: f.page,
    page_size: PAGE_SIZE,
  }
  const { data, error, loading, reload } = useFetch((signal) => listingsApi.list(query, signal), JSON.stringify(query))

  function update(changes, { keepPage = false } = {}) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!keepPage) next.delete('page')
    setParams(next)
  }

  function changePage(page) {
    update({ page: page > 1 ? String(page) : '' }, { keepPage: true })
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const hasFilters = f.kind || f.type || f.q || f.min_price || f.max_price || f.bedrooms
  const budgetValue = budgetValueFor(f.kind, f.min_price, f.max_price)
  // A custom range from the URL that matches no preset is shown as "Custom range"
  const customRange = (f.min_price || f.max_price) && !budgetValue

  return (
    <div className="container page">
      <h1 className="page-title" ref={topRef} tabIndex={-1}>
        {title}
      </h1>

      <button
        type="button"
        className="btn btn-ghost filters-toggle"
        aria-expanded={filtersOpen}
        aria-controls="filters"
        onClick={() => setFiltersOpen((o) => !o)}
      >
        {filtersOpen ? 'Hide filters' : 'Show filters'}
      </button>

      <form
        id="filters"
        className={`filters ${filtersOpen ? 'is-open' : ''}`}
        onSubmit={(e) => {
          e.preventDefault()
          update({ q: qText.trim() })
        }}
        role="search"
        aria-label="Filter properties"
      >
        <div className="field">
          <label htmlFor="f-kind">Buy or rent</label>
          <select
            id="f-kind"
            value={f.kind}
            onChange={(e) => update({ kind: e.target.value, min_price: '', max_price: '' })}
          >
            <option value="">All</option>
            <option value="sale">Buy</option>
            <option value="rent">Rent</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-type">Type</label>
          <select id="f-type" value={f.type} onChange={(e) => update({ type: e.target.value })}>
            <option value="">Any type</option>
            {Object.entries(typeLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-budget">Budget</label>
          <select
            id="f-budget"
            value={customRange ? 'custom' : budgetValue}
            disabled={!f.kind}
            onChange={(e) => {
              const { min_price, max_price } = splitBudget(e.target.value)
              update({ min_price: min_price || '', max_price: max_price || '' })
            }}
          >
            {!f.kind ? (
              <option value="">Pick Buy or Rent first</option>
            ) : (
              <>
                {BUDGETS[f.kind].map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
                {customRange && <option value="custom">Custom range</option>}
              </>
            )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-beds">Bedrooms</label>
          <select id="f-beds" value={f.bedrooms} onChange={(e) => update({ bedrooms: e.target.value })}>
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>
        <div className="field field-wide">
          <label htmlFor="f-q">Locality</label>
          <div className="input-action">
            <input
              id="f-q"
              type="search"
              value={qText}
              maxLength={100}
              placeholder="e.g. Green Park Road"
              onChange={(e) => setQText(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </div>
        </div>
      </form>

      <div className="results-bar">
        <p className="results-count" aria-live="polite">
          {loading ? 'Searching…' : error ? '' : `${data.total} ${data.total === 1 ? 'property' : 'properties'} found`}
        </p>
        <div className="results-tools">
          {hasFilters && (
            <button type="button" className="link-btn" onClick={() => setParams(new URLSearchParams())}>
              Clear filters
            </button>
          )}
          <div className="field field-inline">
            <label htmlFor="f-sort">Sort by</label>
            <select id="f-sort" value={f.sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}>
              {SORTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <CardSkeletons count={PAGE_SIZE} />}
      {error && <ErrorBox error={error} onRetry={reload} title="We could not load properties" />}

      {!loading && !error && data.items.length === 0 && (
        <EmptyState title="No properties match your search">
          <p>
            Try removing a filter or searching a different locality. New properties come in often, and we may have
            something that is not listed yet.
          </p>
          <div className="state-actions">
            {hasFilters && (
              <button type="button" className="btn btn-ghost" onClick={() => setParams(new URLSearchParams())}>
                Clear filters
              </button>
            )}
            <WhatsAppButton message={generalMessage}>Ask us on WhatsApp</WhatsAppButton>
          </div>
        </EmptyState>
      )}

      {!loading && !error && data.items.length > 0 && (
        <>
          <div className="grid">
            {data.items.map((l) => (
              <ListingCard key={l.id} listing={l} headingLevel={2} />
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={changePage} />
        </>
      )}
    </div>
  )
}
