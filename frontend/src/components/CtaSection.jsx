import { Link } from 'react-router-dom'
import { useInView } from '../hooks/useInView'
import './CtaSection.css'

export default function CtaSection() {
  const [ref, inView] = useInView()
  return (
    <section id="download" ref={ref} className={`cta-section ${inView ? 'in-view' : ''}`}>
      <div className="cta-section__inner">
        <h2 className="cta-section__title">
          Ready to stay safer on the road?
        </h2>
        <p className="cta-section__subtitle">
          Join the community. Get predictive alerts, report incidents, and access emergency help — all in one place.
        </p>
        <div className="cta-section__actions">
          <Link to="/app" className="cta-section__btn cta-section__btn--primary">
            Get Started Free
          </Link>
          <a href="#how" className="cta-section__btn cta-section__btn--secondary">
            Watch Demo
          </a>
        </div>
      </div>
    </section>
  )
}
