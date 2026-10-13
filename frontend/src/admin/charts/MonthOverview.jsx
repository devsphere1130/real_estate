import { Link } from 'react-router-dom'
import '../../styles/charts.css'
import DailyBars, { formatDay } from './DailyBars'
import OutcomeBar from './OutcomeBar'

function TableView({ caption, head, rows }) {
  return (
    <details className="viz-table">
      <summary>View as table</summary>
      <div className="viz-table-scroll" tabIndex={0} role="region" aria-label={caption}>
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                {r.map((cell, i) => (i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function Delta({ total, before, label }) {
  const diff = total - before
  if (diff === 0) {
    return (
      <span className="kpi-sub">
        {before === 0 ? `No leads in ${label} either` : `Same as ${label} so far (${before})`}
      </span>
    )
  }
  const up = diff > 0
  return (
    <span className={`delta ${up ? 'delta-up' : 'delta-down'}`}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span> {up ? '+' : '−'}
      {Math.abs(diff)} vs {label} so far ({before})
    </span>
  )
}

function Kpi({ label, value, sub, icon, hero = false, to }) {
  const body = (
    <>
      <span className="kpi-label">
        {icon && (
          <span className={`kpi-icon kpi-icon-${icon.tone}`} aria-hidden="true">
            {icon.glyph}
          </span>
        )}
        {label}
      </span>
      <span className="kpi-value">{value}</span>
      {sub}
    </>
  )
  const cls = `kpi ${hero ? 'kpi-hero' : ''} ${to ? 'kpi-link' : ''}`
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

const pct = (n, total) => (total ? `${Math.round((n / total) * 100)}%` : '0%')

export default function MonthOverview({ data, loading, onRefresh }) {
  const monthName = data.label.split(' ')[0]
  const period = data.today ? `1 to ${data.today} ${monthName}` : data.label
  const decided = data.won + data.lost

  const busiestText = data.busiest_day
    ? `Busiest day: ${formatDay(data.busiest_day.date)} with ${data.busiest_day.leads} ${data.busiest_day.leads === 1 ? 'lead' : 'leads'}`
    : 'No enquiries yet this month'

  return (
    <section className={`viz month ${loading ? 'is-loading' : ''}`} aria-labelledby="month-title">
      <div className="month-head">
        <div>
          <h2 id="month-title">This month: {data.label}</h2>
          <p className="month-sub">Enquiries received {period}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-xs" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="kpis">
        <Kpi
          hero
          label="Leads this month"
          value={data.total}
          sub={<Delta total={data.total} before={data.previous_to_date} label={data.previous_label} />}
        />
        <Kpi
          label="Won deals"
          icon={{ tone: 'won', glyph: '✓' }}
          value={data.won}
          sub={<span className="kpi-sub">closed this month</span>}
        />
        <Kpi
          label="Lost deals"
          icon={{ tone: 'lost', glyph: '✕' }}
          value={data.lost}
          sub={<span className="kpi-sub">marked as lost</span>}
        />
        <Kpi
          label="Win rate"
          value={data.win_rate === null ? '–' : `${data.win_rate}%`}
          sub={<span className="kpi-sub">{decided ? `${data.won} won of ${decided} decided` : 'Nothing decided yet'}</span>}
        />
        <Kpi
          label="Not contacted yet"
          value={data.new}
          to={data.new > 0 ? '/admin/leads?status=new' : undefined}
          sub={<span className="kpi-sub">{data.new > 0 ? 'Open these first →' : 'All caught up'}</span>}
        />
        <Kpi
          label="Days with no leads"
          value={data.quiet_days}
          sub={<span className="kpi-sub">so far, today not counted</span>}
        />
        <Kpi
          label="Properties added"
          value={data.properties_added}
          sub={<span className="kpi-sub">new listings this month</span>}
        />
      </div>

      <div className="viz-card">
        <div className="viz-card-head">
          <h3>Leads per day</h3>
          <p>{busiestText}</p>
        </div>
        <DailyBars days={data.days} today={data.today} label={data.label} busiest={data.busiest_day} />
        <TableView
          caption={`Leads per day, ${data.label}`}
          head={['Day', 'Leads']}
          rows={data.days.map((d) => [formatDay(d.date), data.today && d.day > data.today ? '–' : String(d.leads)])}
        />
      </div>

      <div className="viz-card">
        <div className="viz-card-head">
          <h3>How this month's leads turned out</h3>
          <p>
            {data.total} {data.total === 1 ? 'lead' : 'leads'} received in {monthName}, by what has happened to them so far
          </p>
        </div>
        <OutcomeBar data={data} />
        <TableView
          caption={`Outcome of leads received in ${data.label}`}
          head={['Outcome', 'Leads', 'Share']}
          rows={[
            ['Won (closed)', String(data.won), pct(data.won, data.total)],
            ['Open: not contacted yet', String(data.new), pct(data.new, data.total)],
            ['Open: in progress', String(data.in_progress), pct(data.in_progress, data.total)],
            ['Lost', String(data.lost), pct(data.lost, data.total)],
          ]}
        />
      </div>
    </section>
  )
}
