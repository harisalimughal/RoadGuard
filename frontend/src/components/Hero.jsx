import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero__bg" aria-hidden="true" />
      <div className="hero__inner">
        <p className="hero__badge">AI-Powered Traffic Safety</p>
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
          <a href="#download" className="hero__btn hero__btn--primary">
            Get Started Free
          </a>
          <a href="#how" className="hero__btn hero__btn--secondary">
            See How It Works
          </a>
        </div>
      </div>
    </section>
  )
}
