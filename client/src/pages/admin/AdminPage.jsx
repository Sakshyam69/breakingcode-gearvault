import { useLocation } from 'react-router-dom'
import { StaffManagement } from '../../components/admin/StaffManagement'
import { VendorManagement } from '../../components/admin/VendorManagement'
import { DashboardLayout } from '../../components/dashboard/DashboardLayout'
import { adminSidebarMenu } from '../../components/dashboard/menus/adminSidebarMenu'
import { UnderDevelopment } from '../../components/dashboard/UnderDevelopment'
import { DashboardAdmin } from '../dashboard/DashboardAdmin'

const adminPages = {
  '/admin': {
    title: 'Admin Dashboard',
    subtitle: 'Admin tools for inventory, vendors, staff, invoices, reports, and settings.',
    content: <DashboardAdmin />,
  },
  '/admin/inventory': {
    title: 'Inventory',
    subtitle: 'Manage vehicle parts, stock quantities, pricing, and part details.',
    content: <UnderDevelopment role="Admin inventory" />,
  },
  '/admin/vendors': {
    title: 'Vendors',
    subtitle: '',
    content: <VendorManagement />,
  },
  '/admin/staff-management': {
    title: 'Staff Management',
    subtitle: 'Create staff login credentials and review created staff accounts.',
    content: <StaffManagement />,
  },
  '/admin/invoices': {
    title: 'Invoices',
    subtitle: 'Create and manage purchase invoices for stock updates.',
    content: <UnderDevelopment role="Admin invoices" />,
  },
  '/admin/reports': {
    title: 'Reports',
    subtitle: 'View financial, inventory, and operational reports.',
    content: <UnderDevelopment role="Admin reports" />,
  },
  '/admin/settings': {
    title: 'Settings',
    subtitle: 'Manage admin preferences and system settings.',
    content: <UnderDevelopment role="Admin settings" />,
  },
}

export function AdminPage() {
  const location = useLocation()
  const currentPage = adminPages[location.pathname] ?? adminPages['/admin']

  return (
    <DashboardLayout
      navItems={adminSidebarMenu}
      role="Admin"
      subtitle={currentPage.subtitle}
      title={currentPage.title}
    >
      {currentPage.content}
    </DashboardLayout>
  )
}
