import Header from './components/Header'
import Hero from './components/Hero'
import FeaturesShowcase from './components/FeaturesShowcase'
import HowItWorks from './components/HowItWorks'
import Stats from './components/Stats'
import About from './components/About'
import CtaSection from './components/CtaSection'
import ContactSection from './components/ContactSection'
import Footer from './components/Footer'

function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <FeaturesShowcase />
        <Stats />
        <About />
        {/* <CtaSection /> */}
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}

export default App
