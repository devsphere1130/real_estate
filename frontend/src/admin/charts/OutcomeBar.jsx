import { useState } from 'react'

// Order matters: green and red are kept apart by the teal "Open" segment (colour-blind safe, validated).
const SEGMENTS = [
  { key: 'won', label: 'Won', icon: '✓', hint: () => 'deals closed' },
  { key: 'open', label: 'Open', icon: '●', hint: (d) => `${d.new} not contacted yet · ${d.in_progress} in progress` },
  { key: 'lost', label: 'Lost', icon: '✕', hint: () => 'marked lost' },
]

const MIN_PCT_FOR_INLINE_LABEL = 12 // a number only goes inside a segment when it surely fits

/** One bar split into Won / Open / Lost for this month's enquiries, with a legend that carries every number. */
export default function OutcomeBar({ data }) {
  const [tipKey, setTipKey] = useState(null)
  const total = data.won + data.open + data.lost
  const rows = SEGMENTS.map((s) => ({ ...s, n: data[s.key], pct: total ? (data[s.key] / total) * 100 : 0 }))
  const shown = rows.filter((r) => r.n > 0)
  const tip = rows.find((r) => r.key === tipKey)

  if (total === 0) {
    return (
      <div className="outcome">
        <div className="obar obar-empty" aria-hidden="true" />
        <p className="viz-empty">No enquiries yet this month, so there is nothing to split.</p>
      </div>
    )
  }

  return (
    <div className="outcome">
      <div className="obar-wrap">
        <div className="obar" role="group" aria-label={`Of ${total} leads this month: ${data.won} won, ${data.open} open, ${data.lost} lost`}>
          {shown.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`oseg oseg-${r.key}`}
              style={{ flexGrow: r.n }}
              aria-label={`${r.label}: ${r.n} (${Math.round(r.pct)}%)`}
              onPointerEnter={() => setTipKey(r.key)}
              onPointerLeave={(e) => e.pointerType !== 'touch' && setTipKey(null)}
              onFocus={() => setTipKey(r.key)}
              onBlur={() => setTipKey(null)}
            >
              {r.pct >= MIN_PCT_FOR_INLINE_LABEL && <span>{r.n}</span>}
            </button>
          ))}
        </div>
        {tip && tip.n > 0 && (
          <div className="viz-tip viz-tip-below" aria-hidden="true">
            <span className="viz-tip-value">
              <span className={`viz-key viz-key-${tip.key}`} />
              {tip.n} {tip.label.toLowerCase()} · {Math.round(tip.pct)}%
            </span>
            <span className="viz-tip-label">{tip.hint(data)}</span>
          </div>
        )}
      </div>

      <ul className="olegend">
        {rows.map((r) => (
          <li key={r.key}>
            <span className={`swatch swatch-${r.key}`} aria-hidden="true">
              {r.icon}
            </span>
            <span className="olegend-text">
              <span className="olegend-title">
                {r.label} <b>{r.n}</b> <span className="olegend-share">{Math.round(r.pct)}%</span>
              </span>
              <span className="olegend-hint">{r.hint(data)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
