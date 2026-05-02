import { useLocation } from 'react-router-dom'
import { VendorManagement } from '../../components/admin/VendorManagement'
import { StaffCustomerVehicleManagement } from '../../components/common/CustomerVehicleWorkspace'
import { DashboardLayout } from '../../components/dashboard/DashboardLayout'
import { staffSidebarMenu } from '../../components/dashboard/menus/staffSidebarMenu'
import { UnderDevelopment } from '../../components/dashboard/UnderDevelopment'
import { CustomerRegistration } from '../../components/staff/CustomerRegistration'
import { SalesInvoiceManagement } from '../../components/staff/SalesInvoiceManagement'
import { StaffCustomerReportGenerator } from '../../components/staff/StaffCustomerReportGenerator'
import { StaffPartRequestManagement } from '../../components/staff/StaffPartRequestManagement'
import { StaffServiceBookingManagement } from '../../components/staff/StaffServiceBookingManagement'
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
    content: <StaffCustomerVehicleManagement />,
  },
  '/staff/register-customer': {
    title: 'Register Customer',
    subtitle: 'Create new customer profiles for service and sales workflows.',
    content: <CustomerRegistration />,
  },
  '/staff/vendors': {
    title: 'Vendors',
    subtitle: '',
    content: <VendorManagement />,
  },
  '/staff/sales-invoices': {
    title: 'Sales Invoices',
    subtitle: 'Create and manage customer sales invoices.',
    content: <SalesInvoiceManagement />,
  },
  '/staff/part-requests': {
    title: 'Part Requests',
    subtitle: 'Review customer part requests and update availability.',
    content: <StaffPartRequestManagement />,
  },
  '/staff/bookings': {
    title: 'Bookings',
    subtitle: 'Review and manage customer service bookings.',
    content: <StaffServiceBookingManagement />,
  },
  '/staff/reports': {
    title: 'Customer Reports',
    subtitle: '',
    content: <StaffCustomerReportGenerator />,
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
