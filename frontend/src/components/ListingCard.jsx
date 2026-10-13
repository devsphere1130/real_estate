import { Link } from 'react-router-dom'
import { assetUrl } from '../api/client'
import { bedroomsLabel, formatAge, formatArea, formatFloor, formatPrice, kindLabel, typeLabel } from '../utils/format'
import { AreaIcon, BedIcon, FloorIcon, PinIcon } from './Icons'
import PropertyArt from './PropertyArt'

export function ListingMedia({ listing }) {
  return listing.cover_url ? (
    <img src={assetUrl(listing.cover_url)} alt={`${listing.title}, ${listing.locality}`} loading="lazy" />
  ) : (
    <PropertyArt type={listing.property_type} />
  )
}

export default function ListingCard({ listing, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`
  const floor = formatFloor(listing.floor, listing.total_floors)
  const age = formatAge(listing.age_years)

  return (
    <article className="card">
      <div className="card-media">
        <ListingMedia listing={listing} />
        <div className="card-badges">
          <span className={`pill pill-${listing.kind}`}>{kindLabel[listing.kind]}</span>
          {listing.status !== 'available' && <span className="pill pill-status">{listing.status}</span>}
        </div>
        <span className="pill pill-ref">{listing.ref_code}</span>
      </div>

      <div className="card-body">
        <p className="card-type">{typeLabel[listing.property_type]}</p>
        <Heading className="card-title">
          <Link to={`/properties/${listing.ref_code}`} className="card-link">
            {listing.title}
          </Link>
        </Heading>
        <p className="card-locality">
          <PinIcon /> {listing.locality}, {listing.city}
        </p>
        <p className="card-price">{formatPrice(listing.price, listing.kind)}</p>
        <ul className="facts">
          <li>
            <AreaIcon /> {formatArea(listing.carpet_area_sqft)}
          </li>
          {listing.bedrooms != null && (
            <li>
              <BedIcon /> {bedroomsLabel(listing.bedrooms)}
            </li>
          )}
          {floor && (
            <li>
              <FloorIcon /> {floor}
            </li>
          )}
          {age && <li>{age}</li>}
        </ul>
      </div>
    </article>
  )
}
