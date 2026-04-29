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

  if (normalizedRole === 'customer') {
    return '/customer'
  }

  return '/login'
}

export function isAccountSetupPending(user) {
  return user?.accountSetupStatus === 'PendingSetup'
}

export function getPostAuthPath(user) {
  return getDashboardPath(user?.role)
}

export async function loginUser(credentials) {
  return sendAuthRequest('/api/auth/login', credentials)
}

export async function registerCustomer(customer) {
  return sendAuthRequest('/api/auth/register/customer', customer)
}

export async function createStaffAccount(staff) {
  return sendAuthenticatedRequest('/api/auth/staff', {
    method: 'POST',
    body: JSON.stringify(staff),
  })
}

export async function getUsers() {
  return sendAuthenticatedRequest('/api/auth/users')
}

export async function getVendors() {
  return sendAuthenticatedRequest('/api/vendors')
}

export async function createVendor(vendor) {
  return sendAuthenticatedRequest('/api/vendors', {
    method: 'POST',
    body: JSON.stringify(vendor),
  })
}

export async function updateVendor(vendorId, vendor) {
  return sendAuthenticatedRequest(`/api/vendors/${vendorId}`, {
    method: 'PUT',
    body: JSON.stringify(vendor),
  })
}

export async function deleteVendor(vendorId) {
  return sendAuthenticatedRequest(`/api/vendors/${vendorId}`, {
    method: 'DELETE',
  })
}

export async function getParts() {
  return sendAuthenticatedRequest('/api/parts')
}

export async function createPart(part) {
  return sendAuthenticatedRequest('/api/parts', {
    method: 'POST',
    body: JSON.stringify(part),
  })
}

export async function updatePart(partId, part) {
  return sendAuthenticatedRequest(`/api/parts/${partId}`, {
    method: 'PUT',
    body: JSON.stringify(part),
  })
}

export async function deletePart(partId) {
  return sendAuthenticatedRequest(`/api/parts/${partId}`, {
    method: 'DELETE',
  })
}

export async function getCurrentUser() {
  const user = await sendAuthenticatedRequest('/api/auth/me')
  const currentAuth = getStoredAuth()

  if (currentAuth?.token) {
    saveAuth({
      ...currentAuth,
      user,
    })
  }

  return user
}

export async function getCurrentProfile() {
  return sendAuthenticatedRequest('/api/profile/me')
}

export async function updateProfile(profile) {
  const data = await sendAuthenticatedRequest('/api/profile/me', {
    method: 'PUT',
    body: JSON.stringify(profile),
  })

  if (data?.token && data?.user) {
    saveAuth(data)
  }

  return data
}

export async function completeAccountSetup(profile) {
  const data = await sendAuthenticatedRequest('/api/profile/complete-setup', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
  const currentAuth = getStoredAuth()

  if (data?.token && data?.user) {
    saveAuth(data)
    return data
  }

  const responseUser = data?.user ?? (data?.role ? data : null)
  const updatedAuth = {
    ...currentAuth,
    user: responseUser ? {
      ...currentAuth?.user,
      ...responseUser,
    } : {
      ...currentAuth?.user,
      accountSetupStatus: 'Complete',
    },
  }

  saveAuth(updatedAuth)
  return updatedAuth
}

export async function uploadProfileImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  return sendAuthenticatedRequest('/api/uploads/profile-image', {
    method: 'POST',
    body: formData,
  })
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

async function sendAuthenticatedRequest(path, options = {}) {
  const auth = getStoredAuth()
  const isFormData = options.body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${auth?.token ?? ''}`,
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message ?? data?.title ?? 'Something went wrong. Please try again.')
  }

  return data
}
