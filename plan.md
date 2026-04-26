# Project Development Plan: Vehicle Parts Selling and Inventory Management System

This document outlines the development hierarchy and execution strategy for the project, ensuring that dependencies are handled in the correct order across all 5 team members.

## **Development Hierarchy & Dependency Flow**

The project is structured into four phases. Members in Phase 1 provide the foundation for subsequent features.

### **Phase 1: Core Foundation (The Building Blocks)**
*Focus: Identity, Inventory, and Data Entry*
*   **Member 1:** Starts with **Staff Management (2)** and **Parts Management (3)**. 
    *   *Why:* The system needs staff accounts to function and a database of parts before any sales or purchases can occur.
*   **Member 2:** Starts with **Vendor Management (5)** and **Customer Registration (6)**.
    *   *Why:* Vendors are needed for stock updates (Member 2's next task) and Customers are needed for sales (Member 3's task).

### **Phase 2: Operational Core (Transactions)**
*Focus: Stock Movement and Initial Sales*
*   **Member 2:** Implements **Purchase Invoices (4)**.
    *   *Dependency:* Requires Vendor and Part data from Phase 1.
*   **Member 3:** Implements **Part Sales & Invoicing (7)**.
    *   *Dependency:* Requires Customer and Part data from Phase 1.

### **Phase 3: Utility & User Interaction**
*Focus: Search, Communication, and Self-Service*
*   **Member 4:** Implements **Customer Search (10)**, **Email Invoices (11)**, and **Self Registration (12)**.
    *   *Dependency:* Requires existing Customer and Sales data to search or email.
*   **Member 3:** Implements **Customer Info View (8)**.
    *   *Dependency:* Requires Sales and Customer data.
*   **Member 5:** Implements **Appointments & Requests (13)** and **History View (14)**.
    *   *Dependency:* History view depends on Sales/Service data from Member 3.

### **Phase 4: Advanced Logic & Analytics**
*Focus: Automation and Reporting*
*   **Member 1:** Implements **Financial Reports (1)**.
    *   *Dependency:* Aggregates data from Sales (M3) and Purchases (M2).
*   **Member 3:** Implements **Customer Reports (9)**.
    *   *Dependency:* Aggregates data from Customer interactions.
*   **Member 5:** Implements **Low Stock Alerts + Credit Reminders (15)**.
    *   *Dependency:* Monitors stock levels (M1/M2) and unpaid invoices (M3).

---

## **Summary of Member Responsibilities**

| Member | Tasks | Priority Level |
| :--- | :--- | :--- |
| **Member 1** | Staff Mgmt, Parts Mgmt, Financial Reports | High (Foundation) |
| **Member 2** | Vendor Mgmt, Customer Registration, Purchase Invoices | High (Foundation) |
| **Member 3** | Sales & Invoicing, Info View, Customer Reports | Medium (Operations) |
| **Member 4** | Search, Emailing, Self-Registration | Medium (Utility) |
| **Member 5** | Appointments, History, Alerts/Reminders | Low (Advanced) |

## **Next Steps**
1.  **API Design:** Define shared data models (Parts, Customers, Vendors) to ensure frontend/backend compatibility.
2.  **Environment Setup:** Initialize the ASP.NET Core Web API and Frontend projects.
3.  **Database Schema:** Member 1 and Member 2 should collaborate on the initial PostgreSQL schema for the core entities.
