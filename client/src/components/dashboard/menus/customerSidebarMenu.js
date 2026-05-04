import {
  CalendarCheck,
  Car,
  History,
  LayoutDashboard,
  MessageSquare,
  PackageSearch,
  Settings,
} from 'lucide-react'

export const customerSidebarMenu = [
  { label: 'Dashboard', to: '/customer', icon: LayoutDashboard },
  { label: 'Vehicles', to: '/customer/vehicles', icon: Car },
  { label: 'Bookings', to: '/customer/bookings', icon: CalendarCheck },
  { label: 'Part Requests', to: '/customer/part-requests', icon: PackageSearch },
  { label: 'Reviews', to: '/customer/reviews', icon: MessageSquare },
  { label: 'History', to: '/customer/history', icon: History },
  { label: 'Settings', to: '/customer/settings', icon: Settings },
]
