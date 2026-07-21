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
      <Navbar onOpenLeadModal={() => setIsLeadModalOpen(true)} />
      <main>
        <Hero />
        <AIFeatureSection />
        <About />
        <Services />
        <Stats />
        <CaseStudies />
        <Testimonials />
        <Contact />
      </main>
      <Footer />

      {/* Floating Lead Capture Modal */}
      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
      />
    </div>
  )
}
