import { waLink } from '../utils/whatsapp'
import { WhatsAppIcon } from './Icons'

export default function WhatsAppButton({ message, children = 'WhatsApp us', className = '', ...rest }) {
  return (
    <a
      className={`btn btn-wa ${className}`}
      href={waLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
    >
      <WhatsAppIcon />
      <span>{children}</span>
      <span className="sr-only"> (opens WhatsApp in a new tab)</span>
    </a>
  )
}
