# AeroCurator Smart Inventory Management

A robust, full-stack inventory management system designed for aerospace and drone components. AeroCurator is built on a modern Mongoose and Node.js architecture with secure, Role-Based Access Control (RBAC) to manage component tracking, procurement requests, and dynamic ledger entries.

## 🚀 Features
- **Role-Based Access Control (RBAC):** Strict isolation between Administrators and Standard users (Pilots/Technicians).
- **Automated Ledger:** Records and parses all incoming (purchases) and outgoing (sales) drone equipment.
- **Order Request Protocol:** Allows non-privileged users to request new stock without granting unauthorized write-access to the hangar inventory.
- **Stock Guardrails:** Automated validation cleanly blocks negative inventory levels and issues threshold alerts.
- **Enterprise Security:** API endpoints are fortified with Helmet (HTTP guardrails) and Rate Limiting to deter brute-force breaches.

---

## 💻 Tech Stack
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT Auth
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Tailwind CSS (CDN), Chart.js
- **Testing:** Python E2E API Verification Suite

---

## 🛠️ Setup Instructions

### 1. Requirements
Ensure you have the following installed on your machine:
- Node.js (v18+)
- MongoDB (Running locally or a valid MongoDB URI via Atlas)
- Python 3.x (Optional, for running automated test suites)

### 2. Installation
Navigate into the backend directory and install all node packages:
```bash
cd backend
npm install
```

### 3. Environment Variables
Create a locally-scoped `.env` file within the `/backend` directory. Include the following variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aerocurator_inventory
JWT_SECRET=your_super_secret_jwt_key
```

### 4. Running the Complete Application
Start the Node.js backend. This inherently mounts the REST API and automatically serves the `/frontend` bridging configuration:
```bash
cd backend
node server.js
```
The application will map and spin up instantly at **http://localhost:5000**.

---

## 📝 Usage Guide

1. Navigate to `http://localhost:5000/`.
2. **Admin Operations**: Register a user with an "admin" role (or elevate one manually in the database for the first time). Admins can insert items into the inventory, process incoming procurements, and manage user permissions.
3. **Standard Users**: Register normally. From the User Dashboard, standard users can read the catalog and "Request Stock" directly from administrators without having raw access to sensitive ledger data.

---

## 📁 Repository Structure

```text
aerocurator_smart_inventory/
├── backend/
│   ├── config/              # Runtime configurations
│   ├── middleware/          # JWT and Express verification hooks
│   ├── models/              # Mongoose Data Schemas (Component, User, Sale, Purchase, Request)
│   ├── routes/              # Segmented Express API logic
│   └── server.js            # Primary application entry point
├── frontend/
│   ├── admin-dashboard/     # Administrative portal
│   ├── inventory/           # Complete catalog overview
│   ├── orders/              # Procurement request pipelines
│   ├── css/                 # Global UI themes
│   └── js/                  # Centralized fetch wrappers and UI controllers
├── test_api.py              # Automated 51-point E2E Python Test Suite
├── docker-compose.yml       # Production-ready compose configurations
├── Dockerfile               # Root-level multi-service image builder
└── README.md                # Documentation
```

---

## 📄 License
*Pending License Information*
