import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { site } from '../config/site'
import { generalMessage } from '../utils/whatsapp'
import BrandLogo from './BrandLogo'
import { CloseIcon, MenuIcon } from './Icons'
import ThemeToggle from './ThemeToggle'
import WhatsAppButton from './WhatsAppButton'

export default function Header() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname, location.hash])

  return (
    <header className="site-header">
      <div className="container header-row">
        <Link to="/" className="brand" aria-label={`${site.name} home`}>
          <BrandLogo />
        </Link>

        <nav id="main-nav" className={`main-nav ${open ? 'is-open' : ''}`} aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/properties">Properties</NavLink>
          <Link to="/#how-we-work">How we work</Link>
          <NavLink to="/contact">Contact</NavLink>
          <Link to="/admin" className="nav-admin">
            Admin login
          </Link>
        </nav>

        <div className="header-actions">
          <WhatsAppButton message={generalMessage} className="btn-sm header-wa">
            WhatsApp<span className="hide-xs"> us</span>
          </WhatsAppButton>
          <ThemeToggle />
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-expanded={open}
            aria-controls="main-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
    </header>
  )
}
