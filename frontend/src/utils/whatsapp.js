import { site } from '../config/site'
import { formatPrice, typeLabel } from './format'

export function waLink(text) {
  const base = `https://wa.me/91${site.whatsapp}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/** Link to chat with a customer (10-digit Indian mobile), used in the admin panel. */
export function waLinkTo(phone10, text) {
  const base = `https://wa.me/91${phone10}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

export function listingMessage(listing) {
  return (
    `Hi DevSphere, I am interested in ${listing.ref_code}: ${listing.title} ` +
    `(${formatPrice(listing.price, listing.kind)}). Please share details and a visit time.`
  )
}

/** Same details the customer typed into the enquiry form, so you get the enquiry in two places. */
export function leadMessage(form, listing) {
  const lines = ['Hi DevSphere, I just sent an enquiry on your website.']
  if (listing) lines.push(`Property: ${listing.ref_code} · ${listing.title}`)
  lines.push(`Name: ${form.name}`)
  lines.push(`Phone: ${form.phone}`)
  lines.push(`Looking to: ${form.interest === 'rent' ? 'Rent' : 'Buy'}`)
  if (form.property_type) lines.push(`Property type: ${typeLabel[form.property_type]}`)
  if (form.budget_text) lines.push(`Budget: ${form.budget_text}`)
  if (form.message) lines.push(`Message: ${form.message}`)
  return lines.join('\n')
}

export const generalMessage = 'Hi DevSphere, I would like to know about your available properties.'
