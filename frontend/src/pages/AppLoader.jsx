import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconShield } from '../components/Icons'
import './AppLoader.css'

export default function AppLoader() {
  const navigate = useNavigate()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      navigate('/app/product', { replace: true })
    }, 1800)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [navigate])

  return (
    <section className="app-loader" aria-label="RoadGuard loading screen" role="status">
      <div className="app-loader__orb" aria-hidden="true">
        <div className="app-loader__ring" />
        <div className="app-loader__brand">
          <IconShield />
        </div>
      </div>
      <p className="app-loader__text">RoadGuard loading ...</p>
    </section>
  )
}
