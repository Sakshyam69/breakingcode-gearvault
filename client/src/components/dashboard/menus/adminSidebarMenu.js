import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Truck,
  Users,
} from 'lucide-react'

export const adminSidebarMenu = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Inventory', to: '/admin/inventory', icon: Boxes },
  { label: 'Vendors', to: '/admin/vendors', icon: Truck },
  { label: 'Staff Management', to: '/admin/staff-management', icon: Users },
  { label: 'Invoices', to: '/admin/invoices', icon: ReceiptText },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
]
