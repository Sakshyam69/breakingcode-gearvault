# API Endpoints

Base URL:

```text
http://localhost:5223
```

Swagger UI:

```text
http://localhost:5223/swagger
```

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@autocare.local` | `Admin@12345` |
| Staff | `staff@autocare.local` | `Staff@12345` |
| Customer | `customer@autocare.local` | `Customer@12345` |

## Endpoints

Use the `Authorization: Bearer <token>` header for every protected endpoint.

### Auth Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `http://localhost:5223/api/auth/register/customer` | Public | Register a new customer account. |
| POST | `http://localhost:5223/api/auth/staff` | Admin | Create a staff account. |
| POST | `http://localhost:5223/api/auth/customers` | Admin, Staff | Create a customer account from the staff/admin dashboard. |
| POST | `http://localhost:5223/api/auth/login` | Public | Login with email and password. |
| GET | `http://localhost:5223/api/auth/me` | Authenticated user | Get the currently logged-in user. |
| GET | `http://localhost:5223/api/auth/users` | Admin | List all users. |
| PUT | `http://localhost:5223/api/auth/users/{userId}/role` | Admin | Change a user's role. |
| PUT | `http://localhost:5223/api/auth/users/{userId}/active` | Admin | Activate or deactivate a user account. |

### Profile Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/profile/me` | Authenticated user | Get the current user's profile details. |
| PUT | `http://localhost:5223/api/profile/me` | Authenticated user | Update the current user's profile details. |
| POST | `http://localhost:5223/api/profile/password-change-code` | Authenticated user | Send a password-change code to the user's email. |
| PUT | `http://localhost:5223/api/profile/password` | Authenticated user | Change password using current password and code verification. |
| POST | `http://localhost:5223/api/profile/complete-setup` | Authenticated user | Complete account setup and set a new password. |

### Upload Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `http://localhost:5223/api/uploads/profile-image` | Authenticated user | Upload a profile image file. |
| POST | `http://localhost:5223/api/uploads/vehicle-image` | Authenticated user | Upload a vehicle image file. |

### Notification Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/notifications/me` | Authenticated user | List notifications for the logged-in user. |
| PUT | `http://localhost:5223/api/notifications/{notificationId}/read` | Authenticated user | Mark one notification as read. |
| PUT | `http://localhost:5223/api/notifications/read-all` | Authenticated user | Mark all notifications as read. |

### Vendor Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/vendors` | Admin, Staff | List active vendors. |
| GET | `http://localhost:5223/api/vendors/{vendorId}` | Admin, Staff | Get one active vendor by ID. |
| POST | `http://localhost:5223/api/vendors` | Admin, Staff | Create a new vendor. |
| PUT | `http://localhost:5223/api/vendors/{vendorId}` | Admin, Staff | Update an existing vendor. |
| DELETE | `http://localhost:5223/api/vendors/{vendorId}` | Admin, Staff | Soft delete a vendor from the active vendor list. |

### Parts / Inventory Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/parts` | Admin, Staff, Customer | List active inventory parts. |
| GET | `http://localhost:5223/api/parts/{partId}` | Admin, Staff, Customer | Get one active part by ID. |
| POST | `http://localhost:5223/api/parts` | Admin | Create a new inventory part. |
| PUT | `http://localhost:5223/api/parts/{partId}` | Admin | Update an existing inventory part. |
| DELETE | `http://localhost:5223/api/parts/{partId}` | Admin | Soft delete a part from active inventory. |

### Purchase Invoice Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/purchase-invoices` | Admin | List purchase invoices with vendor and item details. |
| GET | `http://localhost:5223/api/purchase-invoices/{purchaseInvoiceId}` | Admin | Get one purchase invoice by ID. |
| POST | `http://localhost:5223/api/purchase-invoices` | Admin | Create a purchase invoice and increase purchased part stock. |
| PUT | `http://localhost:5223/api/purchase-invoices/{purchaseInvoiceId}` | Admin | Update a purchase invoice and recalculate stock movement. |
| DELETE | `http://localhost:5223/api/purchase-invoices/{purchaseInvoiceId}` | Admin | Cancel a purchase invoice and reverse stock movement. |

### Customer Vehicle Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/customer-vehicles/me` | Customer | List the logged-in customer's active vehicles. |
| POST | `http://localhost:5223/api/customer-vehicles/me` | Customer | Add a vehicle for the logged-in customer. |
| PUT | `http://localhost:5223/api/customer-vehicles/me/{vehicleId}` | Customer | Update one of the logged-in customer's vehicles. |
| DELETE | `http://localhost:5223/api/customer-vehicles/me/{vehicleId}` | Customer | Soft delete one of the logged-in customer's vehicles. |
| GET | `http://localhost:5223/api/customer-vehicles/customers?query={query}` | Admin, Staff | Search customers by name, email, phone, or ID for vehicle management. |
| GET | `http://localhost:5223/api/customer-vehicles/search?query={query}` | Admin, Staff | Search vehicles by vehicle number, customer name, phone, email, customer ID, make, or model. |
| GET | `http://localhost:5223/api/customer-vehicles/customer/{customerId}` | Admin, Staff | List active vehicles for a selected customer. |
| POST | `http://localhost:5223/api/customer-vehicles/customer/{customerId}` | Admin, Staff | Add a vehicle for a selected customer. |
| PUT | `http://localhost:5223/api/customer-vehicles/{vehicleId}` | Admin, Staff | Update any customer vehicle. |
| DELETE | `http://localhost:5223/api/customer-vehicles/{vehicleId}` | Admin, Staff | Soft delete any customer vehicle. |

### Part Request Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/part-requests/me` | Customer | List the logged-in customer's part requests. |
| POST | `http://localhost:5223/api/part-requests/me` | Customer | Create a part request. |
| PUT | `http://localhost:5223/api/part-requests/me/{partRequestId}/cancel` | Customer | Cancel a submitted part request. |
| GET | `http://localhost:5223/api/part-requests?query={query}&status={status}` | Admin, Staff | Search/filter part requests. |
| PUT | `http://localhost:5223/api/part-requests/{partRequestId}/status` | Admin, Staff | Update part request status (for example approve/reject/fulfilled). |

### Sales Invoice Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/sales-invoices?query={query}` | Admin, Staff | Search sales invoices. |
| GET | `http://localhost:5223/api/sales-invoices/me` | Customer | List the logged-in customer's sales invoices. |
| GET | `http://localhost:5223/api/sales-invoices/{salesInvoiceId}` | Admin, Staff, Customer owner | Get one sales invoice by ID. |
| POST | `http://localhost:5223/api/sales-invoices` | Admin, Staff | Create a sales invoice. |
| POST | `http://localhost:5223/api/sales-invoices/from-part-request/{partRequestId}` | Admin, Staff | Create a sales invoice directly from a part request. |

### Service Appointment Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/service-appointments/me` | Customer | List the logged-in customer's service appointments. |
| POST | `http://localhost:5223/api/service-appointments/me` | Customer | Book a physical vehicle service appointment. |
| PUT | `http://localhost:5223/api/service-appointments/me/{serviceAppointmentId}/cancel` | Customer | Cancel a pending or confirmed appointment. |
| GET | `http://localhost:5223/api/service-appointments?query={query}&status={status}&date={date}` | Admin, Staff | Search and filter service appointments. |
| GET | `http://localhost:5223/api/service-appointments/{serviceAppointmentId}` | Admin, Staff, Customer owner | Get one service appointment by ID. |
| PUT | `http://localhost:5223/api/service-appointments/{serviceAppointmentId}/status` | Admin, Staff | Confirm, start, complete, reject, cancel, or mark an appointment as no-show. |

### Booking Invoice Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/booking-invoices?query={query}` | Admin, Staff | Search service booking invoices by invoice, appointment, service, customer, or vehicle. |
| GET | `http://localhost:5223/api/booking-invoices/me` | Customer | List the logged-in customer's service booking invoices. |
| GET | `http://localhost:5223/api/booking-invoices/{bookingInvoiceId}` | Admin, Staff, Customer owner | Get one service booking invoice by ID. |
| POST | `http://localhost:5223/api/booking-invoices` | Admin, Staff | Create one invoice for a completed service appointment. |

### Review Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/reviews/approved` | Public | List approved reviews for public display. |
| GET | `http://localhost:5223/api/reviews?query={query}&status={status}` | Admin, Staff | Search/filter all reviews. |
| GET | `http://localhost:5223/api/reviews/me` | Customer | List the logged-in customer's reviews. |
| POST | `http://localhost:5223/api/reviews` | Customer | Create a new review. |
| GET | `http://localhost:5223/api/reviews/{reviewId}` | Admin, Staff, Customer owner | Get one review by ID. |
| PUT | `http://localhost:5223/api/reviews/{reviewId}/status` | Admin, Staff | Approve/reject or otherwise update review status. |

### Customer Report Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/customer-reports?from={date}&to={date}&reportType={Combined\|SalesOnly\|ServicesOnly}&query={query}` | Admin, Staff | Generate customer reports for best clients, regulars, pending credits, parts sales, and services. |
| GET | `http://localhost:5223/api/customer-reports/requests?status={status}` | Admin, Staff | List customer report requests. |
| PUT | `http://localhost:5223/api/customer-reports/requests/{requestId}/complete` | Admin, Staff | Mark a customer report request as prepared and notify the customer. |
| GET | `http://localhost:5223/api/customer-reports/requests/me` | Customer | List the logged-in customer's report requests. |
| POST | `http://localhost:5223/api/customer-reports/requests/me` | Customer | Request a sales-only, services-only, or combined report from staff. |

### Financial Report Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/financial-reports/summary?from={date}&to={date}&granularity={Daily\|Weekly\|Monthly}` | Admin | Generate financial summary reports. |

### Admin Insight Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/admin/insights/overdue-credits?take={1-100}` | Admin | List top overdue-credit customers for follow-up/reminders. |

## EF Core Commands

Run these from this folder:

```bash
Servers/Servers
```

Create a new migration:

```bash
dotnet ef migrations add AddSomething -o Migrations
```

Apply migrations to the database:

```bash
dotnet ef database update
```

Remove the last migration if it was created by mistake and not applied:

```bash
dotnet ef migrations remove
```
