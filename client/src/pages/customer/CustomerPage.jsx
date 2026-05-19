import { useLocation } from 'react-router-dom'
import { CustomerVehicleManagement } from '../../components/common/CustomerVehicleWorkspace'
import { VehicleAiServicesWorkspace } from '../../components/common/VehicleAiServicesWorkspace'
import { CustomerInvoiceHistory } from '../../components/customer/CustomerInvoiceHistory'
import { CustomerPartRequests } from '../../components/customer/CustomerPartRequests'
import { CustomerReportRequests } from '../../components/customer/CustomerReportRequests'
import { CustomerReviews } from '../../components/customer/CustomerReviews'
import { CustomerServiceBookings } from '../../components/customer/CustomerServiceBookings'
import { DashboardLayout } from '../../components/dashboard/DashboardLayout'
import { customerSidebarMenu } from '../../components/dashboard/menus/customerSidebarMenu'
import { SettingsWorkspace } from '../../components/dashboard/SettingsWorkspace'
import { DashboardCustomer } from '../dashboard/DashboardCustomer'

const customerPages = {
  '/customer': {
    title: 'Customer Dashboard',
    subtitle: 'Customer tools for profile, vehicles, bookings, part requests, and history.',
    content: <DashboardCustomer />,
  },
  '/customer/ai-services': {
    title: 'AI Services',
    subtitle: 'Analyze your vehicle health, view predicted issues, recommended parts, and your AI history.',
    content: <VehicleAiServicesWorkspace scope="customer" />,
  },
  '/customer/vehicles': {
    title: 'Vehicles',
    subtitle: 'Manage saved vehicles and service details.',
    content: <CustomerVehicleManagement />,
  },
  '/customer/bookings': {
    title: 'Bookings',
    subtitle: 'Request, review, and manage service bookings.',
    content: <CustomerServiceBookings />,
  },
  '/customer/part-requests': {
    title: 'Part Requests',
    subtitle: 'Track requested parts and availability updates.',
    content: <CustomerPartRequests />,
  },
  '/customer/reviews': {
    title: 'Reviews',
    subtitle: 'Write and manage your service reviews.',
    content: <CustomerReviews />,
  },
  '/customer/history': {
    title: 'History',
    subtitle: 'Review service history, invoices, and past activity.',
    content: <CustomerInvoiceHistory />,
  },
  '/customer/settings': {
    title: 'Settings',
    subtitle: 'Update your profile, change your password, and request customer reports.',
    content: <SettingsWorkspace role="Customer" reportRequests={<CustomerReportRequests />} />,
  },
}

export function CustomerPage() {
  const location = useLocation()
  const currentPage = customerPages[location.pathname] ?? customerPages['/customer']

  return (
    <DashboardLayout
      navItems={customerSidebarMenu}
      role="Customer"
      subtitle={currentPage.subtitle}
      title={currentPage.title}
    >
      {currentPage.content}
    </DashboardLayout>
  )
}
