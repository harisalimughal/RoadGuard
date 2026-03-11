import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { IconClipboard, IconAlertTriangle, IconRoute, IconPhone, IconBot, IconSos } from './Icons'
import { useInView } from '../hooks/useInView'
import './FeaturesShowcase.css'

const CYCLE_DURATION = 42
const BAR_DURATION = 7

const ANIMATION_URL = 'https://lottie.host/84fe271e-7daf-4b1f-9827-585cd603678b/ED2MEJQcWV.lottie'

const SHOWCASE_FEATURES = [
  { Icon: IconClipboard, title: 'Incident Reporting', description: 'Report with verification scores for reliable data.' },
  { Icon: IconAlertTriangle, title: 'Accident Prevention Alerts', description: 'Advance warnings before hazard zones.' },
  { Icon: IconRoute, title: 'Safe Route Selection', description: 'AI suggests the safest routes for you.' },
  { Icon: IconPhone, title: 'Emergency & Quick Fix', description: 'One-tap access to help and guides.' },
  { Icon: IconBot, title: 'AI Chatbot (EN & Urdu)', description: 'Real-time guidance in your language.' },
  { Icon: IconSos, title: 'SOS & Emergency Alert', description: 'Share your location with one tap.' },
]

export default function FeaturesShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [ref, inView] = useInView()

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() / 1000) % CYCLE_DURATION
      setActiveIndex(Math.min(Math.floor(elapsed / BAR_DURATION), SHOWCASE_FEATURES.length - 1))
    }, 200)
    return () => clearInterval(interval)
  }, [])

  return (
    <section ref={ref} className={'features-showcase ' + (inView ? 'in-view' : '')} aria-labelledby="showcase-heading">
      <div className="features-showcase__bg" aria-hidden="true" />
      <div className="features-showcase__inner">
        <p className="features-showcase__eyebrow">Features</p>
        <h2 id="showcase-heading" className="features-showcase__title">
          Built for safer roads
        </h2>
        <p className="features-showcase__subtitle">
          If your drive involves busy routes, weather, and real-time hazards — RoadGuard is your advantage.
        </p>

        <div className="features-showcase__card">
          <div className="features-showcase__left">
            {SHOWCASE_FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={'features-showcase__item' + (i === activeIndex ? ' features-showcase__item--active' : '')}
              >
                <div className="features-showcase__item-content">
                  <span className="features-showcase__item-icon"><f.Icon /></span>
                  <div>
                    <h3 className="features-showcase__item-title">{f.title}</h3>
                    <p className="features-showcase__item-desc">{f.description}</p>
                  </div>
                </div>
                <div className="features-showcase__progress-wrap">
                  <div
                    className={'features-showcase__progress-bar' + (i === activeIndex ? ' features-showcase__progress-bar--active' : '')}
                    key={i === activeIndex ? activeIndex : `inactive-${i}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="features-showcase__right">
            <div className="features-showcase__animation-wrap">
              <DotLottieReact
                src={ANIMATION_URL}
                loop
                autoplay
                className="features-showcase__lottie"
                style={{ height: '100%', width: '100%' }}
              />
            </div>
          </div>
        </div>

        <Link to="/app" className="features-showcase__cta">
          Get Started
        </Link>
      </div>
    </section>
  )
}
