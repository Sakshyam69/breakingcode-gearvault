import { DashboardLayout } from '../../components/dashboard/DashboardLayout'
import { customerSidebarMenu } from '../../components/dashboard/menus/customerSidebarMenu'
import { DashboardCustomer } from '../dashboard/DashboardCustomer'

export function CustomerPage() {
  return (
    <DashboardLayout
      navItems={customerSidebarMenu}
      role="Customer"
      subtitle="Customer tools for profile, vehicles, bookings, part requests, and history."
      title="Customer Dashboard"
    >
      <DashboardCustomer />
    </DashboardLayout>
  )
}
