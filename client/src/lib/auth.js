const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5223'
const AUTH_STORAGE_KEY = 'autocare_auth'

export function getStoredAuth() {
  const rawValue = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue)
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function saveAuth(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getDashboardPath(role) {
  const normalizedRole = role?.toLowerCase()

  if (normalizedRole === 'admin') {
    return '/admin'
  }

  if (normalizedRole === 'staff') {
    return '/staff'
  }

  return '/customer'
}

export async function loginUser(credentials) {
  return sendAuthRequest('/api/auth/login', credentials)
}

export async function registerCustomer(customer) {
  return sendAuthRequest('/api/auth/register/customer', customer)
}

async function sendAuthRequest(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message ?? data?.title ?? 'Something went wrong. Please try again.')
  }

  saveAuth(data)
  return data
}
