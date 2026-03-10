import Header from '../components/Header'
import Hero from '../components/Hero'
import FeaturesShowcase from '../components/FeaturesShowcase'
import HowItWorks from '../components/HowItWorks'
import Stats from '../components/Stats'
import About from '../components/About'
import ContactSection from '../components/ContactSection'
import Footer from '../components/Footer'

export default function Landing() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <FeaturesShowcase />
        <Stats />
        <About />
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}
