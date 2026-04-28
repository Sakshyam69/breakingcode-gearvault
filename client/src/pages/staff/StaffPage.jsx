import { DashboardLayout } from '../../components/dashboard/DashboardLayout'
import { staffSidebarMenu } from '../../components/dashboard/menus/staffSidebarMenu'
import { DashboardStaff } from '../dashboard/DashboardStaff'

export function StaffPage() {
  return (
    <DashboardLayout
      navItems={staffSidebarMenu}
      role="Staff"
      subtitle="Staff tools for customers, invoices, bookings, and counter operations."
      title="Staff Dashboard"
    >
      <DashboardStaff />
    </DashboardLayout>
  )
}
