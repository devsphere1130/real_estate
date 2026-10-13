import { Link } from 'react-router-dom'
import { useSeo } from '../utils/seo'
import WhatsAppButton from '../components/WhatsAppButton'
import { generalMessage } from '../utils/whatsapp'

export default function NotFound({ what = 'page' }) {
  useSeo({ title: what === 'property' ? 'Property not found' : 'Page not found' })
  return (
    <div className="container page">
      <div className="state">
        <h1 className="state-title">{what === 'property' ? 'We could not find that property' : 'Page not found'}</h1>
        <p>
          {what === 'property'
            ? 'It may have been sold, rented out or removed. Browse our current properties or ask us on WhatsApp.'
            : 'The page you are looking for does not exist or has moved.'}
        </p>
        <div className="state-actions">
          <Link to="/properties" className="btn btn-primary">
            Browse properties
          </Link>
          <WhatsAppButton message={generalMessage}>Ask on WhatsApp</WhatsAppButton>
        </div>
      </div>
    </div>
  )
}
