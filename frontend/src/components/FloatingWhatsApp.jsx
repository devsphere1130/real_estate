import { useLocation } from 'react-router-dom'
import { generalMessage, waLink } from '../utils/whatsapp'
import { WhatsAppIcon } from './Icons'

/** Round WhatsApp button that stays in the corner of every public page (except property pages, which have their own bar on phones). */
export default function FloatingWhatsApp() {
  const { pathname } = useLocation()
  if (/^\/properties\/[^/]+$/.test(pathname)) return null
  return (
    <a
      className="wa-float"
      href={waLink(generalMessage)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp (opens in a new tab)"
    >
      <WhatsAppIcon width={28} height={28} />
    </a>
  )
}
