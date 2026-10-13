import { Link } from 'react-router-dom'
import { phoneDisplay, phoneTel, site } from '../config/site'
import BrandLogo from './BrandLogo'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand brand-footer">
            <BrandLogo size={44} />
          </div>
          <p className="footer-text">{site.tagline}</p>
          <p className="footer-rera">{site.rera}</p>
        </div>

        <div>
          <h2 className="footer-title">Visit our office</h2>
          <address className="footer-text">
            {site.address.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </address>
          <p className="footer-text">
            Phone: <a href={phoneTel}>{phoneDisplay}</a>
          </p>
        </div>

        <div>
          <h2 className="footer-title">Explore</h2>
          <ul className="footer-links">
            <li>
              <Link to="/properties?kind=sale">Properties for sale</Link>
            </li>
            <li>
              <Link to="/properties?kind=rent">Properties for rent</Link>
            </li>
            <li>
              <Link to="/contact">Contact us</Link>
            </li>
            <li>
              <Link to="/admin">Admin login</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </div>
    </footer>
  )
}
