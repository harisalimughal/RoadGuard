import { IconShield } from './Icons'
import { useInView } from '../hooks/useInView'
import './About.css'

export default function About() {
  const [ref, inView] = useInView()
  return (
    <section id="about" ref={ref} className={`about ${inView ? 'in-view' : ''}`}>
      <div className="footer__top">
          <a href="#" className="footer__logo">
            <span className="footer__logo-icon"><IconShield /></span>
            RoadGuard
          </a>
          <p className="footer__tagline">
            Smarter roads, safer journeys. AI-powered traffic safety for everyone.
          </p>
          {/* <a href="#download" className="footer__cta">
            Get Started
          </a> */}
        </div>
      <div className="about__inner">
        {/* <p className="about__eyebrow">About RoadGuard</p> */}
        {/* <h2 className="about__title">
          Smarter roads, safer journeys — for everyone
        </h2> */}
        <p className="about__text">
          RoadGuard is an AI-powered traffic safety platform that helps drivers avoid danger before it happens.
          We combine real-time location data, weather, historical incident reports, and community input to
          predict risks and suggest the safest routes. Our mission is to reduce accidents and build a
          trusted safety network that scales from cities to entire regions.
        </p>
        <p className="about__text">
          We give drivers the information they need: predictive alerts, incident reporting, emergency SOS,
          and quick access to help. RoadGuard is built for real-world use — clear, fast, and focused on
          keeping you and others safe on the road.
        </p>
        <a href="#download" className="footer__cta">
            Get Started
          </a>
      </div>
    </section>
  )
}
