import { useState, useEffect } from 'react'
import Navbar from './components/ui/Navbar'
import Hero from './components/sections/Hero'
import AIFeatureSection from './components/sections/AIFeatureSection'
import About from './components/sections/About'
import Services from './components/sections/Services'
import Stats from './components/sections/Stats'
import CaseStudies from './components/sections/CaseStudies'
import Testimonials from './components/sections/Testimonials'
import Contact from './components/sections/Contact'
import Footer from './components/sections/Footer'
import LeadModal from './components/ui/LeadModal'
import AIChatBot from './components/ui/AIChatBot'
import ErrorBoundary from './components/ui/ErrorBoundary'

export default function App() {
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)

  // Auto show lead modal after 8 seconds of browsing
  useEffect(() => {
    const timer = setTimeout(() => {
      const modalSeen = sessionStorage.getItem('ascore_lead_modal_seen')
      if (!modalSeen) {
        setIsLeadModalOpen(true)
      }
    }, 8000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="bg-void text-light font-sans relative overflow-x-hidden min-h-screen">
      <ErrorBoundary>
        <Navbar onOpenLeadModal={() => setIsLeadModalOpen(true)} />
      </ErrorBoundary>

      <main>
        <ErrorBoundary>
          <Hero />
        </ErrorBoundary>
        <ErrorBoundary>
          <AIFeatureSection />
        </ErrorBoundary>
        <ErrorBoundary>
          <About />
        </ErrorBoundary>
        <ErrorBoundary>
          <Services />
        </ErrorBoundary>
        <ErrorBoundary>
          <Stats />
        </ErrorBoundary>
        <ErrorBoundary>
          <CaseStudies />
        </ErrorBoundary>
        <ErrorBoundary>
          <Testimonials />
        </ErrorBoundary>
        <ErrorBoundary>
          <Contact />
        </ErrorBoundary>
      </main>

      <ErrorBoundary>
        <Footer />
      </ErrorBoundary>

      {/* Floating Lead Capture Modal */}
      <ErrorBoundary>
        <LeadModal
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
        />
      </ErrorBoundary>

      {/* Real-time Interactive AI Assistant Chatbot */}
      <ErrorBoundary>
        <AIChatBot />
      </ErrorBoundary>
    </div>
  )
}
