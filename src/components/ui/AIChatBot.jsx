import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Sparkles, User, MessageCircle, Phone, ArrowRight } from 'lucide-react'

const KNOWLEDGE_BASE = [
  {
    keywords: ['service', 'services', 'what do you do', 'offer', 'help'],
    reply: "We offer 4 primary core pillars in the UAE:\n\n1. Web & Mobile App Engineering (3D Spatial WebGL, React, Next.js)\n2. Digital Growth & Performance Marketing (SEO, Meta & Google Ads)\n3. Certified UAE Corporate Tax & VAT Compliance (FTA Registered)\n4. Branding & 3D Visual Systems\n\nWhich area would you like an estimate for?",
    suggestions: ['Web App Estimate', 'UAE Corporate Tax Help', 'Talk to Specialist']
  },
  {
    keywords: ['web', 'website', 'app', 'development', '3d', 'design', 'cost', 'price', 'quote'],
    reply: "Our web development team engineers custom full-stack web applications, 3D interactive web experiences, and mobile apps tailored for UAE businesses. Projects typically range from high-converting landing experiences to enterprise web platforms.\n\nWould you like a direct quote via WhatsApp?",
    suggestions: ['WhatsApp Specialist', 'Corporate Tax Filing', 'Our Portfolio']
  },
  {
    keywords: ['tax', 'corporate tax', 'vat', 'fta', 'accounting', 'audit', 'compliance', 'freezone', 'mainland'],
    reply: "Our certified tax advisory manages official UAE Corporate Tax registration, annual 9% tax filing, VAT returns, and free zone optimization under FTA regulations to prevent penalties.\n\nWould you like to consult our senior tax advisor?",
    suggestions: ['Talk to Tax Advisor', 'Web App Quote', 'Main Office Contact']
  },
  {
    keywords: ['contact', 'phone', 'location', 'dubai', 'office', 'whatsapp', 'call', 'number'],
    reply: "You can reach our team directly in Dubai & Abu Dhabi:\n\n• WhatsApp / Phone: +971 56 855 5626\n• Sales Line: +971 54 387 8726\n• Email: info@ascore.ae\n\nWould you like to open a direct WhatsApp chat now?",
    suggestions: ['Open WhatsApp Chat', 'Web App Quote', 'Back to Services']
  }
]

const DEFAULT_REPLY = "I'm Ascore's AI Assistant! I can help you with Web Application Engineering, 3D Web Design, UAE Corporate Tax Filing, or connecting you directly with our specialists in Dubai."

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am Ascore AI. How can we elevate your digital presence or manage your UAE tax compliance today?',
      suggestions: ['Web App Quote', 'UAE Corporate Tax', 'WhatsApp Specialist']
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) scrollToBottom()
  }, [messages, isOpen, isTyping])

  const handleSend = (textToSend) => {
    const query = textToSend || input
    if (!query.trim()) return

    const userMessage = { sender: 'user', text: query }
    setMessages((prev) => [...prev, userMessage])
    if (!textToSend) setInput('')
    setIsTyping(true)

    // Simulate AI thought process
    setTimeout(() => {
      const lower = query.toLowerCase()

      if (lower.includes('whatsapp') || lower.includes('talk') || lower.includes('specialist') || lower.includes('advisor')) {
        window.open(`https://wa.me/971568555626?text=${encodeURIComponent(`Hello Ascore Team! I was chatting with Ascore AI regarding: "${query}". I would like to consult a specialist.`)}`, '_blank')
      }

      let matched = KNOWLEDGE_BASE.find((k) => k.keywords.some((kw) => lower.includes(kw)))

      const botReply = matched
        ? matched.reply
        : DEFAULT_REPLY

      const botSuggestions = matched ? matched.suggestions : ['Web App Quote', 'UAE Corporate Tax', 'WhatsApp Specialist']

      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: botReply, suggestions: botSuggestions }
      ])
      setIsTyping(false)
    }, 700)
  }

  const handleSuggestionClick = (sug) => {
    if (sug === 'WhatsApp Specialist' || sug === 'Open WhatsApp Chat' || sug === 'Talk to Tax Advisor') {
      window.open('https://wa.me/971568555626', '_blank')
      return
    }
    handleSend(sug)
  }

  return (
    <>
      {/* Floating Launcher Button (Bottom Right) */}
      <div
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 1500,
          fontFamily: 'Jost, sans-serif',
        }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 50%, #9D4EDD 100%)',
            border: 'none',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(0, 245, 212, 0.5), 0 0 20px rgba(157, 78, 221, 0.4)',
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
          }}
          aria-label="Toggle AI Assistant Chat"
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isOpen ? <X size={26} color="#000" /> : <Bot size={28} color="#000" />}

          {/* Pulse Indicator */}
          {!isOpen && (
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#00F5D4',
                border: '2.5px solid #04030a',
                boxShadow: '0 0 10px #00F5D4',
              }}
            />
          )}
        </button>
      </div>

      {/* Expandable Liquid Glass Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '6.25rem',
            right: '2rem',
            width: 'calc(100vw - 3rem)',
            maxWidth: '390px',
            height: '530px',
            maxHeight: 'calc(100vh - 8rem)',
            zIndex: 1500,
            background: 'linear-gradient(180deg, rgba(15, 12, 35, 0.95) 0%, rgba(6, 4, 18, 0.98) 100%)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1.5px solid rgba(0, 245, 212, 0.45)',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 245, 212, 0.25)',
            animation: 'chatPop 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: 'Jost, sans-serif',
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              padding: '1.2rem 1.25rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderBottom: '1px solid rgba(157, 78, 221, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontWeight: 700,
                }}
              >
                <Bot size={22} />
              </div>
              <div>
                <h4 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', fontWeight: 600, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Ascore AI <Sparkles size={14} style={{ color: '#00F5D4' }} />
                </h4>
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: '#00F5D4', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00F5D4' }} /> Online • Dubai, UAE
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Scroll Body */}
          <div
            style={{
              flex: 1,
              padding: '1.25rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '0.85rem 1.1rem',
                    borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.sender === 'user'
                      ? 'linear-gradient(135deg, #00F5D4 0%, #0077FF 100%)'
                      : 'rgba(255, 255, 255, 0.08)',
                    color: msg.sender === 'user' ? '#000' : '#fff',
                    fontWeight: msg.sender === 'user' ? 600 : 400,
                    fontSize: '0.9375rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    border: msg.sender === 'bot' ? '1px solid rgba(157, 78, 221, 0.3)' : 'none',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                  }}
                >
                  {msg.text}
                </div>

                {/* Suggestions Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.4rem',
                      marginTop: '0.65rem',
                    }}
                  >
                    {msg.suggestions.map((sug) => (
                      <button
                        key={sug}
                        onClick={() => handleSuggestionClick(sug)}
                        style={{
                          fontFamily: 'Jost, sans-serif',
                          background: 'rgba(0, 245, 212, 0.12)',
                          border: '1px solid rgba(0, 245, 212, 0.4)',
                          color: '#00F5D4',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.35rem 0.75rem',
                          borderRadius: '100px',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#00F5D4'
                          e.currentTarget.style.color = '#000'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 245, 212, 0.12)'
                          e.currentTarget.style.color = '#00F5D4'
                        }}
                      >
                        {sug} →
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00F5D4', fontSize: '0.8125rem' }}>
                <Bot size={16} /> Ascore AI is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick WhatsApp Specialist Bar */}
          <div
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(0, 245, 212, 0.08)',
              borderTop: '1px solid rgba(0, 245, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
              Need instant response?
            </span>
            <a
              href="https://wa.me/971568555626"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'Jost, sans-serif',
                color: '#00F5D4',
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              WhatsApp Specialist →
            </a>
          </div>

          {/* Form Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            style={{
              padding: '0.85rem 1rem',
              background: 'rgba(10, 8, 25, 0.95)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <input
              type="text"
              placeholder="Ask about web apps, tax, branding..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                fontFamily: 'Jost, sans-serif',
                flex: 1,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(157, 78, 221, 0.35)',
                borderRadius: '100px',
                padding: '0.65rem 1rem',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 100%)',
                border: 'none',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(0, 245, 212, 0.4)',
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes chatPop {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
