import {
  CalendarCheck,
  Car,
  History,
  LayoutDashboard,
  PackageSearch,
  Settings,
} from 'lucide-react'

export const customerSidebarMenu = [
  { label: 'Dashboard', to: '/customer', icon: LayoutDashboard, active: true },
  { label: 'Vehicles', to: '/customer', icon: Car },
  { label: 'Bookings', to: '/customer', icon: CalendarCheck },
  { label: 'Part Requests', to: '/customer', icon: PackageSearch },
  { label: 'History', to: '/customer', icon: History },
  { label: 'Settings', to: '/customer', icon: Settings },
]
