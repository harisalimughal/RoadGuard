import { IconClipboard, IconAlertTriangle, IconRoute, IconCar, IconPhone, IconBot, IconMap, IconSos } from './Icons'
import { useInView } from '../hooks/useInView'
import './Features.css'

const FEATURES = [
  { Icon: IconClipboard, title: 'Incident Reporting', description: 'Report potholes, broken lights, or accidents with verification scores so the community gets reliable data.' },
  { Icon: IconAlertTriangle, title: 'Accident Prevention Alerts', description: 'Advance warnings about hazardous zones using real-time location, weather, and historical data.' },
  { Icon: IconRoute, title: 'Safe Route Selection', description: 'AI suggests routes that prioritize safety — road condition, lighting, and past incidents.' },
  { Icon: IconCar, title: 'Dangerous Driver Alerts', description: 'Warnings where reckless driving has been reported so you can drive with extra caution.' },
  { Icon: IconPhone, title: 'Emergency & Quick Fix', description: 'One-tap access to ambulance, police, and mechanics; plus step-by-step guides for flat tires, dead battery, and more.' },
  { Icon: IconBot, title: 'AI Chatbot (EN & Urdu)', description: 'Ask questions, get real-time guidance, and use the app in English or Urdu for better accessibility.' },
  { Icon: IconMap, title: 'Maps & Live Location', description: 'Dynamic map overlay with incidents, routes, alerts, and your position via GPS.' },
  { Icon: IconSos, title: 'SOS & Emergency Alert', description: 'Emergency SOS button that automatically shares your location with selected contacts.' },
]

export default function Features() {
  const [ref, inView] = useInView()
  return (
    <section id="features" ref={ref} className={`features ${inView ? 'in-view' : ''}`}>
      <div className="features__inner">
        <p className="features__eyebrow">Built for safer roads</p>
        <h2 className="features__title">Everything you need to stay safe on the road</h2>
        <p className="features__subtitle">From predictive alerts to community reports and emergency help — RoadGuard puts safety first.</p>
        <div className="features__grid">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="feature-card" style={{ transitionDelay: inView ? `${i * 0.05}s` : '0s' }}>
              <span className="feature-card__icon" aria-hidden="true"><f.Icon /></span>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
