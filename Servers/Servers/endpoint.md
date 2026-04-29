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

## Authentication

### Login

`POST /api/auth/login`

Access: Public

Request:

```json
{
  "email": "admin@autocare.local",
  "password": "Admin@12345"
}
```

Response includes:

```json
{
  "token": "...",
  "expiresAt": "2026-04-27T17:03:41Z",
  "user": {
    "id": 1,
    "fullName": "System Admin",
    "email": "admin@autocare.local",
    "phone": "9800000000",
    "role": "Admin",
    "createdAt": "2026-04-27T15:03:14Z"
  }
}
```

Use the returned token as:

```http
Authorization: Bearer <token>
```

In Swagger, click `Authorize` and paste only the token value.

### Register Customer

`POST /api/auth/register/customer`

Access: Public

Request:

```json
{
  "fullName": "New Customer",
  "email": "new.customer@example.com",
  "phone": "9812345678",
  "password": "Customer@12345"
}
```

### Create Staff

`POST /api/auth/staff`

Access: Admin only

Headers:

```http
Authorization: Bearer <admin-token>
```

Request:

```json
{
  "email": "new.staff@example.com",
  "password": "Staff@12345"
}
```

### Current User

`GET /api/auth/me`

Access: Authenticated users

Headers:

```http
Authorization: Bearer <token>
```

### List Users

`GET /api/auth/users`

Access: Admin only

Headers:

```http
Authorization: Bearer <admin-token>
```

## Vendors

Vendor records are used by purchase invoices and stock update workflows.

### List Vendors

`GET /api/vendors`

Access: Admin or Staff

Headers:

```http
Authorization: Bearer <admin-or-staff-token>
```

### Get Vendor

`GET /api/vendors/{vendorId}`

Access: Admin or Staff

### Create Vendor

`POST /api/vendors`

Access: Admin or Staff

Request:

```json
{
  "name": "ABC Auto Parts",
  "email": "sales@abcparts.example",
  "phone": "9800000010",
  "contactPerson": "Ramesh Shrestha",
  "address": "Main Road",
  "city": "Itahari",
  "country": "Nepal",
  "taxNumber": "PAN-123456",
  "paymentTerms": "Net 30",
  "bankName": "Nabil Bank",
  "bankAccountNumber": "00123456789",
  "notes": "Preferred supplier for filters and belts."
}
```

### Update Vendor

`PUT /api/vendors/{vendorId}`

Access: Admin or Staff

Request body is the same as create, with an additional `isActive` field:

```json
{
  "name": "ABC Auto Parts",
  "email": "sales@abcparts.example",
  "phone": "9800000010",
  "contactPerson": "Ramesh Shrestha",
  "address": "Main Road",
  "city": "Itahari",
  "country": "Nepal",
  "taxNumber": "PAN-123456",
  "paymentTerms": "Net 30",
  "bankName": "Nabil Bank",
  "bankAccountNumber": "00123456789",
  "notes": "Preferred supplier for filters and belts.",
  "isActive": true
}
```

### Delete Vendor

`DELETE /api/vendors/{vendorId}`

Access: Admin or Staff

This performs a soft delete by setting `isActive` to `false`, so future purchase invoice history can still reference the vendor.

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
