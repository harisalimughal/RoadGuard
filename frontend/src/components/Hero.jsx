import { Link } from 'react-router-dom'
import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <video
        className="hero__bg"
        src="/motorway.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="hero__overlay" aria-hidden="true" />
      <div className="hero__inner">
        <h1 className="hero__title">
          Turn every journey
          <br />
          <span className="hero__title-accent">into a safer one</span>
        </h1>
        <p className="hero__subtitle">
          RoadGuard is the first system that predicts accident-prone zones, reports incidents in real time,
          and guides you on the safest routes — before danger happens.
        </p>
        <div className="hero__actions">
          <Link to="/app" className="hero__btn hero__btn--primary">
            Get Started Free
          </Link>
          <a href="#how" className="hero__btn hero__btn--secondary">
            See How It Works
          </a>
        </div>
      </div>
    </section>
  )
}
