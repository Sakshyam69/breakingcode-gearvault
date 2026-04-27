import { Navigate, Route, Routes } from 'react-router-dom'
import { PageShell } from './components/common/PageShell'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ServicesPage } from './pages/ServicesPage'
import { SignupPage } from './pages/SignupPage'
import { TermsPage } from './pages/TermsPage'
import { AdminPage } from './pages/admin/AdminPage'
import { CustomerPage } from './pages/customer/CustomerPage'
import { StaffPage } from './pages/staff/StaffPage'

function App() {
  return (
    <PageShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </PageShell>
  )
}

export default App
