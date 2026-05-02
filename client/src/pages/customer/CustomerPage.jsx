import { useLocation } from 'react-router-dom'
import { CustomerVehicleManagement } from '../../components/common/CustomerVehicleWorkspace'
import { CustomerInvoiceHistory } from '../../components/customer/CustomerInvoiceHistory'
import { CustomerPartRequests } from '../../components/customer/CustomerPartRequests'
import { DashboardLayout } from '../../components/dashboard/DashboardLayout'
import { customerSidebarMenu } from '../../components/dashboard/menus/customerSidebarMenu'
import { UnderDevelopment } from '../../components/dashboard/UnderDevelopment'
import { DashboardCustomer } from '../dashboard/DashboardCustomer'

const customerPages = {
  '/customer': {
    title: 'Customer Dashboard',
    subtitle: 'Customer tools for profile, vehicles, bookings, part requests, and history.',
    content: <DashboardCustomer />,
  },
  '/customer/vehicles': {
    title: 'Vehicles',
    subtitle: 'Manage saved vehicles and service details.',
    content: <CustomerVehicleManagement />,
  },
  '/customer/bookings': {
    title: 'Bookings',
    subtitle: 'Request, review, and manage service bookings.',
    content: <UnderDevelopment role="Customer bookings" />,
  },
  '/customer/part-requests': {
    title: 'Part Requests',
    subtitle: 'Track requested parts and availability updates.',
    content: <CustomerPartRequests />,
  },
  '/customer/history': {
    title: 'History',
    subtitle: 'Review service history, invoices, and past activity.',
    content: <CustomerInvoiceHistory />,
  },
  '/customer/settings': {
    title: 'Settings',
    subtitle: 'Manage customer preferences and account settings.',
    content: <UnderDevelopment role="Customer settings" />,
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
