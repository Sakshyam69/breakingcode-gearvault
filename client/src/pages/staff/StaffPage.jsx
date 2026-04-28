import { useLocation } from 'react-router-dom'
import { DashboardLayout } from '../../components/dashboard/DashboardLayout'
import { staffSidebarMenu } from '../../components/dashboard/menus/staffSidebarMenu'
import { UnderDevelopment } from '../../components/dashboard/UnderDevelopment'
import { DashboardStaff } from '../dashboard/DashboardStaff'

const staffPages = {
  '/staff': {
    title: 'Staff Dashboard',
    subtitle: 'Staff tools for customers, invoices, bookings, and counter operations.',
    content: <DashboardStaff />,
  },
  '/staff/customers': {
    title: 'Customers',
    subtitle: 'Search, review, and manage customer records.',
    content: <UnderDevelopment role="Staff customers" />,
  },
  '/staff/register-customer': {
    title: 'Register Customer',
    subtitle: 'Create new customer profiles for service and sales workflows.',
    content: <UnderDevelopment role="Staff customer registration" />,
  },
  '/staff/sales-invoices': {
    title: 'Sales Invoices',
    subtitle: 'Create and manage customer sales invoices.',
    content: <UnderDevelopment role="Staff sales invoices" />,
  },
  '/staff/bookings': {
    title: 'Bookings',
    subtitle: 'Review and manage customer service bookings.',
    content: <UnderDevelopment role="Staff bookings" />,
  },
  '/staff/settings': {
    title: 'Settings',
    subtitle: 'Manage staff preferences and account settings.',
    content: <UnderDevelopment role="Staff settings" />,
  },
}

export function StaffPage() {
  const location = useLocation()
  const currentPage = staffPages[location.pathname] ?? staffPages['/staff']

  return (
    <DashboardLayout
      navItems={staffSidebarMenu}
      role="Staff"
      subtitle={currentPage.subtitle}
      title={currentPage.title}
    >
      {currentPage.content}
    </DashboardLayout>
  )
}
