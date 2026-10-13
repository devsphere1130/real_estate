import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listingsApi } from '../api/client'
import CountUp from '../components/CountUp'
import HeroPhotoStrip from '../components/HeroPhotoStrip'
import { ArrowIcon, CalendarIcon, KeyIcon, PhoneIcon, RulerIcon, WhatsAppIcon } from '../components/Icons'
import ListingCard from '../components/ListingCard'
import PropertyArt from '../components/PropertyArt'
import Reveal from '../components/Reveal'
import SearchBox from '../components/SearchBox'
import { CardSkeletons, ErrorBox } from '../components/States'
import WhatsAppButton from '../components/WhatsAppButton'
import { phoneTel, site } from '../config/site'
import { useFetch } from '../hooks/useFetch'
import { useSeo } from '../utils/seo'
import { generalMessage } from '../utils/whatsapp'

const ROTATING = ['flat', 'villa', 'plot', 'shop', 'room']

const TYPES = [
  { type: 'flat', name: 'Flats', text: 'Apartments for families' },
  { type: 'villa', name: 'Villas', text: 'Independent homes' },
  { type: 'plot', name: 'Plots', text: 'Land to build on' },
  { type: 'shop', name: 'Shops', text: 'Retail and office space' },
  { type: 'room', name: 'Rooms', text: 'Simple rooms to rent' },
]

const WHY = [
  { Icon: RulerIcon, title: 'Carpet area on every listing', text: 'No guessing. Every property shows its carpet area, floor and age up front.' },
  { Icon: CalendarIcon, title: 'Visit this week', text: 'Pick a property and we arrange a visit at a time that suits you.' },
  { Icon: WhatsAppIcon, title: 'Replies on WhatsApp', text: 'Message us any time. We reply the same day, usually within a few hours.' },
  { Icon: KeyIcon, title: 'Deal directly with us', text: 'No middlemen. You speak to the agent who actually shows you the property.' },
]

const STEPS = [
  { title: 'Pick a property', text: 'Browse listings with carpet area, floor and age shown clearly. No hidden details.' },
  { title: 'Message us', text: 'Tap WhatsApp or send an enquiry. We reply the same day, usually within a few hours.' },
  { title: 'We set up the visit', text: 'We arrange a time that suits you and meet you at the property. You deal with us directly.' },
]

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Cycles through property types for the line under the headline. */
function useRotatingWord(words, ms = 2200) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (prefersReducedMotion()) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), ms)
    return () => clearInterval(timer)
  }, [words.length, ms])
  return words[index]
}

function Section({ id, title, subtitle, children, className = '' }) {
  return (
    <section className={`section ${className}`} aria-labelledby={`${id}-title`}>
      <div className="container">
        <Reveal className="section-head">
          <h2 id={`${id}-title`}>{title}</h2>
          {subtitle && <p className="section-sub">{subtitle}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  )
}

function CardGrid({ items }) {
  return (
    <div className="grid">
      {items.map((l, i) => (
        <Reveal key={l.id} delay={(i % 3) * 90}>
          <ListingCard listing={l} />
        </Reveal>
      ))}
    </div>
  )
}

export default function Home() {
  useSeo({
    title: 'DevSphere Real Estate | Flats, villas, plots and shops for sale and rent',
    description:
      'DevSphere sells and rents flats, villas, plots, shops and rooms directly. Browse listings with carpet area on every property and book a visit this week.',
  })
  const word = useRotatingWord(ROTATING)

  const counts = useFetch(
    (signal) =>
      Promise.all([
        listingsApi.list({ kind: 'sale', page_size: 1 }, signal),
        listingsApi.list({ kind: 'rent', page_size: 1 }, signal),
      ]),
    'counts',
  )
  const featured = useFetch((signal) => listingsApi.list({ featured: true, page_size: 3 }, signal), 'featured')
  const latest = useFetch((signal) => listingsApi.list({ page_size: 9 }, signal), 'latest')

  const featuredItems = featured.data?.items ?? []
  const featuredIds = new Set(featuredItems.map((l) => l.id))
  const latestItems = (latest.data?.items ?? []).filter((l) => !featuredIds.has(l.id)).slice(0, 6)
  const localities = [...new Set([...featuredItems, ...(latest.data?.items ?? [])].map((l) => l.locality))]

  return (
    <>
      <section className="hero">
        <div className="hero-sky" aria-hidden="true">
          <span className="hero-orb" />
          <span className="cloud cloud-1" />
          <span className="cloud cloud-2" />
          <span className="cloud cloud-3" />
          {[12, 22, 31, 47, 58, 66, 79, 88].map((left, i) => (
            <i key={left} className="star" style={{ left: `${left}%`, top: `${8 + ((i * 17) % 38)}%`, animationDelay: `${i * 0.6}s` }} />
          ))}
        </div>

        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow rise-in" style={{ '--d': '0ms' }}>
              Real estate agent · Sale and rent
            </p>
            <h1 className="rise-in" style={{ '--d': '90ms' }}>
              Homes, shops and plots you can <span className="hl">visit this week.</span>
            </h1>
            <p className="hero-rotate rise-in" style={{ '--d': '180ms' }} aria-hidden="true">
              Looking for a{' '}
              <span key={word} className="rot-word">
                {word}
              </span>?
            </p>
            <p className="hero-text rise-in" style={{ '--d': '260ms' }}>
              DevSphere sells and rents flats, villas, plots, shops and rooms directly. Pick a property, message us, and we set up the
              visit.
            </p>
            <div className="hero-cta rise-in" style={{ '--d': '340ms' }}>
              <Link to="/properties" className="btn btn-primary btn-lg">
                Browse properties <ArrowIcon width={20} height={20} />
              </Link>
              <WhatsAppButton message={generalMessage} className="btn-lg">
                WhatsApp us
              </WhatsAppButton>
            </div>
            <ul className="hero-points rise-in" style={{ '--d': '420ms' }}>
              {counts.data && (
                <>
                  <li>{counts.data[0].total} for sale</li>
                  <li>{counts.data[1].total} for rent</li>
                </>
              )}
              <li>Carpet area on every listing</li>
            </ul>
          </div>

          <div className="hero-side rise-in" style={{ '--d': '300ms' }}>
            <SearchBox />
            <div className="float-chip chip-a" aria-hidden="true">
              <CalendarIcon width={18} height={18} /> Visit this week
            </div>
            <div className="float-chip chip-b" aria-hidden="true">
              <RulerIcon width={18} height={18} /> Carpet area upfront
            </div>
          </div>
        </div>

        <HeroPhotoStrip />
      </section>

      <section className="stats-strip" aria-label="DevSphere at a glance">
        <div className="container">
          <Reveal className="stats-card">
            <div className="stat-item">
              <span className="stat-num">{counts.data ? <CountUp to={counts.data[0].total} /> : '–'}</span>
              <span className="stat-text">Properties for sale</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{counts.data ? <CountUp to={counts.data[1].total} /> : '–'}</span>
              <span className="stat-text">Properties for rent</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">
                <CountUp to={5} />
              </span>
              <span className="stat-text">Property types</span>
            </div>
            <div className="stat-item">
              <span className="stat-num stat-word">Same day</span>
              <span className="stat-text">Reply to every enquiry</span>
            </div>
          </Reveal>
        </div>
      </section>

      <Section id="types" title="Browse by type" subtitle="Whether you want a home, a shop or land, start here.">
        <div className="type-grid">
          {TYPES.map((t, i) => (
            <Reveal key={t.type} delay={i * 80}>
              <Link to={`/properties?type=${t.type}`} className="type-tile">
                <span className="type-art">
                  <PropertyArt type={t.type} />
                </span>
                <span className="type-name">{t.name}</span>
                <span className="type-sub">{t.text}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      {featuredItems.length > 0 && (
        <Section id="featured" title="Featured properties" subtitle="Hand-picked homes and shops we recommend.">
          <CardGrid items={featuredItems} />
        </Section>
      )}

      <Section id="latest" title="Available properties" subtitle="Every listing shows carpet area, floor and age. Tap a property for details.">
        {latest.loading && <CardSkeletons count={6} />}
        {latest.error && <ErrorBox error={latest.error} onRetry={latest.reload} title="We could not load properties" />}
        {!latest.loading && !latest.error && latestItems.length === 0 && featuredItems.length === 0 && (
          <p className="muted">No properties are listed right now. Message us on WhatsApp and we will help you find one.</p>
        )}
        {latestItems.length > 0 && <CardGrid items={latestItems} />}
        {!latest.error && (
          <p className="center-row">
            <Link to="/properties" className="btn btn-ghost">
              View all properties <ArrowIcon width={18} height={18} />
            </Link>
          </p>
        )}
      </Section>

      <Section id="why" title="Why people choose DevSphere" subtitle="Simple, direct and clear from the first message." className="section-alt">
        <div className="why-grid">
          {WHY.map(({ Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 90} className="why-card">
              <span className="why-icon">
                <Icon width={26} height={26} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {localities.length > 0 && (
        <section className="marquee-section" aria-labelledby="areas-title">
          <h2 id="areas-title" className="marquee-title">
            Properties in these areas
          </h2>
          <div className="marquee">
            {[0, 1].map((copy) => (
              <ul key={copy} className="marquee-track" aria-hidden={copy === 1 ? 'true' : undefined}>
                {[...localities, ...localities, ...localities].map((name, i) => (
                  <li key={`${name}-${i}`}>
                    <Link to={`/properties?q=${encodeURIComponent(name)}`} tabIndex={copy === 1 ? -1 : undefined}>
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>
      )}

      <section id="how-we-work" tabIndex={-1} className="section how" aria-labelledby="how-title">
        <div className="container">
          <Reveal className="section-head">
            <h2 id="how-title">How we work</h2>
            <p className="section-sub">Three simple steps, no middlemen.</p>
          </Reveal>
          <ol className="steps steps-line">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 140}>
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="cta-band" aria-labelledby="cta-title">
        <span className="cta-blob cta-blob-1" aria-hidden="true" />
        <span className="cta-blob cta-blob-2" aria-hidden="true" />
        <div className="container cta-inner">
          <Reveal>
            <h2 id="cta-title">Ready to see a property?</h2>
            <p>Message us or call. We will confirm a visit time the same day.</p>
          </Reveal>
          <Reveal className="cta-actions" delay={120}>
            <WhatsAppButton message={generalMessage} className="btn-lg cta-pulse">
              WhatsApp us
            </WhatsAppButton>
            <a className="btn btn-light btn-lg" href={phoneTel}>
              <PhoneIcon /> Call {site.name}
            </a>
          </Reveal>
        </div>
      </section>
    </>
  )
}
