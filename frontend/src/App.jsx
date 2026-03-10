import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import AppProduct from './pages/AppProduct'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppProduct />} />
    </Routes>
  )
}

export default App
