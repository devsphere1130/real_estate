import { Link, useParams } from 'react-router-dom'
import { ApiError, assetUrl, listingsApi } from '../api/client'
import Gallery from '../components/Gallery'
import { PhoneIcon, PinIcon } from '../components/Icons'
import LeadForm from '../components/LeadForm'
import { ErrorBox, Loading } from '../components/States'
import WhatsAppButton from '../components/WhatsAppButton'
import { phoneTel, site } from '../config/site'
import { useFetch } from '../hooks/useFetch'
import {
  bedroomsLabel,
  formatAge,
  formatArea,
  formatFloor,
  formatPrice,
  furnishingLabel,
  kindLabel,
  typeLabel,
} from '../utils/format'
import { useSeo } from '../utils/seo'
import { listingMessage } from '../utils/whatsapp'
import NotFound from './NotFound'

const STATUS_TEXT = {
  sold: 'This property has been sold.',
  rented: 'This property has been rented out.',
}

function Facts({ listing }) {
  const rows = [
    ['Reference', listing.ref_code],
    ['Property type', typeLabel[listing.property_type]],
    ['Carpet area', formatArea(listing.carpet_area_sqft)],
    listing.bedrooms != null && ['Bedrooms', bedroomsLabel(listing.bedrooms)],
    listing.floor != null && ['Floor', formatFloor(listing.floor, listing.total_floors)],
    listing.age_years != null && ['Age', formatAge(listing.age_years)],
    listing.facing && ['Facing', listing.facing],
    listing.furnishing && ['Furnishing', furnishingLabel(listing.furnishing)],
  ].filter(Boolean)

  return (
    <dl className="facts-grid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Detail({ listing }) {
  const price = formatPrice(listing.price, listing.kind)
  const description =
    `${typeLabel[listing.property_type]} ${kindLabel[listing.kind].toLowerCase()} in ${listing.locality}, ${listing.city}. ` +
    `${price}, ${formatArea(listing.carpet_area_sqft)}. Ref ${listing.ref_code}. Book a visit with DevSphere.`
  const photoUrls = listing.photos.map((p) => assetUrl(p.url))
  useSeo({
    title: `${listing.title} in ${listing.locality}, ${listing.city}`,
    description,
    image: photoUrls[0],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: listing.title,
      description,
      url: `${site.url.replace(/\/$/, '')}/properties/${listing.ref_code}`,
      ...(photoUrls.length && { image: photoUrls }),
      address: { '@type': 'PostalAddress', addressLocality: listing.locality, addressRegion: listing.city, addressCountry: 'IN' },
      floorSize: { '@type': 'QuantitativeValue', value: listing.carpet_area_sqft, unitCode: 'FTK' },
      offers: {
        '@type': 'Offer',
        price: listing.price,
        priceCurrency: 'INR',
        availability: listing.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      },
    },
  })

  const unavailable = STATUS_TEXT[listing.status]

  return (
    <div className="container page detail">
      <p className="back">
        <Link to="/properties">← All properties</Link>
      </p>

      <div className="detail-grid">
        <div className="detail-main">
          <Gallery key={listing.ref_code} photos={listing.photos} title={listing.title} propertyType={listing.property_type} />

          <header className="detail-head">
            <div className="card-badges card-badges-static">
              <span className={`pill pill-${listing.kind}`}>{kindLabel[listing.kind]}</span>
              <span className="pill pill-outline">{listing.ref_code}</span>
            </div>
            <h1>{listing.title}</h1>
            <p className="card-locality">
              <PinIcon /> {listing.locality}, {listing.city}
            </p>
            <p className="detail-price">{price}</p>
            {unavailable && (
              <p className="notice" role="status">
                {unavailable} Message us and we will suggest similar properties.
              </p>
            )}
          </header>

          <section aria-labelledby="facts-title">
            <h2 id="facts-title" className="block-title">
              Property details
            </h2>
            <Facts listing={listing} />
          </section>

          {listing.amenities.length > 0 && (
            <section aria-labelledby="amen-title">
              <h2 id="amen-title" className="block-title">
                Amenities
              </h2>
              <ul className="chips">
                {listing.amenities.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          )}

          {listing.description && (
            <section aria-labelledby="desc-title">
              <h2 id="desc-title" className="block-title">
                About this property
              </h2>
              <p className="description">{listing.description}</p>
            </section>
          )}
        </div>

        <aside className="detail-side" aria-label="Contact about this property">
          <div className="side-card">
            <p className="side-price">{price}</p>
            <div className="side-actions">
              <WhatsAppButton message={listingMessage(listing)} className="btn-block">
                WhatsApp about {listing.ref_code}
              </WhatsAppButton>
              <a className="btn btn-ghost btn-block" href={phoneTel}>
                <PhoneIcon /> Call now
              </a>
            </div>
          </div>
          <div className="side-card">
            <LeadForm key={listing.ref_code} listing={listing} title="Ask about this property" />
          </div>
        </aside>
      </div>

      <div className="mobile-bar">
        <WhatsAppButton message={listingMessage(listing)}>WhatsApp</WhatsAppButton>
        <a className="btn btn-primary" href={phoneTel}>
          <PhoneIcon /> Call
        </a>
      </div>
    </div>
  )
}

export default function ListingDetail() {
  const { refCode } = useParams()
  const { data, error, loading, reload } = useFetch((signal) => listingsApi.get(refCode, signal), refCode)

  if (loading) {
    return (
      <div className="container page">
        <Loading label="Loading property…" />
      </div>
    )
  }
  if (error instanceof ApiError && error.status === 404) return <NotFound what="property" />
  if (error) {
    return (
      <div className="container page">
        <ErrorBox error={error} onRetry={reload} title="We could not load this property" />
      </div>
    )
  }
  return <Detail listing={data} />
}
