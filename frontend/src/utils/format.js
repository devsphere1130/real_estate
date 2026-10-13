const LAKH = 100_000
const CRORE = 10_000_000

const inr = new Intl.NumberFormat('en-IN')

// 2 decimals max, no trailing zeros: 1.50 -> "1.5", 68.00 -> "68"
function trim(n) {
  return String(Number(n.toFixed(2)))
}

/** 6800000 -> "₹68 Lakh", 13500000 -> "₹1.35 Cr". Rent: 14000 -> "₹14,000/month". */
export function formatPrice(price, kind) {
  if (kind === 'rent') return `₹${inr.format(price)}/month`
  if (price >= CRORE) return `₹${trim(price / CRORE)} Cr`
  if (price >= LAKH) {
    const lakh = Number((price / LAKH).toFixed(2))
    if (lakh >= 100) return `₹${trim(price / CRORE)} Cr`
    return `₹${trim(lakh)} Lakh`
  }
  return `₹${inr.format(price)}`
}

export function formatArea(sqft) {
  return `${inr.format(sqft)} sq ft carpet`
}

export const typeLabel = {
  flat: 'Flat',
  villa: 'Villa',
  plot: 'Plot',
  shop: 'Shop',
  room: 'Room',
}

export const kindLabel = { sale: 'For sale', rent: 'For rent' }

export function formatFloor(floor, total) {
  if (floor == null) return null
  const where = floor === 0 ? 'Ground floor' : `Floor ${floor}`
  return total != null ? `${where} of ${total}` : where
}

export function formatAge(years) {
  if (years == null) return null
  if (years === 0) return 'New construction'
  return `${years} ${years === 1 ? 'year' : 'years'} old`
}

export function bedroomsLabel(n) {
  return n === 1 ? '1 bedroom' : `${n} bedrooms`
}

/** The API sends UTC timestamps without a timezone marker. */
export function formatDateTime(iso) {
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`)
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)
export const furnishingLabel = (f) => capitalize(f)
