import Header from './components/Header'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Features from './components/Features'
import Stats from './components/Stats'
import About from './components/About'
import CtaSection from './components/CtaSection'
import Footer from './components/Footer'

function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Stats />
        <About />
        <CtaSection />
      </main>
      <Footer />
    </>
  )
}

export default App
