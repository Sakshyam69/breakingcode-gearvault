import {
  CalendarCheck,
  LayoutDashboard,
  ReceiptText,
  Search,
  Settings,
  UserPlus,
} from 'lucide-react'

export const staffSidebarMenu = [
  { label: 'Dashboard', to: '/staff', icon: LayoutDashboard },
  { label: 'Customers', to: '/staff/customers', icon: Search },
  { label: 'Register Customer', to: '/staff/register-customer', icon: UserPlus },
  { label: 'Sales Invoices', to: '/staff/sales-invoices', icon: ReceiptText },
  { label: 'Bookings', to: '/staff/bookings', icon: CalendarCheck },
  { label: 'Settings', to: '/staff/settings', icon: Settings },
]
