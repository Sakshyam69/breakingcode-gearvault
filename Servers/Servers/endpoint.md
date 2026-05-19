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

## Feature-Wise Endpoint Classification (AA)

All endpoint URLs below are relative paths. Use `Authorization: Bearer <token>` for protected endpoints.

### Feature 1: Admin can generate and view financial reports (daily, monthly, yearly)

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/financial-reports/summary?from={date}&to={date}&granularity={Daily\|Monthly\|Yearly}` | Admin | Generate financial summary reports by day, month, or year. |

### Feature 2: Admin can manage staff registration and roles

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/staff` | Admin | Register a new staff account. |
| GET | `/api/auth/users` | Admin | View all users. |
| PUT | `/api/auth/users/{userId}/role` | Admin | Update user role (except self-role change). |
| PUT | `/api/auth/users/{userId}/active` | Admin | Activate/deactivate user account (except self-deactivation). |

### Feature 3: Admin can perform parts management (purchase, edit, delete)

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/parts` | Admin, Staff, Customer | View parts inventory list. |
| GET | `/api/parts/{partId}` | Admin, Staff, Customer | View part details. |
| POST | `/api/parts` | Admin | Create a new inventory part. |
| PUT | `/api/parts/{partId}` | Admin | Edit part details/pricing/stock fields. |
| DELETE | `/api/parts/{partId}` | Admin | Soft delete a part from active inventory. |

### Feature 4: Admin can create purchase invoices for stock updates

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/purchase-invoices` | Admin | Create purchase invoice and increase stock quantities. |
| GET | `/api/purchase-invoices` | Admin | View purchase invoices. |
| GET | `/api/purchase-invoices/{purchaseInvoiceId}` | Admin | View one purchase invoice. |
| PUT | `/api/purchase-invoices/{purchaseInvoiceId}` | Admin | Edit purchase invoice and recalculate stock movement. |
| DELETE | `/api/purchase-invoices/{purchaseInvoiceId}` | Admin | Cancel purchase invoice and reverse stock movement. |

### Feature 5: Admin can manage vendor details (CRUD operations)

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/vendors` | Admin, Staff | List vendors. |
| GET | `/api/vendors/{vendorId}` | Admin, Staff | View one vendor. |
| POST | `/api/vendors` | Admin, Staff | Create vendor. |
| PUT | `/api/vendors/{vendorId}` | Admin, Staff | Update vendor. |
| DELETE | `/api/vendors/{vendorId}` | Admin, Staff | Soft delete vendor. |

### Feature 6: Staff can register new customers with vehicle details

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/customers` | Admin, Staff | Register customer account from staff/admin side. |
| POST | `/api/customer-vehicles/customer/{customerId}` | Admin, Staff | Add customer vehicle details (can be done at registration time or later). |
| GET | `/api/customer-vehicles/customer/{customerId}` | Admin, Staff | View registered vehicles of selected customer. |

### Feature 7: Staff can sell vehicle parts and create sales invoices

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/sales-invoices` | Admin, Staff | Create sales invoice with part items. |
| POST | `/api/sales-invoices/from-part-request/{partRequestId}` | Admin, Staff | Create sales invoice directly from customer part request. |
| GET | `/api/sales-invoices?query={query}` | Admin, Staff | Search sales invoices. |
| GET | `/api/sales-invoices/{salesInvoiceId}` | Admin, Staff, Customer owner | View one sales invoice. |

### Feature 8: Staff can view customer details, history, and vehicle info

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/customer-vehicles/customers?query={query}` | Admin, Staff | Search/view customer basic profile list. |
| GET | `/api/customer-vehicles/customer/{customerId}` | Admin, Staff | View selected customer vehicles. |
| GET | `/api/customer-vehicles/search?query={query}` | Admin, Staff | Search vehicles and linked customer info. |
| GET | `/api/sales-invoices?query={query}` | Admin, Staff | View customer parts purchase history via invoices. |
| GET | `/api/booking-invoices?query={query}` | Admin, Staff | View customer service billing history. |
| GET | `/api/service-appointments?query={query}&status={status}&date={date}` | Admin, Staff | View customer appointment/service history. |

### Feature 9: Staff can generate customer-related reports (regulars, high spenders, pending credits)

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/customer-reports?from={date}&to={date}&reportType={Combined\|SalesOnly\|ServicesOnly}&query={query}` | Admin, Staff | Generate customer analytics including best clients, regular clients, and pending-credit groups. |
| GET | `/api/customer-reports/requests?status={status}` | Admin, Staff | View report requests sent by customers. |
| PUT | `/api/customer-reports/requests/{requestId}/complete` | Admin, Staff | Mark requested report as completed and notify customer. |

### Feature 10: Staff can search customers by vehicle number, phone, ID, or name

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/customer-vehicles/search?query={query}` | Admin, Staff | Search by vehicle number plus customer fields. |
| GET | `/api/customer-vehicles/customers?query={query}` | Admin, Staff | Search customers by name, phone, email, or customer ID. |

### Feature 11: Staff can send invoices via email to customers

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/sales-invoices` | Admin, Staff | Creates sales invoice and system attempts invoice email automatically (`EmailSent` in response). |
| POST | `/api/booking-invoices` | Admin, Staff | Creates service invoice and system attempts invoice email automatically (`EmailSent` in response). |

### Feature 12: Customers can self-register and manage profile & vehicle details

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register/customer` | Public | Customer self-registration. |
| GET | `/api/profile/me` | Authenticated user | View own profile details. |
| PUT | `/api/profile/me` | Authenticated user | Update own profile details. |
| POST | `/api/profile/complete-setup` | Authenticated user | Complete account setup. |
| GET | `/api/customer-vehicles/me` | Customer | View own vehicles. |
| POST | `/api/customer-vehicles/me` | Customer | Add own vehicle. |
| PUT | `/api/customer-vehicles/me/{vehicleId}` | Customer | Update own vehicle. |
| DELETE | `/api/customer-vehicles/me/{vehicleId}` | Customer | Delete own vehicle. |

### Feature 13: Customers can book appointments, request unavailable parts, and review services

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/service-appointments/me` | Customer | Book service appointment. |
| GET | `/api/service-appointments/me` | Customer | View own appointments. |
| PUT | `/api/service-appointments/me/{serviceAppointmentId}/cancel` | Customer | Cancel own appointment. |
| POST | `/api/part-requests/me` | Customer | Request unavailable part. |
| GET | `/api/part-requests/me` | Customer | View own part requests. |
| PUT | `/api/part-requests/me/{partRequestId}/cancel` | Customer | Cancel own part request. |
| POST | `/api/reviews` | Customer | Submit service review. |
| GET | `/api/reviews/me` | Customer | View own reviews. |

### Feature 14: Customers can view their purchase/service history

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/sales-invoices/me` | Customer | View own parts purchase history. |
| GET | `/api/booking-invoices/me` | Customer | View own service invoice history. |
| GET | `/api/service-appointments/me` | Customer | View own service appointment history. |
| GET | `/api/part-requests/me` | Customer | View own unavailable-part request history. |

### Feature 15: System automatically notifies Admin for low stock (<10) and sends overdue credit reminders after 1 month

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/notifications/me` | Authenticated user | View system notifications (includes low-stock alerts for Admin and overdue credit reminders for Customers). |
| GET | `/api/admin/insights/overdue-credits?take={1-100}` | Admin | View overdue-credit customers for follow-up. |

### Feature 16: Loyalty Program (10% discount above 5000 single purchase)

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/sales-invoices` | Admin, Staff | Auto-applies 10% discount when subtotal > 5000 (`DiscountAmount`, `DiscountReason`). |
| POST | `/api/sales-invoices/from-part-request/{partRequestId}` | Admin, Staff | Same loyalty discount logic for invoice-from-request flow. |

## AI Service Related Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/vehicle-health/vehicles/{vehicleId}/analyze` | Customer owner, Admin, Staff | Analyze vehicle and persist AI prediction (`forceRefresh` request body option). |
| GET | `/api/vehicle-health/vehicles/{vehicleId}/latest` | Customer owner, Admin, Staff | Get latest vehicle AI prediction. |
| GET | `/api/vehicle-health/vehicles/{vehicleId}/history?take={1-50}` | Customer owner, Admin, Staff | Get prediction history for the vehicle. |

## Common Auth & Utility Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Public | Login endpoint. |
| GET | `/api/auth/me` | Authenticated user | Get currently logged-in user info. |
| POST | `/api/uploads/profile-image` | Authenticated user | Upload profile image. |
| POST | `/api/uploads/vehicle-image` | Authenticated user | Upload vehicle image. |
| POST | `/api/profile/password-change-code` | Authenticated user | Send password change verification code. |
| PUT | `/api/profile/password` | Authenticated user | Change password with verification code. |
| PUT | `/api/notifications/{notificationId}/read` | Authenticated user | Mark one notification as read. |
| PUT | `/api/notifications/read-all` | Authenticated user | Mark all notifications as read. |
| GET | `/api/reviews/approved` | Public | Get approved reviews for public display. |

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
