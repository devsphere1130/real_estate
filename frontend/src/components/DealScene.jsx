// The "deal" story that plays on the road under the photo skyline (one 18 second loop):
//   car arrives from the left and parks -> client steps out -> owner walks in from the right ->
//   client opens a suitcase of cash -> hands it to the owner -> "Deal done!" -> everyone leaves.
// It is purely decorative (aria-hidden). All timing lives in landing.css (keyframes named deal*).

function Person({ role }) {
  const client = role === 'client'
  const label = client ? 'Client' : 'Owner'
  return (
    <g className={`deal-anim deal-${role}`}>
      <ellipse className="deal-shadow" cx="0" cy="0" rx="15" ry="3" />
      <g className={`deal-flip flip-${role}`}>
        {/* legs: still pair, and a walking pair that swings */}
        <g className={`legs legs-stand legs-stand-${role}`}>
          <rect className={`${role}-pants edge`} x="-6" y="-28" width="6" height="27" rx="2.5" />
          <rect className={`${role}-pants edge`} x="0" y="-28" width="6" height="27" rx="2.5" />
          <rect className="shoe" x="-7.5" y="-4" width="9" height="4" rx="2" />
          <rect className="shoe" x="-1.5" y="-4" width="9" height="4" rx="2" />
        </g>
        <g className={`legs legs-walk legs-walk-${role}`}>
          <g className="leg leg-a">
            <rect className={`${role}-pants edge`} x="-3" y="-28" width="6" height="27" rx="3" />
            <rect className="shoe" x="-3.5" y="-4" width="9" height="4" rx="2" />
          </g>
          <g className="leg leg-b">
            <rect className={`${role}-pants edge`} x="-3" y="-28" width="6" height="27" rx="3" />
            <rect className="shoe" x="-3.5" y="-4" width="9" height="4" rx="2" />
          </g>
        </g>

        {/* body */}
        {client ? (
          <>
            <rect className="client-suit edge" x="-10" y="-50" width="20" height="24" rx="6" />
            <polygon className="shirt" points="-3.5,-50 3.5,-50 0,-41" />
            <polygon className="tie" points="0,-48 -2,-43 0,-36 2,-43" />
          </>
        ) : (
          <>
            <rect className="owner-shirt edge" x="-10" y="-50" width="20" height="24" rx="6" />
            <rect className="owner-vest" x="-10" y="-50" width="7.5" height="24" rx="3.5" />
            <rect className="owner-vest" x="2.5" y="-50" width="7.5" height="24" rx="3.5" />
          </>
        )}
        <rect className="skin" x="-2.5" y="-54" width="5" height="5" />
        <circle className="skin edge" cx="0" cy="-59" r="7.5" />
        <circle className="skin" cx="7.6" cy="-58" r="1.6" />
        <path className={`hair-${role}`} d="M-7.8 -60 C-7.8 -69.5 7.8 -69.5 7.8 -60 C4 -63.5 -4 -63.5 -7.8 -60Z" />
        <circle className="eye" cx="3.6" cy="-60" r="0.9" />
        {!client && <rect className="moustache" x="3" y="-55.8" width="5" height="1.4" rx="0.7" />}

        {/* the arm that holds the case and shakes hands */}
        <g className={`arm arm-${role}`}>
          <rect className={client ? 'client-suit edge' : 'owner-shirt edge'} x="-3.2" y="-48" width="6.4" height="23" rx="3.2" />
          <circle className="skin" cx="0" cy="-24.5" r="3.4" />
        </g>
      </g>

      <g className="deal-label">
        <rect x="-23" y="-94" width="46" height="17" rx="8.5" />
        <text x="0" y="-82" textAnchor="middle">
          {label}
        </text>
      </g>
    </g>
  )
}

function Suitcase() {
  return (
    <g className="deal-anim deal-case">
      <path d="M-6 4 V0 H6 V4" fill="none" stroke="#3b2410" strokeWidth="2" strokeLinecap="round" />
      <rect x="-14" y="7" width="28" height="14" rx="2" fill="#7a4a21" />
      <g className="case-bills">
        <rect x="-11" y="2.5" width="22" height="6" rx="1" fill="#3fa660" />
        <rect x="-11" y="5" width="22" height="1.4" fill="#9fdcae" />
      </g>
      <g className="case-lid">
        <rect x="-14" y="1" width="28" height="6" rx="2" fill="#8d5629" />
        <rect x="-2" y="4.6" width="4" height="3" rx="0.8" fill="#e8c15a" />
      </g>
      <rect x="-2" y="12" width="4" height="3" rx="0.8" fill="#e8c15a" />
      <text className="case-rupee" x="0" y="-4" textAnchor="middle">
        ₹
      </text>
    </g>
  )
}

const SPARKS = [
  [668, -104, '0s'],
  [776, -108, '0.15s'],
  [694, -150, '0.3s'],
  [748, -154, '0.1s'],
  [720, -96, '0.25s'],
]

function Badge() {
  return (
    <>
      <g transform="translate(720 -122)">
        <g className="deal-anim deal-badge">
          <rect x="-60" y="-30" width="120" height="30" rx="15" />
          <circle className="badge-dot" cx="-41" cy="-15" r="9" />
          <path d="M-45 -15 l3 3 l6 -7" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="8" y="-9.5" textAnchor="middle">
            Deal done!
          </text>
        </g>
      </g>
      <g className="deal-anim deal-sparkles">
        {SPARKS.map(([x, y, delay]) => (
          <path
            key={`${x}-${y}`}
            className="spark"
            transform={`translate(${x} ${y})`}
            style={{ animationDelay: delay }}
            d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2Z"
          />
        ))}
      </g>
    </>
  )
}

function Car() {
  return (
    <g className="deal-anim deal-car">
      <rect className="car-body" x="0" y="-22" width="130" height="16" rx="6" />
      <path className="car-body" d="M24 -22 L38 -40 H88 L106 -22Z" />
      <path className="car-glass" d="M32 -24 L42 -37 H61 V-24Z" />
      <path className="car-glass" d="M66 -24 V-37 H86 L98 -24Z" />
      <rect className="car-door" x="63.5" y="-37" width="1.4" height="30" />
      <rect className="car-light" x="123" y="-19" width="7" height="5" rx="2" />
      <circle className="car-wheel" cx="30" cy="-5" r="9" />
      <circle className="car-wheel" cx="102" cy="-5" r="9" />
      <circle className="car-hub" cx="30" cy="-5" r="3.5" />
      <circle className="car-hub" cx="102" cy="-5" r="3.5" />
    </g>
  )
}

export default function DealScene() {
  return (
    <svg className="deal-scene" viewBox="0 0 1440 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <rect className="deal-walk" x="0" y="0" width="1440" height="100" />
      <rect className="deal-curb" x="0" y="96" width="1440" height="4" />
      <rect className="deal-road" x="0" y="100" width="1440" height="20" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <rect key={i} className="deal-lane" x={30 + i * 125} y="109" width="55" height="3" rx="1.5" />
      ))}
      <g transform="translate(0 96)">
        <Person role="client" />
        <Person role="owner" />
        <Suitcase />
        <Badge />
      </g>
      <g transform="translate(0 114)">
        <Car />
      </g>
    </svg>
  )
}
