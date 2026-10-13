import { lazy, Suspense } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import FloatingWhatsApp from './components/FloatingWhatsApp'
import Header from './components/Header'
import ScrollManager from './components/ScrollManager'
import { Loading } from './components/States'
import Contact from './pages/Contact'
import Home from './pages/Home'
import ListingDetail from './pages/ListingDetail'
import Listings from './pages/Listings'
import NotFound from './pages/NotFound'

// The admin panel is loaded only when someone opens /admin, so visitors never download it.
const AdminApp = lazy(() => import('./admin/AdminApp'))

function PublicLayout() {
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <Header />
      <main id="content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  )
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<Loading label="Loading admin…" />}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/properties" element={<Listings />} />
          <Route path="/properties/:refCode" element={<ListingDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
