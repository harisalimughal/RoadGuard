import { useState } from 'react'
import { IconShield } from './Icons'
import './Header.css'

const NAV_LINKS = [
  { label: 'How it works', href: '#how' },
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#about' },
  { label: 'Contact Us', href: '#contact' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="header">
      <div className="header__inner">
        <a href="#" className="header__logo">
          <span className="header__logo-icon"><IconShield /></span>
          <span>RoadGuard</span>
        </a>
        <nav className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="header__link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="header__actions">
          <a href="#download" className="header__cta header__cta--primary">
            Get Started
          </a>
          <button
            type="button"
            className="header__menu-btn"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  )
}
