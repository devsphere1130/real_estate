import { useRef, useState } from 'react'

const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]

/** Clean round y-axis: at most ~4 intervals, whole numbers only (leads are counted in ones). */
function niceScale(max) {
  const step = STEPS.find((s) => max / s <= 4) ?? 1000
  const top = Math.ceil(max / step) * step
  const ticks = []
  for (let t = 0; t <= top; t += step) ticks.push(t)
  return { top, ticks }
}

export const formatDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

const leadsText = (n) => `${n} ${n === 1 ? 'lead' : 'leads'}`

/**
 * One column per day of the month. Columns for days that have not happened yet stay empty,
 * so the reader sees the whole month and where "today" is.
 */
export default function DailyBars({ days, today, label, busiest }) {
  const max = Math.max(1, ...days.map((d) => d.leads))
  const { top, ticks } = niceScale(max)
  const lastDay = days.length

  const [hover, setHover] = useState(null)
  const [focus, setFocus] = useState(null)
  const [active, setActive] = useState(today ? today - 1 : lastDay - 1) // the one column in the tab order
  const refs = useRef([])
  const tipIndex = hover ?? focus

  function onKeyDown(e) {
    const keys = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: lastDay - 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    const next = Math.min(lastDay - 1, Math.max(0, keys[e.key]))
    setActive(next)
    refs.current[next]?.focus()
  }

  const showLabel = (d) => d.day === 1 || d.day % 5 === 0 || (d.day === lastDay && lastDay % 5 >= 3)
  const tip = tipIndex === null ? null : days[tipIndex]
  const tipFuture = tip && today !== null && tip.day > today

  return (
    <div className="dbars">
      <div className="dbars-y" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>
            {t}
          </span>
        ))}
      </div>

      <div className="dbars-plot" role="group" aria-label={`Leads per day, ${label}`} onKeyDown={onKeyDown}>
        {ticks.map((t) => (
          <div key={t} className={`dbars-grid ${t === 0 ? 'is-base' : ''}`} style={{ bottom: `${(t / top) * 100}%` }} aria-hidden="true" />
        ))}

        <div className="dbars-cols">
          {days.map((d, i) => {
            const future = today !== null && d.day > today
            const isToday = d.day === today
            const isBusiest = busiest && d.day === busiest.day
            return (
              <button
                key={d.day}
                type="button"
                ref={(el) => (refs.current[i] = el)}
                className={`dcol ${isToday ? 'is-today' : ''} ${future ? 'is-future' : ''}`}
                tabIndex={i === active ? 0 : -1}
                aria-current={isToday ? 'date' : undefined}
                aria-label={future ? `${formatDay(d.date)}: upcoming` : `${formatDay(d.date)}: ${leadsText(d.leads)}${isToday ? ' (today)' : ''}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={(e) => e.pointerType !== 'touch' && setHover(null)}
                onFocus={() => {
                  setActive(i)
                  setFocus(i)
                  setHover(null) // the keyboard takes over from a resting mouse
                }}
                onBlur={() => setFocus(null)}
              >
                <span
                  className={`dbar ${d.leads === 0 || future ? 'is-empty' : ''}`}
                  style={d.leads > 0 && !future ? { height: `${(d.leads / top) * 100}%` } : undefined}
                >
                  {isBusiest && <span className="dval">{d.leads}</span>}
                </span>
              </button>
            )
          })}
        </div>

        {tip && (
          <div
            className="viz-tip viz-tip-bar"
            style={{ '--x': `${((tipIndex + 0.5) / lastDay) * 100}%`, '--y': `${tipFuture ? 0 : (tip.leads / top) * 100}%` }}
            aria-hidden="true"
          >
            <span className="viz-tip-value">
              <span className="viz-key viz-key-series" />
              {tipFuture ? 'Upcoming' : leadsText(tip.leads)}
            </span>
            <span className="viz-tip-label">{formatDay(tip.date)}</span>
          </div>
        )}
      </div>

      <div className="dbars-x" aria-hidden="true">
        {days.map((d) => (
          <span key={d.day} className={`dx ${d.day === today ? 'is-today' : ''}`}>
            {showLabel(d) || d.day === today ? <b>{d.day}</b> : null}
          </span>
        ))}
      </div>
    </div>
  )
}
