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

export async function createCustomerAccount(customer) {
  return sendAuthenticatedRequest('/api/auth/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  })
}

export async function getUsers() {
  return sendAuthenticatedRequest('/api/auth/users')
}

export async function updateUserRole(userId, role) {
  return sendAuthenticatedRequest(`/api/auth/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  })
}

export async function setUserActive(userId, isActive) {
  return sendAuthenticatedRequest(`/api/auth/users/${userId}/active`, {
    method: 'PUT',
    body: JSON.stringify({ isActive }),
  })
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

export async function getPurchaseInvoices() {
  return sendAuthenticatedRequest('/api/purchase-invoices')
}

export async function createPurchaseInvoice(invoice) {
  return sendAuthenticatedRequest('/api/purchase-invoices', {
    method: 'POST',
    body: JSON.stringify(invoice),
  })
}

export async function updatePurchaseInvoice(purchaseInvoiceId, invoice) {
  return sendAuthenticatedRequest(`/api/purchase-invoices/${purchaseInvoiceId}`, {
    method: 'PUT',
    body: JSON.stringify(invoice),
  })
}

export async function cancelPurchaseInvoice(purchaseInvoiceId) {
  return sendAuthenticatedRequest(`/api/purchase-invoices/${purchaseInvoiceId}`, {
    method: 'DELETE',
  })
}

export async function getMyVehicles() {
  return sendAuthenticatedRequest('/api/customer-vehicles/me')
}

export async function createMyVehicle(vehicle) {
  return sendAuthenticatedRequest('/api/customer-vehicles/me', {
    method: 'POST',
    body: JSON.stringify(vehicle),
  })
}

export async function updateMyVehicle(vehicleId, vehicle) {
  return sendAuthenticatedRequest(`/api/customer-vehicles/me/${vehicleId}`, {
    method: 'PUT',
    body: JSON.stringify(vehicle),
  })
}

export async function deleteMyVehicle(vehicleId) {
  return sendAuthenticatedRequest(`/api/customer-vehicles/me/${vehicleId}`, {
    method: 'DELETE',
  })
}

export async function searchVehicleCustomers(query = '') {
  return sendAuthenticatedRequest(`/api/customer-vehicles/customers?query=${encodeURIComponent(query)}`)
}

export async function searchCustomerVehicles(query = '') {
  return sendAuthenticatedRequest(`/api/customer-vehicles/search?query=${encodeURIComponent(query)}`)
}

export async function getCustomerVehicles(customerId) {
  return sendAuthenticatedRequest(`/api/customer-vehicles/customer/${customerId}`)
}

export async function createCustomerVehicle(customerId, vehicle) {
  return sendAuthenticatedRequest(`/api/customer-vehicles/customer/${customerId}`, {
    method: 'POST',
    body: JSON.stringify(vehicle),
  })
}

export async function updateCustomerVehicle(vehicleId, vehicle) {
  return sendAuthenticatedRequest(`/api/customer-vehicles/${vehicleId}`, {
    method: 'PUT',
    body: JSON.stringify(vehicle),
  })
}

export async function deleteCustomerVehicle(vehicleId) {
  return sendAuthenticatedRequest(`/api/customer-vehicles/${vehicleId}`, {
    method: 'DELETE',
  })
}

export async function analyzeVehicleHealth(vehicleId, { forceRefresh = false } = {}) {
  return sendAuthenticatedRequest(`/api/vehicle-health/vehicles/${vehicleId}/analyze`, {
    method: 'POST',
    body: JSON.stringify({ forceRefresh }),
  })
}

export async function getLatestVehicleHealthPrediction(vehicleId) {
  return sendAuthenticatedRequest(`/api/vehicle-health/vehicles/${vehicleId}/latest`)
}

export async function getVehicleHealthPredictionHistory(vehicleId, take = 10) {
  const normalizedTake = Number.isFinite(Number(take)) ? Math.max(1, Math.min(50, Number(take))) : 10
  return sendAuthenticatedRequest(`/api/vehicle-health/vehicles/${vehicleId}/history?take=${encodeURIComponent(normalizedTake)}`)
}

export async function getMyPartRequests() {
  return sendAuthenticatedRequest('/api/part-requests/me')
}

export async function createMyPartRequest(partRequest) {
  return sendAuthenticatedRequest('/api/part-requests/me', {
    method: 'POST',
    body: JSON.stringify(partRequest),
  })
}

export async function cancelMyPartRequest(partRequestId) {
  return sendAuthenticatedRequest(`/api/part-requests/me/${partRequestId}/cancel`, {
    method: 'PUT',
  })
}

export async function getPartRequests({ query = '', status = '' } = {}) {
  const params = new URLSearchParams()
  if (query) {
    params.set('query', query)
  }
  if (status) {
    params.set('status', status)
  }

  const queryString = params.toString()
  return sendAuthenticatedRequest(`/api/part-requests${queryString ? `?${queryString}` : ''}`)
}

export async function updatePartRequestStatus(partRequestId, update) {
  return sendAuthenticatedRequest(`/api/part-requests/${partRequestId}/status`, {
    method: 'PUT',
    body: JSON.stringify(update),
  })
}

export async function getSalesInvoices(query = '') {
  const queryString = query ? `?query=${encodeURIComponent(query)}` : ''
  return sendAuthenticatedRequest(`/api/sales-invoices${queryString}`)
}

export async function getMySalesInvoices() {
  return sendAuthenticatedRequest('/api/sales-invoices/me')
}

export async function createSalesInvoice(invoice) {
  return sendAuthenticatedRequest('/api/sales-invoices', {
    method: 'POST',
    body: JSON.stringify(invoice),
  })
}

export async function createSalesInvoiceFromPartRequest(partRequestId, invoice) {
  return sendAuthenticatedRequest(`/api/sales-invoices/from-part-request/${partRequestId}`, {
    method: 'POST',
    body: JSON.stringify(invoice),
  })
}

export async function getMyServiceAppointments() {
  return sendAuthenticatedRequest('/api/service-appointments/me')
}

export async function createMyServiceAppointment(appointment) {
  return sendAuthenticatedRequest('/api/service-appointments/me', {
    method: 'POST',
    body: JSON.stringify(appointment),
  })
}

export async function cancelMyServiceAppointment(serviceAppointmentId, cancellationReason = '') {
  return sendAuthenticatedRequest(`/api/service-appointments/me/${serviceAppointmentId}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ cancellationReason }),
  })
}

export async function getServiceAppointments({ query = '', status = '', date = '' } = {}) {
  const params = new URLSearchParams()
  if (query) {
    params.set('query', query)
  }
  if (status) {
    params.set('status', status)
  }
  if (date) {
    params.set('date', date)
  }

  const queryString = params.toString()
  return sendAuthenticatedRequest(`/api/service-appointments${queryString ? `?${queryString}` : ''}`)
}

export async function updateServiceAppointmentStatus(serviceAppointmentId, update) {
  return sendAuthenticatedRequest(`/api/service-appointments/${serviceAppointmentId}/status`, {
    method: 'PUT',
    body: JSON.stringify(update),
  })
}

export async function getBookingInvoices(query = '') {
  const queryString = query ? `?query=${encodeURIComponent(query)}` : ''
  return sendAuthenticatedRequest(`/api/booking-invoices${queryString}`)
}

export async function getMyBookingInvoices() {
  return sendAuthenticatedRequest('/api/booking-invoices/me')
}

export async function createBookingInvoice(invoice) {
  return sendAuthenticatedRequest('/api/booking-invoices', {
    method: 'POST',
    body: JSON.stringify(invoice),
  })
}

export async function getCustomerReports({ from = '', to = '', reportType = 'Combined', query = '' } = {}) {
  const params = new URLSearchParams()
  if (from) {
    params.set('from', from)
  }
  if (to) {
    params.set('to', to)
  }
  if (reportType) {
    params.set('reportType', reportType)
  }
  if (query) {
    params.set('query', query)
  }

  const queryString = params.toString()
  return sendAuthenticatedRequest(`/api/customer-reports${queryString ? `?${queryString}` : ''}`)
}

export async function getFinancialReport({ from = '', to = '', granularity = 'Daily' } = {}) {
  const params = new URLSearchParams()
  if (from) {
    params.set('from', from)
  }
  if (to) {
    params.set('to', to)
  }
  if (granularity) {
    params.set('granularity', granularity)
  }

  const queryString = params.toString()
  return sendAuthenticatedRequest(`/api/financial-reports/summary${queryString ? `?${queryString}` : ''}`)
}

export async function getAdminOverdueCredits(take = 10) {
  const count = Number(take || 0)
  const query = Number.isFinite(count) && count > 0 ? `?take=${encodeURIComponent(Math.min(count, 100))}` : ''
  return sendAuthenticatedRequest(`/api/admin/insights/overdue-credits${query}`)
}

export async function getCustomerReportRequests(status = '') {
  const queryString = status ? `?status=${encodeURIComponent(status)}` : ''
  return sendAuthenticatedRequest(`/api/customer-reports/requests${queryString}`)
}

export async function completeCustomerReportRequest(requestId, request = {}) {
  return sendAuthenticatedRequest(`/api/customer-reports/requests/${requestId}/complete`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export async function getMyCustomerReportRequests() {
  return sendAuthenticatedRequest('/api/customer-reports/requests/me')
}

export async function createMyCustomerReportRequest(request) {
  return sendAuthenticatedRequest('/api/customer-reports/requests/me', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function getMyNotifications() {
  return sendAuthenticatedRequest('/api/notifications/me')
}

export async function markNotificationRead(notificationId) {
  return sendAuthenticatedRequest(`/api/notifications/${notificationId}/read`, {
    method: 'PUT',
  })
}

export async function markAllNotificationsRead() {
  return sendAuthenticatedRequest('/api/notifications/read-all', {
    method: 'PUT',
  })
}

export async function getApprovedReviews() {
  return fetch(`${API_BASE_URL}/api/reviews/approved`).then(async (response) => {
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.message ?? data?.title ?? 'Something went wrong. Please try again.')
    }
    return data
  })
}

export async function getAllReviews({ query = '', status = '' } = {}) {
  const params = new URLSearchParams()
  if (query) {
    params.set('query', query)
  }
  if (status) {
    params.set('status', status)
  }

  const queryString = params.toString()
  return sendAuthenticatedRequest(`/api/reviews${queryString ? `?${queryString}` : ''}`)
}

export async function getMyReviews() {
  return sendAuthenticatedRequest('/api/reviews/me')
}

export async function createReview(review) {
  return sendAuthenticatedRequest('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(review),
  })
}

export async function updateReviewStatus(reviewId, update) {
  return sendAuthenticatedRequest(`/api/reviews/${reviewId}/status`, {
    method: 'PUT',
    body: JSON.stringify(update),
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

export async function requestPasswordChangeCode() {
  return sendAuthenticatedRequest('/api/profile/password-change-code', {
    method: 'POST',
  })
}

export async function changePassword(passwordChange) {
  const data = await sendAuthenticatedRequest('/api/profile/password', {
    method: 'PUT',
    body: JSON.stringify(passwordChange),
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

export async function uploadVehicleImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  return sendAuthenticatedRequest('/api/uploads/vehicle-image', {
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
