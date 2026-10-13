import { ChevronIcon } from './Icons'

function pageList(page, pages) {
  const set = new Set([1, pages, page, page - 1, page + 1])
  const sorted = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const out = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('gap-' + n)
    out.push(n)
  })
  return out
}

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="page-btn" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        <ChevronIcon dir="left" width={16} height={16} /> <span>Previous</span>
      </button>
      <ul>
        {pageList(page, pages).map((item) =>
          typeof item === 'string' ? (
            <li key={item} aria-hidden="true" className="page-gap">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={`page-btn page-num ${item === page ? 'is-active' : ''}`}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                onClick={() => onChange(item)}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>
      <button type="button" className="page-btn" onClick={() => onChange(page + 1)} disabled={page >= pages}>
        <span>Next</span> <ChevronIcon width={16} height={16} />
      </button>
    </nav>
  )
}
