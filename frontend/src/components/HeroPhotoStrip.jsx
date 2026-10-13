import DealScene from './DealScene'

// A "skyline" made of real building and room photos, with the deal story playing on the street below.
// To use your own photos, replace the files in public/images/landing/ or edit this list.
// h = panel height in px on a wide screen (it scales down on small screens).
const PANELS = [
  { src: 'tower', h: 150 },
  { src: 'living-room', h: 110 },
  { src: 'modern-house', h: 176 },
  { src: 'bedroom', h: 95 },
  { src: 'villa-pool', h: 160 },
  { src: 'lounge', h: 120 },
  { src: 'apartment-block', h: 168 },
  { src: 'garden-house', h: 130 },
]

export default function HeroPhotoStrip() {
  return (
    <div className="photo-strip" aria-hidden="true">
      <div className="strip-panels">
        {PANELS.map((p, i) => (
          <figure key={p.src} className="strip-panel" style={{ '--h': p.h, animationDelay: `${150 + i * 90}ms` }}>
            <img src={`/images/landing/${p.src}.webp`} alt="" width="320" height={Math.round(p.h * 1.6)} decoding="async" />
          </figure>
        ))}
      </div>
      <DealScene />
    </div>
  )
}
