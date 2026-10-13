// Budget presets for the search box and filters. value = "min-max" in rupees (either side may be empty).
export const BUDGETS = {
  sale: [
    { value: '', label: 'Any budget' },
    { value: '-2500000', label: 'Under ₹25 Lakh' },
    { value: '2500000-5000000', label: '₹25 Lakh to ₹50 Lakh' },
    { value: '5000000-10000000', label: '₹50 Lakh to ₹1 Cr' },
    { value: '10000000-20000000', label: '₹1 Cr to ₹2 Cr' },
    { value: '20000000-', label: 'Above ₹2 Cr' },
  ],
  rent: [
    { value: '', label: 'Any budget' },
    { value: '-10000', label: 'Under ₹10,000' },
    { value: '10000-20000', label: '₹10,000 to ₹20,000' },
    { value: '20000-40000', label: '₹20,000 to ₹40,000' },
    { value: '40000-', label: 'Above ₹40,000' },
  ],
}

export function splitBudget(value) {
  if (!value) return {}
  const [min, max] = value.split('-')
  return { min_price: min || undefined, max_price: max || undefined }
}

/** Find the preset that matches current min/max params, so the select shows it. */
export function budgetValueFor(kind, min, max) {
  if (!kind || (!min && !max)) return ''
  const wanted = `${min || ''}-${max || ''}`
  return BUDGETS[kind]?.some((b) => b.value === wanted) ? wanted : ''
}
