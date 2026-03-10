import { useEffect, useRef, useState } from 'react'
import './AppProduct.css'

const INITIAL_MESSAGES = [
  { id: 1, role: 'assistant', text: '🤖 Hello! How can I assist you today?' },
]

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
  const chatMessagesRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    if (chatOpen && chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages, chatTyping, chatOpen])

  const handleSendMessage = () => {
    const trimmedInput = chatInput.trim()

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
    setChatTyping(true)

    setTimeout(() => {
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        text: getAssistantReply(trimmedInput),
      }

      setChatMessages((prevMessages) => [...prevMessages, assistantMessage])
      setChatTyping(false)
    }, 650)
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
              <h1 className="app-product__title">Welcome to RoadGuard</h1>
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
            <div className="tag tag--danger" style={{ top: '32%', left: '34%' }}>⚠ Accident</div>
            <div className="tag tag--warn" style={{ top: '18%', left: '52%' }}>⚠</div>
            <div className="tag tag--warn" style={{ top: '54%', left: '55%' }}>🚗 Pothole</div>
            <div className="tag tag--warn" style={{ top: '75%', left: '36%' }}>🚗 Reckless Driver</div>
            <div className="tag tag--safe" style={{ top: '66%', left: '16%' }}>✓</div>
          </section>

          <section className="app-product__lower-grid">
            <div className="app-product__left-half">
              <div className="app-product__actions">
                <button type="button" className="action-btn action-btn--report" onClick={() => setReportOpen(true)}>❗ Report Incident</button>
                <button type="button" className="action-btn action-btn--sos">📞 SOS</button>
              </div>
              <div className="app-product__left-panel">
              <article className="card card--alerts">
                <h2 className="card__title card__title--warning">⚠ Safety Alerts:</h2>
                <ul className="card__bullets">
                  <li>Accident reported near I-8</li>
                  <li>Heavy rain detected</li>
                </ul>
              </article>
              </div>
            </div>

            <div className="app-product__right-half">
              <div className="app-product__right-panel">
              <section className="app-product__map app-product__map--small" aria-label="Secondary map preview">
                <div className="tag tag--danger" style={{ top: '25%', left: '44%' }}>⚠ Accident</div>
                <div className="tag tag--warn" style={{ top: '58%', left: '68%' }}>🚗 Pothole</div>
                <div className="tag tag--safe" style={{ top: '66%', left: '40%' }}>✓</div>
              </section>
              <article className="card card--contacts card--contacts-inline">
                <h2 className="card__title">Emergency Contacts</h2>
                <ul className="card__list">
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
                {chatTyping && <div className="app-product__chat-message app-product__chat-message--assistant">Typing...</div>}
              </div>

              <div className="app-product__chat-composer">
                <textarea
                  rows={1}
                  className="app-product__chat-input"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                />
                <button type="button" className="app-product__chat-send" onClick={handleSendMessage}>
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
