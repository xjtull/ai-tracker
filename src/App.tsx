import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SiteDetailPage from './pages/SiteDetailPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/site/:id" element={<SiteDetailPage />} />
      </Routes>
    </Router>
  )
}

export default App
