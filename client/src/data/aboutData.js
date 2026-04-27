import {
  BarChart3,
  Code2,
  Palette,
  Target,
} from 'lucide-react'
import personImage from '../assets/person.jpg'
import prajwalImage from '../assets/prawjal.jpg'
import sakshyamImage from '../assets/Sha.jpeg'

export const aboutCards = [
  {
    icon: Target,
    title: 'Project scope',
    desc: 'Admin, staff, and customer surfaces for vehicle parts retail and service center operations.',
  },
  {
    icon: BarChart3,
    title: 'Operations fit',
    desc: 'Workspaces cover reports, inventory, invoices, appointments, history, and registration flows.',
  },
  {
    icon: Palette,
    title: 'Design language',
    desc: 'A dark, modern, and red-accented interface designed for real operational use.',
  },
  {
    icon: Code2,
    title: 'Backend ready',
    desc: 'Forms and page boundaries are prepared for ASP.NET Core API integration later.',
  },
]

export const members = [
  {
    name: 'Sakshyam Timsina',
    role: 'Leader',
    image: sakshyamImage,
    desc: 'Overall project coordination, staff management, parts management, financial reports, and system planning.',
  },
  {
    name: 'David Basnet',
    role: 'Member',
    image: personImage,
    desc: 'Vendor management, customer registration by staff, purchase invoice handling, and stock update flow.',
  },
  {
    name: 'Bidur Siwakoti',
    role: 'Member',
    image: personImage,
    desc: 'Parts sales, sales invoices, customer information view, and customer reports development.',
  },
  {
    name: 'Tumyanghang Lawoti',
    role: 'Member',
    image: personImage,
    desc: 'Customer search, email invoice feature, and customer self-registration module.',
  },
  {
    name: 'Prajwal Limbu Nembang',
    role: 'Member',
    image: prajwalImage,
    desc: 'Service appointments, unavailable part requests, customer history, stock alerts, and credit reminders.',
  },
]
