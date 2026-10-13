// Illustrations used when a listing has no photo yet. Colours come from CSS variables (--art-*).
function Flat() {
  const cols1 = [90, 110, 130, 150]
  const rows1 = [52, 72, 92, 112, 132]
  const cols2 = [188, 208, 228]
  const rows2 = [97, 117, 137]
  return (
    <>
      <rect className="art-a" x="80" y="40" width="88" height="110" />
      {rows1.map((y) =>
        cols1.map((x) => (
          <rect key={`${x}-${y}`} className={x === 130 && y === 72 ? 'art-c' : 'art-win'} x={x} y={y} width="12" height="12" />
        )),
      )}
      <rect className="art-b" x="178" y="85" width="64" height="65" />
      {rows2.map((y) =>
        cols2.map((x) => <rect key={`${x}-${y}`} className="art-win" x={x} y={y} width="10" height="10" />),
      )}
    </>
  )
}

function Villa() {
  return (
    <>
      <rect className="art-b" x="100" y="82" width="120" height="68" />
      <polygon className="art-a" points="90,84 160,32 230,84" />
      <rect className="art-win" x="116" y="100" width="22" height="22" />
      <rect className="art-win" x="182" y="100" width="22" height="22" />
      <rect className="art-c" x="150" y="108" width="20" height="42" />
      <rect className="art-tree-trunk" x="62" y="128" width="5" height="22" />
      <circle className="art-tree" cx="64" cy="118" r="18" />
      <rect className="art-tree-trunk" x="256" y="130" width="5" height="20" />
      <circle className="art-tree" cx="258" cy="120" r="16" />
    </>
  )
}

function Plot() {
  const posts = [60, 100, 140, 180, 220, 260]
  return (
    <>
      <polygon className="art-b" points="30,150 290,150 262,104 58,104" />
      <rect className="art-a" x="58" y="118" width="204" height="3" />
      <rect className="art-a" x="52" y="134" width="216" height="3" />
      {posts.map((x) => (
        <rect key={x} className="art-a" x={x} y="108" width="5" height="40" />
      ))}
      <rect className="art-ink" x="156" y="62" width="6" height="58" />
      <rect className="art-c" x="124" y="40" width="70" height="34" rx="5" />
      <rect className="art-ink" x="134" y="50" width="50" height="4" rx="2" />
      <rect className="art-ink" x="134" y="60" width="32" height="4" rx="2" />
    </>
  )
}

function Shop() {
  const stripes = [0, 1, 2, 3, 4, 5]
  return (
    <>
      <rect className="art-b" x="64" y="56" width="192" height="94" />
      {stripes.map((i) => (
        <rect key={i} className={i % 2 ? 'art-light' : 'art-a'} x={64 + i * 32} y="56" width="32" height="26" />
      ))}
      <rect className="art-win" x="84" y="98" width="82" height="52" />
      <rect className="art-c" x="190" y="98" width="42" height="52" />
      <rect className="art-ink" x="84" y="92" width="82" height="3" />
    </>
  )
}

function Room() {
  return (
    <>
      <rect className="art-win" x="206" y="36" width="70" height="62" />
      <rect className="art-a" x="239" y="36" width="4" height="62" />
      <rect className="art-a" x="206" y="65" width="70" height="4" />
      <rect className="art-b" x="48" y="82" width="12" height="68" />
      <rect className="art-a" x="48" y="112" width="150" height="30" rx="4" />
      <rect className="art-light" x="64" y="100" width="40" height="14" rx="6" />
      <rect className="art-b" x="54" y="142" width="8" height="8" />
      <rect className="art-b" x="184" y="142" width="8" height="8" />
      <rect className="art-ink" x="226" y="118" width="3" height="32" />
      <circle className="art-c" cx="227.500" cy="112" r="9" />
    </>
  )
}

const ART = { flat: Flat, villa: Villa, plot: Plot, shop: Shop, room: Room }

export default function PropertyArt({ type = 'flat' }) {
  const Shape = ART[type] || Flat
  return (
    <svg className="property-art" viewBox="0 0 320 180" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <rect className="art-sky" width="320" height="180" />
      <Shape />
      <rect className="art-ground" y="150" width="320" height="30" />
    </svg>
  )
}
