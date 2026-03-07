import { useInView } from '../hooks/useInView'
import './Stats.css'

const STATS = [
  { value: '1.3M+', label: 'Road deaths annually (WHO)' },
  { value: '30K+', label: 'Traffic deaths in Pakistan yearly' },
  { value: 'Real-time', label: 'Predictive alerts before danger' },
]

export default function Stats() {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className={`stats ${inView ? 'in-view' : ''}`}>
      <div className="stats__inner">
        <p className="stats__eyebrow">You're not reckless — you're uninformed</p>
        <h2 className="stats__title">
          The numbers don't lie. RoadGuard changes them.
        </h2>
        <p className="stats__subtitle">
          Timely alerts, road condition updates, and preventive warnings can save lives. We're here to make that happen.
        </p>
        <div className="stats__grid">
          {STATS.map((s, i) => (
            <div key={s.label} className="stat-card" style={{ transitionDelay: inView ? `${i * 0.1}s` : '0s' }}>
              <span className="stat-card__value">{s.value}</span>
              <span className="stat-card__label">{s.label}</span>
            </div>
          ))}
        </div>
        <a href="#download" className="stats__cta">
          Start staying safer
        </a>
      </div>
    </section>
  )
}
