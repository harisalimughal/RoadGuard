import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import AppProduct from './pages/AppProduct'
import AppLoader from './pages/AppLoader'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppLoader />} />
      <Route path="/app/product" element={<AppProduct />} />
    </Routes>
  )
}

export default App
