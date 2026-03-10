import { Link } from 'react-router-dom'
import { useInView } from '../hooks/useInView'
import './HowItWorks.css'

const STEPS = [
  { step: '1', title: 'Enable location', text: 'Allow GPS so we can show your position and send alerts on your route.' },
  { step: '2', title: 'Get predictive alerts', text: 'We use historical data, weather, and community reports to warn you before hazard zones.' },
  { step: '3', title: 'Report & help others', text: 'Submit incidents (potholes, accidents, reckless driving) to build a safer network.' },
  { step: '4', title: 'Use SOS when needed', text: 'One tap shares your location with emergency contacts and services.' },
]

export default function HowItWorks() {
  const [ref, inView] = useInView()
  return (
    <section id="how" ref={ref} className={`how ${inView ? 'in-view' : ''}`}>
      <div className="how__inner">
        <p className="how__eyebrow">Simple flow</p>
        <h2 className="how__title">How RoadGuard works</h2>
        <p className="how__subtitle">
          No complexity. Turn on the app, drive, and stay informed — everywhere you go.
        </p>
        <div className="how__steps">
          {STEPS.map((s, i) => (
            <div key={s.step} className="how-step" style={{ transitionDelay: inView ? `${i * 0.08}s` : '0s' }}>
              <span className="how-step__num">{s.step}</span>
              <div>
                <h3 className="how-step__title">{s.title}</h3>
                <p className="how-step__text">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
        <Link to="/app" className="how__cta">Get Started</Link>
      </div>
    </section>
  )
}
