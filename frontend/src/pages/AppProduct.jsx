import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './AppProduct.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const INITIAL_MESSAGES = [
  { id: 1, role: 'assistant', text: '🤖 Hello! How can I assist you today?' },
]

const THINKING_PHRASES = [
  'Analyzing your query...',
  'Checking live safety data...',
  'Scanning incident records...',
  'Routing your request...',
  'Reviewing road conditions...',
  'Looking up emergency contacts...',
]

const DEFAULT_ALERTS = [
  'Accident reported near I-8',
  'Heavy rain detected',
]

const KNOWN_CITIES = [
  'Islamabad',
  'Rawalpindi',
  'Lahore',
  'Karachi',
  'Peshawar',
  'Quetta',
  'Multan',
  'Faisalabad',
  'Gujranwala',
  'Hyderabad',
  'Sialkot',
  'Sukkur',
]

const SEVERITY_COLOR_MAP = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

function inferCityFromText(value) {
  const locationText = String(value || '').toLowerCase()
  const matchedCity = KNOWN_CITIES.find((cityName) => locationText.includes(cityName.toLowerCase()))
  return matchedCity || 'Islamabad'
}

function toIncidentKey(value) {
  return String(value || 'accident')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'accident'
}

async function requestBackend(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`)
  }

  return response.json()
}

function getAssistantReply(message) {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('accident') || normalizedMessage.includes('crash')) {
    return 'I can help. Please share your location and whether anyone is injured. I can guide you to emergency contacts immediately.'
  }

  if (normalizedMessage.includes('pothole') || normalizedMessage.includes('road')) {
    return 'Noted. You can report the hazard with landmark details so nearby drivers can be alerted in real time.'
  }

  if (normalizedMessage.includes('rain') || normalizedMessage.includes('weather')) {
    return 'Weather risk is elevated. Drive slower, increase following distance, and avoid sudden braking on wet roads.'
  }

  if (normalizedMessage.includes('sos') || normalizedMessage.includes('emergency')) {
    return 'If this is urgent, tap SOS immediately. I can also provide police, ambulance, and roadside helpline options.'
  }

  return 'I can help with safety alerts, incidents, weather risks, and emergency actions. Tell me what is happening around you.'
}

export default function AppProduct() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [reportForm, setReportForm] = useState({
    incidentType: 'Accident',
    location: '',
    details: '',
  })
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState(INITIAL_MESSAGES)
  const [chatTyping, setChatTyping] = useState(false)
  const [thinkingPhrase, setThinkingPhrase] = useState(THINKING_PHRASES[0])
  const [chatSuggestions, setChatSuggestions] = useState([
    'Show alerts near me',
    'Recent incidents in my city',
    'Need SOS emergency contact',
  ])
  const [currentAddress, setCurrentAddress] = useState('Detecting your current location...')
  const [currentLocationUpdatedAt, setCurrentLocationUpdatedAt] = useState('Updated just now')
  const [currentCoordinates, setCurrentCoordinates] = useState(null)
  const [currentCity, setCurrentCity] = useState('Islamabad')
  const [safetyAlerts, setSafetyAlerts] = useState(DEFAULT_ALERTS)
  const [incidents, setIncidents] = useState([])
  const [sosContact, setSosContact] = useState(null)
  const chatMessagesRef = useRef(null)
  const chatBottomRef = useRef(null)
  const mainMapContainerRef = useRef(null)
  const miniMapContainerRef = useRef(null)
  const mainMapInstanceRef = useRef(null)
  const miniMapInstanceRef = useRef(null)
  const mainMarkerRef = useRef(null)
  const miniMarkerRef = useRef(null)
  const mainIncidentsLayerRef = useRef(null)
  const miniIncidentsLayerRef = useRef(null)
  const geoWatchIdRef = useRef(null)
  const lastGeocodeKeyRef = useRef('')
  const emergencyContactsListRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    if (!mainMapContainerRef.current || !miniMapContainerRef.current) {
      return
    }

    const defaultCenter = [33.6844, 73.0479]

    const sharedMapOptions = {
      zoomControl: false,
      attributionControl: true,
    }

    mainMapInstanceRef.current = L.map(mainMapContainerRef.current, sharedMapOptions).setView(defaultCenter, 13)
    miniMapInstanceRef.current = L.map(miniMapContainerRef.current, sharedMapOptions).setView(defaultCenter, 12)

    const tileLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    const tileAttribution = '&copy; OpenStreetMap contributors'

    L.tileLayer(tileLayerUrl, { attribution: tileAttribution, maxZoom: 19 }).addTo(mainMapInstanceRef.current)
    L.tileLayer(tileLayerUrl, { attribution: tileAttribution, maxZoom: 19 }).addTo(miniMapInstanceRef.current)

    const markerStyle = {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#22c55e',
      fillOpacity: 1,
    }

    mainMarkerRef.current = L.circleMarker(defaultCenter, markerStyle).addTo(mainMapInstanceRef.current)
    miniMarkerRef.current = L.circleMarker(defaultCenter, markerStyle).addTo(miniMapInstanceRef.current)
    mainIncidentsLayerRef.current = L.layerGroup().addTo(mainMapInstanceRef.current)
    miniIncidentsLayerRef.current = L.layerGroup().addTo(miniMapInstanceRef.current)

    let isMounted = true

    const fetchAddress = async (latitude, longitude) => {
      const geocodeKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`

      if (lastGeocodeKeyRef.current === geocodeKey) {
        return
      }

      lastGeocodeKeyRef.current = geocodeKey

      try {
        const reverseResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          {
            headers: {
              Accept: 'application/json',
            },
          },
        )

        if (!reverseResponse.ok) {
          throw new Error('Unable to resolve address')
        }

        const reverseData = await reverseResponse.json()

        if (isMounted) {
          const resolvedAddress = reverseData?.display_name || `Lat ${latitude.toFixed(5)}, Lon ${longitude.toFixed(5)}`
          setCurrentAddress(resolvedAddress)
          setCurrentLocationUpdatedAt('Updated just now')
          setCurrentCity(inferCityFromText(resolvedAddress))

          const areaLabel = resolvedAddress.split(',').slice(0, 3).join(',').trim()
          setSafetyAlerts([
            `Location-aware alert: monitor traffic near ${areaLabel}`,
            `Reduced road grip risk around your area due to current weather`,
            'Drive with caution and maintain safe following distance',
          ])
        }
      } catch {
        if (isMounted) {
          const fallbackLocation = `Lat ${latitude.toFixed(5)}, Lon ${longitude.toFixed(5)}`
          setCurrentAddress(fallbackLocation)
          setCurrentLocationUpdatedAt('Updated just now')
          setCurrentCity('Islamabad')
          setSafetyAlerts([
            `Live location update: ${fallbackLocation}`,
            'Nearby hazard data may be limited; proceed carefully',
            'Keep headlights on and report incidents in real time',
          ])
        }
      }
    }

    const updateTrackedLocation = (latitude, longitude) => {
      const newCenter = [latitude, longitude]
      setCurrentCoordinates({ latitude, longitude })
      mainMarkerRef.current?.setLatLng(newCenter)
      miniMarkerRef.current?.setLatLng(newCenter)
      mainMapInstanceRef.current?.setView(newCenter, 15)
      miniMapInstanceRef.current?.setView(newCenter, 14)
      fetchAddress(latitude, longitude)
    }

    if (navigator.geolocation) {
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        ({ coords }) => {
          updateTrackedLocation(coords.latitude, coords.longitude)
        },
        () => {
          updateTrackedLocation(defaultCenter[0], defaultCenter[1])
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000,
        },
      )
    }

    return () => {
      isMounted = false

      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current)
      }

      mainMapInstanceRef.current?.remove()
      miniMapInstanceRef.current?.remove()
      mainMapInstanceRef.current = null
      miniMapInstanceRef.current = null
      mainIncidentsLayerRef.current = null
      miniIncidentsLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const loadAlertsAndIncidents = async () => {
      try {
        const [alertsResponse, incidentsResponse] = await Promise.all([
          requestBackend(`/api/alerts?city=${encodeURIComponent(currentCity)}&limit=8`),
          requestBackend(`/api/incidents?city=${encodeURIComponent(currentCity)}&days=730&limit=140`),
        ])

        if (!isActive) {
          return
        }

        const alertItems = Array.isArray(alertsResponse?.items) ? alertsResponse.items : []
        const incidentItems = Array.isArray(incidentsResponse?.items) ? incidentsResponse.items : []

        const formattedAlerts = alertItems.slice(0, 8).map((item) => {
          const title = item?.title || item?.type || 'Safety Alert'
          const place = item?.location ? ` (${item.location})` : ''
          return `${title}${place}`
        })

        setSafetyAlerts(formattedAlerts.length ? formattedAlerts : DEFAULT_ALERTS)
        setIncidents(incidentItems)
      } catch {
        if (!isActive) {
          return
        }

        setSafetyAlerts((existingAlerts) => (
          existingAlerts.length ? existingAlerts : DEFAULT_ALERTS
        ))
        setIncidents([])
      }
    }

    loadAlertsAndIncidents()

    return () => {
      isActive = false
    }
  }, [currentCity])

  useEffect(() => {
    if (!mainIncidentsLayerRef.current || !miniIncidentsLayerRef.current) {
      return
    }

    mainIncidentsLayerRef.current.clearLayers()
    miniIncidentsLayerRef.current.clearLayers()

    incidents.forEach((incident) => {
      const lat = Number(incident?.lat)
      const lng = Number(incident?.lng)

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return
      }

      const severity = String(incident?.severity || '').toLowerCase()
      const markerColor = SEVERITY_COLOR_MAP[severity] || '#f97316'
      const markerOptions = {
        radius: 7,
        color: '#ffffff',
        weight: 1.5,
        fillColor: markerColor,
        fillOpacity: 0.95,
      }
      const tooltipText = `${incident?.title || incident?.type || 'Incident'}${incident?.location ? ` — ${incident.location}` : ''}`
      const tooltipOptions = { permanent: false, direction: 'top', opacity: 0.92 }

      L.circleMarker([lat, lng], markerOptions).bindTooltip(tooltipText, tooltipOptions).addTo(mainIncidentsLayerRef.current)
      L.circleMarker([lat, lng], markerOptions).bindTooltip(tooltipText, tooltipOptions).addTo(miniIncidentsLayerRef.current)
    })
  }, [incidents])

  useEffect(() => {
    if (!chatOpen || !chatBottomRef.current) return
    const id = setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 50)
    return () => clearTimeout(id)
  }, [chatMessages, chatTyping, chatOpen])

  useEffect(() => {
    const emergencyList = emergencyContactsListRef.current

    if (!emergencyList) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (emergencyList.scrollHeight <= emergencyList.clientHeight) {
        return
      }

      const reachedBottom = emergencyList.scrollTop + emergencyList.clientHeight >= emergencyList.scrollHeight - 1

      if (reachedBottom) {
        emergencyList.scrollTop = 0
        return
      }

      emergencyList.scrollTop += 1
    }, 95)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const sendChatMessage = async (messageText) => {
    const trimmedInput = String(messageText || '').trim()

    if (!trimmedInput) {
      return
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: trimmedInput,
    }

    setChatMessages((prevMessages) => [...prevMessages, userMessage])
    setChatInput('')
    setChatSuggestions([])
    setThinkingPhrase(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)])
    setChatTyping(true)

    const thinkingStart = Date.now()
    const MIN_THINKING_MS = 900

    try {
      const chatResponse = await requestBackend('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          text: trimmedInput,
          city: currentCity,
        }),
      })

      const backendMessage = chatResponse?.message || getAssistantReply(trimmedInput)
      const responseData = chatResponse?.data || {}
      const extraHints = []

      if (Array.isArray(responseData.alerts) && responseData.alerts.length) {
        extraHints.push(`${responseData.alerts.length} live alert(s) found.`)
      }
      if (Array.isArray(responseData.incidents) && responseData.incidents.length) {
        extraHints.push(`${responseData.incidents.length} related incident(s) found.`)
      }
      if (responseData.contact?.phone_number) {
        extraHints.push(`Emergency: ${responseData.contact.service} (${responseData.contact.phone_number})`)
      }

      if (Array.isArray(responseData.suggestions) && responseData.suggestions.length) {
        setChatSuggestions(responseData.suggestions.slice(0, 4))
      }

      const elapsed = Date.now() - thinkingStart
      const remaining = MIN_THINKING_MS - elapsed
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining))
      }

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        text: [backendMessage, ...extraHints].join('\n'),
      }

      setChatMessages((prevMessages) => [...prevMessages, assistantMessage])
    } catch {
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        text: getAssistantReply(trimmedInput),
      }

      setChatMessages((prevMessages) => [...prevMessages, assistantMessage])
      setChatSuggestions([
        'Show alerts near me',
        'Show recent accidents',
        'Need SOS help',
      ])
    } finally {
      setChatTyping(false)
    }
  }

  const handleSendMessage = () => {
    sendChatMessage(chatInput)
  }

  const handleSuggestionClick = (suggestion) => {
    if (chatTyping) {
      return
    }
    sendChatMessage(suggestion)
  }

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const handleReportFieldChange = (event) => {
    const { name, value } = event.target
    setReportForm((previousData) => ({ ...previousData, [name]: value }))
  }

  const handleReportSubmit = (event) => {
    event.preventDefault()
    setReportSubmitted(true)
  }

  const handleCloseReport = () => {
    setReportOpen(false)
    setReportSubmitted(false)
    setReportForm({
      incidentType: 'Accident',
      location: '',
      details: '',
    })
  }

  const handleAuthAction = () => {
    setIsLoggedIn((previous) => !previous)
    setProfileOpen(false)
  }

  const handleSosShare = async () => {
    const emergencyMessage = "Hi It's emergency I need help"
    const primaryIncidentType = incidents[0]?.type || reportForm.incidentType || 'accident'
    const incidentKey = toIncidentKey(primaryIncidentType)

    let contactFromApi = null

    try {
      contactFromApi = await requestBackend('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          incident_key: incidentKey,
          city: currentCity,
        }),
      })
      setSosContact(contactFromApi)
    } catch {
      contactFromApi = null
    }

    const locationLine = currentAddress ? `Current location: ${currentAddress}` : 'Current location is being detected.'
    const mapsLink = currentCoordinates
      ? `https://www.google.com/maps?q=${currentCoordinates.latitude},${currentCoordinates.longitude}`
      : ''
    const contactLine = contactFromApi?.phone_number
      ? `Emergency contact: ${contactFromApi.service || 'Support'} - ${contactFromApi.phone_number}`
      : ''

    const shareText = [emergencyMessage, locationLine, contactLine, mapsLink].filter(Boolean).join('\n')

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'RoadGuard SOS',
          text: shareText,
        })
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText)
      }

      window.alert('SOS message with your current location is ready to share.')
    } catch {
      window.alert('Unable to share SOS message right now. Please try again.')
    }
  }

  return (
    <div className="app-product" aria-label="Traffic Safety & Alert app screen">
      <div className="app-product__phone">
        <header className="app-product__header-shell">
          <div className="app-product__topbar">
            <div className="app-product__topbar-inner">
              <button
                type="button"
                className="app-product__icon-btn app-product__icon-btn--menu"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                ☰
              </button>
              <h1 className="app-product__title">
                <img src="/RoadGuardLogo.png" alt="RoadGuard" className="app-product__logo-img" />
              </h1>
              <div className="app-product__top-actions">
                <button type="button" className="app-product__icon-btn app-product__icon-btn--filled" aria-label="Notifications">
                  <svg className="app-product__icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 3a4.5 4.5 0 0 0-4.5 4.5v2.15c0 .8-.24 1.58-.68 2.24L5.5 14v1.25h13V14l-1.32-2.11a4.2 4.2 0 0 1-.68-2.24V7.5A4.5 4.5 0 0 0 12 3Z" />
                    <path d="M9.3 16.7a2.7 2.7 0 0 0 5.4 0H9.3Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="app-product__icon-btn app-product__icon-btn--filled"
                  aria-label="Profile"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((previous) => !previous)}
                >
                  <svg className="app-product__icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 3.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
                    <path d="M4.5 20a7.5 7.5 0 0 1 15 0v.5h-15V20Z" />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="app-product__profile-menu">
                    <button type="button" className="app-product__profile-item" onClick={() => setProfileOpen(false)}>Profile</button>
                    <button type="button" className="app-product__profile-item" onClick={handleAuthAction}>
                      {isLoggedIn ? 'Logout' : 'Login'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="app-product__search-wrap">
            <div className="app-product__search-inner">
              <label htmlFor="location-search" className="sr-only">Search location</label>
              <input id="location-search" type="text" placeholder="Search location..." className="app-product__search" />
            </div>
          </div>
        </header>

        <aside className={`app-product__menu ${menuOpen ? 'app-product__menu--open' : ''}`}>
          <button type="button" className="app-product__menu-item">Dashboard</button>
          <button type="button" className="app-product__menu-item">Live Alerts</button>
          <button type="button" className="app-product__menu-item">Emergency Contacts</button>
          <button type="button" className="app-product__menu-item">Safety Reports</button>
        </aside>
        {menuOpen && <button type="button" className="app-product__backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

        <main className="app-product__content">
          <section className="app-product__map app-product__map--large" aria-label="Main map preview">
            <div ref={mainMapContainerRef} className="app-product__leaflet-map" />
            <div className="tag tag--safe" style={{ top: '8%', left: '2%' }}>
              {`Live incidents: ${incidents.length}`}
            </div>
          </section>

          <section className="app-product__lower-grid">
            <div className="app-product__left-half">
              <div className="app-product__actions">
                <button type="button" className="action-btn action-btn--report" onClick={() => setReportOpen(true)}>❗ Report Incident</button>
                <button type="button" className="action-btn action-btn--sos" onClick={handleSosShare}>📞 SOS</button>
              </div>
              <div className="app-product__left-panel">
              <article className="card card--alerts">
                <h2 className="card__title card__title--warning">⚠ Safety Alerts:</h2>
                <ul className="card__bullets">
                  {safetyAlerts.map((alertItem) => (
                    <li key={alertItem} className="card__alert-item">
                      <span className="card__alert-sign" aria-hidden="true">!</span>
                      <span>{alertItem}</span>
                    </li>
                  ))}
                </ul>
              </article>
              </div>
            </div>

            <div className="app-product__right-half">
              <div className="app-product__right-panel">
              <section className="app-product__map app-product__map--small" aria-label="Secondary map preview">
                <div ref={miniMapContainerRef} className="app-product__leaflet-map" />
                <div className="tag tag--safe" style={{ top: '8%', left: '4%' }}>
                  {currentCity}
                </div>
              </section>
              <article className="card card--location">
                <div className="card__title-row">
                  <h2 className="card__title">Current Location</h2>
                  <p className="card__location-meta">{currentLocationUpdatedAt}</p>
                </div>
                <p className="card__location-text">{currentAddress}</p>
              </article>
              <article className="card card--contacts card--contacts-inline">
                <h2 className="card__title">Emergency Contacts</h2>
                <ul ref={emergencyContactsListRef} className="card__list">
                  {sosContact?.phone_number && (
                    <li>
                      <span className="card__contact-main"><span>{sosContact.service || 'SOS Contact'}</span><strong>{sosContact.phone_number}</strong></span>
                      <a href={`tel:${sosContact.phone_number}`} className="card__call-btn" aria-label={`Call ${sosContact.service || 'SOS Contact'}`}>📞</a>
                    </li>
                  )}
                  <li>
                    <span className="card__contact-main"><span> Police</span><strong>15</strong></span>
                    <a href="tel:15" className="card__call-btn" aria-label="Call Police">📞</a>
                  </li>
                  <li>
                    <span className="card__contact-main"><span>Ambulance</span><strong>1122</strong></span>
                    <a href="tel:1122" className="card__call-btn" aria-label="Call Ambulance">📞</a>
                  </li>
                  <li>
                    <span className="card__contact-main"><span>Roadside Help</span><strong>130</strong></span>
                    <a href="tel:130" className="card__call-btn" aria-label="Call Roadside Help">📞</a>
                  </li>
                  <li>
                    <span className="card__contact-main"><span>Traffic Police</span><strong>1915</strong></span>
                    <a href="tel:1915" className="card__call-btn" aria-label="Call Traffic Police">📞</a>
                  </li>
                  <li>
                    <span className="card__contact-main"><span>Fire Brigade</span><strong>16</strong></span>
                    <a href="tel:16" className="card__call-btn" aria-label="Call Fire Brigade">📞</a>
                  </li>
                  <li>
                    <span className="card__contact-main"><span>Rescue Helpline</span><strong>1122</strong></span>
                    <a href="tel:1122" className="card__call-btn" aria-label="Call Rescue Helpline">📞</a>
                  </li>
                  <li>
                    <span className="card__contact-main"><span>Highway Patrol</span><strong>130</strong></span>
                    <a href="tel:130" className="card__call-btn" aria-label="Call Highway Patrol">📞</a>
                  </li>
                </ul>
              </article>
              </div>
            </div>
          </section>
        </main>

        {reportOpen && (
          <div className="app-product__report-overlay" role="dialog" aria-label="Report Incident form">
            <div className="app-product__report-backdrop" onClick={handleCloseReport} />
            <div className="app-product__report-modal">
              <div className="app-product__report-header">
                <h3>Report Incident</h3>
                <button type="button" className="app-product__report-close" aria-label="Close report form" onClick={handleCloseReport}>×</button>
              </div>

              {reportSubmitted ? (
                <div className="app-product__report-success">
                  <p>Your incident report has been submitted successfully.</p>
                  <button type="button" className="app-product__report-submit" onClick={handleCloseReport}>Done</button>
                </div>
              ) : (
                <form className="app-product__report-form" onSubmit={handleReportSubmit}>
                  <label className="app-product__report-label" htmlFor="incidentType">Incident Type</label>
                  <select
                    id="incidentType"
                    name="incidentType"
                    className="app-product__report-input"
                    value={reportForm.incidentType}
                    onChange={handleReportFieldChange}
                  >
                    <option>Accident</option>
                    <option>Pothole</option>
                    <option>Reckless Driver</option>
                    <option>Road Block</option>
                    <option>Other</option>
                  </select>

                  <label className="app-product__report-label" htmlFor="incidentLocation">Location</label>
                  <input
                    id="incidentLocation"
                    name="location"
                    className="app-product__report-input"
                    placeholder="Enter location"
                    value={reportForm.location}
                    onChange={handleReportFieldChange}
                    required
                  />

                  <label className="app-product__report-label" htmlFor="incidentDetails">Details</label>
                  <textarea
                    id="incidentDetails"
                    name="details"
                    rows={4}
                    className="app-product__report-input app-product__report-textarea"
                    placeholder="Describe what happened"
                    value={reportForm.details}
                    onChange={handleReportFieldChange}
                    required
                  />

                  <button type="submit" className="app-product__report-submit">Submit</button>
                </form>
              )}
            </div>
          </div>
        )}

        <div className="app-product__chat">
          {chatOpen && (
            <div className="app-product__chat-panel" role="dialog" aria-label="Chat assistant">
              <div className="app-product__chat-header">
                <strong>RoadGuard Assistant</strong>
              </div>

              <div className="app-product__chat-messages" ref={chatMessagesRef}>
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`app-product__chat-message app-product__chat-message--${message.role}`}
                  >
                    {message.text}
                  </div>
                ))}
                {chatTyping && (
                  <div className="app-product__chat-message app-product__chat-message--assistant app-product__chat-thinking">
                    <span className="app-product__thinking-dots" aria-hidden="true">
                      <span /><span /><span />
                    </span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {chatSuggestions.length > 0 && (
                <div className="app-product__chat-suggestions" aria-label="Suggested chat prompts">
                  {chatSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="app-product__suggestion-chip"
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={chatTyping}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <div className="app-product__chat-composer">
                <textarea
                  rows={1}
                  className="app-product__chat-input"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                />
                <button type="button" className="app-product__chat-send" onClick={handleSendMessage} disabled={chatTyping}>
                  Send
                </button>
              </div>

              <button
                type="button"
                className="app-product__chat-close"
                aria-label="Close chatbot"
                onClick={() => setChatOpen(false)}
              >
                ×
              </button>
            </div>
          )}

          <div className="app-product__chat-trigger">
            <span className="app-product__chat-caption">How can I help you in your journey !</span>
            <button
              type="button"
              className="app-product__chat-fab"
              aria-label="Open chatbot"
              aria-expanded={chatOpen}
              onClick={() => setChatOpen((prev) => !prev)}
            >
              🤖
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
