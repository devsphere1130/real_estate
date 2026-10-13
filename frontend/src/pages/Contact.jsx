import CopyButton from '../components/CopyButton'
import { ClockIcon, PhoneIcon, PinIcon } from '../components/Icons'
import LeadForm from '../components/LeadForm'
import WhatsAppButton from '../components/WhatsAppButton'
import { phoneDisplay, phoneTel, site } from '../config/site'
import { useSeo } from '../utils/seo'
import { generalMessage } from '../utils/whatsapp'

export default function Contact() {
  useSeo({
    title: 'Contact DevSphere',
    description: `Call, WhatsApp or visit DevSphere Real Estate. Open ${site.hours[0].days}, ${site.hours[0].time}.`,
  })

  return (
    <div className="container page">
      <h1 className="page-title">Contact us</h1>
      <p className="lead-text">Call, message or visit. We reply to every enquiry, usually the same day.</p>

      <div className="contact-grid">
        <div className="contact-info">
          <section className="info-card" aria-labelledby="c-phone">
            <h2 id="c-phone">
              <PhoneIcon /> Phone
            </h2>
            <p className="phone-number">{phoneDisplay}</p>
            <div className="btn-row">
              <CopyButton text={phoneDisplay.replace(/\s/g, '')} />
              <a className="btn btn-ghost" href={phoneTel}>
                Call now
              </a>
            </div>
          </section>

          <section className="info-card" aria-labelledby="c-wa">
            <h2 id="c-wa">WhatsApp</h2>
            <p>Fastest way to reach us. Send a property reference or a photo of what you need.</p>
            <div className="btn-row">
              <WhatsAppButton message={generalMessage}>Chat on WhatsApp</WhatsAppButton>
            </div>
          </section>

          <section className="info-card" aria-labelledby="c-hours">
            <h2 id="c-hours">
              <ClockIcon /> Working hours
            </h2>
            <dl className="hours">
              {site.hours.map((h) => (
                <div key={h.days}>
                  <dt>{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="info-card" aria-labelledby="c-office">
            <h2 id="c-office">
              <PinIcon /> Office
            </h2>
            <address>
              {site.address.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </address>
            {site.mapUrl && (
              <p>
                <a href={site.mapUrl} target="_blank" rel="noopener noreferrer">
                  Get directions<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            )}
            <p className="muted">{site.rera}</p>
          </section>
        </div>

        <div className="side-card">
          <LeadForm title="Send us an enquiry" />
        </div>
      </div>
    </div>
  )
}
