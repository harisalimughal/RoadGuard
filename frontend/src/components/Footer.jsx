import { IconShield } from './Icons'
import './Footer.css'

const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how' },
    { label: 'Download', href: '#download' },
  ],
  Company: [
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms & Conditions', href: '#' },
  ],
}

export default function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="footer__inner">
        <div className="footer__top">
          <a href="#" className="footer__logo">
            <span className="footer__logo-icon"><IconShield /></span>
            RoadGuard
          </a>
          <p className="footer__tagline">
            Smarter roads, safer journeys. AI-powered traffic safety for everyone.
          </p>
          <a href="#download" className="footer__cta">
            Get Started
          </a>
        </div>
        <div className="footer__grid">
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title} className="footer__col">
              <h4 className="footer__col-title">{title}</h4>
              <ul>
                {links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="footer__link">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer__bottom">
          <p className="footer__copy">
            © {new Date().getFullYear()} RoadGuard. All rights reserved.
          </p>
          <p className="footer__contact">
            Contact: <a href="mailto:support@roadguard.app">support@roadguard.app</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
