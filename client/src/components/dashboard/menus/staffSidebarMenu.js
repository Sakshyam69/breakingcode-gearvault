import {
  CalendarCheck,
  LayoutDashboard,
  ReceiptText,
  Search,
  Settings,
  UserPlus,
} from 'lucide-react'

export const staffSidebarMenu = [
  { label: 'Dashboard', to: '/staff', icon: LayoutDashboard, active: true },
  { label: 'Customers', to: '/staff', icon: Search },
  { label: 'Register Customer', to: '/staff', icon: UserPlus },
  { label: 'Sales Invoices', to: '/staff', icon: ReceiptText },
  { label: 'Bookings', to: '/staff', icon: CalendarCheck },
  { label: 'Settings', to: '/staff', icon: Settings },
]
