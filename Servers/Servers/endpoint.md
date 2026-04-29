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
| POST | `http://localhost:5223/api/auth/login` | Public | Login with email and password. |
| POST | `http://localhost:5223/api/auth/register/customer` | Public | Register a new customer account. |
| POST | `http://localhost:5223/api/auth/staff` | Admin | Create a staff account. |
| GET | `http://localhost:5223/api/auth/me` | Authenticated user | Get the currently logged-in user. |
| GET | `http://localhost:5223/api/auth/users` | Admin | List all users. |

### Profile Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/profile/me` | Authenticated user | Get the current user's profile details. |
| PUT | `http://localhost:5223/api/profile/me` | Authenticated user | Update the current user's profile details. |
| POST | `http://localhost:5223/api/profile/complete-setup` | Authenticated user | Complete account setup and set a new password. |

### Upload Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| POST | `http://localhost:5223/api/uploads/profile-image` | Authenticated user | Upload a profile image file. |

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
| GET | `http://localhost:5223/api/parts` | Admin, Staff | List active inventory parts. |
| GET | `http://localhost:5223/api/parts/{partId}` | Admin, Staff | Get one active part by ID. |
| POST | `http://localhost:5223/api/parts` | Admin | Create a new inventory part with part details. |
| PUT | `http://localhost:5223/api/parts/{partId}` | Admin | Update an existing inventory part and part details. |
| DELETE | `http://localhost:5223/api/parts/{partId}` | Admin | Soft delete a part from active inventory. |

### Purchase Invoice Endpoints

| Method | Endpoint URL | Access | Description |
| --- | --- | --- | --- |
| GET | `http://localhost:5223/api/purchase-invoices` | Admin | List purchase invoices with vendor and item details. |
| GET | `http://localhost:5223/api/purchase-invoices/{purchaseInvoiceId}` | Admin | Get one purchase invoice by ID. |
| POST | `http://localhost:5223/api/purchase-invoices` | Admin | Create a purchase invoice and increase purchased part stock. |
| PUT | `http://localhost:5223/api/purchase-invoices/{purchaseInvoiceId}` | Admin | Update a purchase invoice and recalculate stock movement. |
| DELETE | `http://localhost:5223/api/purchase-invoices/{purchaseInvoiceId}` | Admin | Cancel a purchase invoice and reverse stock movement. |

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
