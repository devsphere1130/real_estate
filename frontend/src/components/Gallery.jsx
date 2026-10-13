import { useState } from 'react'
import { assetUrl } from '../api/client'
import { ChevronIcon } from './Icons'
import PropertyArt from './PropertyArt'

export default function Gallery({ photos, title, propertyType }) {
  const [index, setIndex] = useState(0)
  const count = photos.length

  if (count === 0) {
    return (
      <div className="gallery">
        <div className="gallery-main">
          <PropertyArt type={propertyType} />
        </div>
        <p className="gallery-note">Photos coming soon. Message us for more pictures.</p>
      </div>
    )
  }

  const go = (next) => setIndex((next + count) % count)
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') go(index - 1)
    if (e.key === 'ArrowRight') go(index + 1)
  }

  return (
    <div className="gallery" role="group" aria-roledescription="carousel" aria-label={`Photos of ${title}`} onKeyDown={onKeyDown}>
      <div className="gallery-main">
        <img src={assetUrl(photos[index].url)} alt={`${title}, photo ${index + 1} of ${count}`} />
        {count > 1 && (
          <>
            <button type="button" className="gallery-nav gallery-prev" onClick={() => go(index - 1)} aria-label="Previous photo">
              <ChevronIcon dir="left" />
            </button>
            <button type="button" className="gallery-nav gallery-next" onClick={() => go(index + 1)} aria-label="Next photo">
              <ChevronIcon />
            </button>
            <span className="gallery-count" aria-hidden="true">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>
      {count > 1 && (
        <ul className="gallery-thumbs">
          {photos.map((photo, i) => (
            <li key={photo.id}>
              <button
                type="button"
                className={i === index ? 'is-active' : ''}
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
              >
                <img src={assetUrl(photo.url)} alt="" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
