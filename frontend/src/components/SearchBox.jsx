import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BUDGETS, splitBudget } from '../utils/budgets'
import { typeLabel } from '../utils/format'

const KINDS = [
  { value: '', label: 'All' },
  { value: 'sale', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
]

export default function SearchBox() {
  const navigate = useNavigate()
  const id = useId()
  const [kind, setKind] = useState('')
  const [type, setType] = useState('')
  const [budget, setBudget] = useState('')
  const [q, setQ] = useState('')

  function chooseKind(value) {
    setKind(value)
    setBudget('')
  }

  function submit(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (kind) params.set('kind', kind)
    if (type) params.set('type', type)
    const { min_price, max_price } = splitBudget(budget)
    if (min_price) params.set('min_price', min_price)
    if (max_price) params.set('max_price', max_price)
    if (q.trim()) params.set('q', q.trim())
    navigate(`/properties${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <form className="search-card" onSubmit={submit} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="search-title">
        Find a property
      </h2>

      <div className="segmented" role="group" aria-label="Buy or rent">
        {KINDS.map((k) => (
          <button
            key={k.label}
            type="button"
            className={kind === k.value ? 'is-active' : ''}
            aria-pressed={kind === k.value}
            onClick={() => chooseKind(k.value)}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`${id}-type`}>Type</label>
          <select id={`${id}-type`} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Any type</option>
            {Object.entries(typeLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-budget`}>Budget</label>
          <select id={`${id}-budget`} value={budget} onChange={(e) => setBudget(e.target.value)} disabled={!kind}>
            {!kind ? (
              <option value="">Pick Buy or Rent first</option>
            ) : (
              BUDGETS[kind].map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${id}-q`}>Locality</label>
        <input
          id={`${id}-q`}
          type="text"
          value={q}
          maxLength={100}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Green Park Road"
          autoComplete="off"
        />
      </div>

      <button type="submit" className="btn btn-primary btn-block">
        Show properties
      </button>
    </form>
  )
}
