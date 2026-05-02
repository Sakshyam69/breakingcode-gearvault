import {
  CalendarCheck,
  LayoutDashboard,
  BarChart3,
  PackageSearch,
  ReceiptText,
  Search,
  Settings,
  Truck,
  UserPlus,
} from 'lucide-react'

export const staffSidebarMenu = [
  { label: 'Dashboard', to: '/staff', icon: LayoutDashboard },
  { label: 'Customers', to: '/staff/customers', icon: Search },
  { label: 'Register Customer', to: '/staff/register-customer', icon: UserPlus },
  { label: 'Vendors', to: '/staff/vendors', icon: Truck },
  { label: 'Part Requests', to: '/staff/part-requests', icon: PackageSearch },
  { label: 'Sales Invoices', to: '/staff/sales-invoices', icon: ReceiptText },
  { label: 'Bookings', to: '/staff/bookings', icon: CalendarCheck },
  { label: 'Reports', to: '/staff/reports', icon: BarChart3 },
  { label: 'Settings', to: '/staff/settings', icon: Settings },
]
