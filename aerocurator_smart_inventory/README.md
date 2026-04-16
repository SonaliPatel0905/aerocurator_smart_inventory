# AeroCurator – Smart Inventory System for Drone Components

> A professional full-stack inventory management system built for drone fleet operators.

![Tech Stack](https://img.shields.io/badge/Backend-Flask%20%2B%20SQLite-blue?style=flat-square)
![Frontend](https://img.shields.io/badge/Frontend-HTML%20%2B%20Tailwind%20CSS-38bdf8?style=flat-square)
![Auth](https://img.shields.io/badge/Auth-bcrypt%20tokens-purple?style=flat-square)

---

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Start the Backend API

```bash
python app.py
```

The API will start at **http://localhost:5000** and auto-create the SQLite database with seed data.

### 3. Open the Frontend

Open `frontend/index.html` directly in your browser (or serve with a local static server).

---

## 🔐 Default Credentials

| Role  | Email                      | Password   |
|-------|----------------------------|------------|
| Admin | `admin@aerocurator.io`     | `admin123` |
| User  | `pilot@aerocurator.io`     | `user1234` |

---

## 📁 Project Structure

```
aerocurator_smart_inventory/
├── backend/
│   ├── app.py              # Flask REST API (all endpoints)
│   ├── models.py           # SQLite schema + seed data
│   ├── database.db         # Auto-created on first run
│   └── requirements.txt
├── frontend/
│   ├── index.html          # Login page
│   ├── dashboard/
│   │   ├── dashboard.html
│   │   └── dashboard.js
│   ├── inventory/
│   │   ├── inventory.html
│   │   └── inventory.js
│   ├── purchase/
│   │   ├── purchase.html
│   │   └── purchase.js
│   ├── sales/
│   │   ├── sales.html
│   │   └── sales.js
│   ├── alerts/
│   │   ├── alerts.html
│   │   └── alerts.js
│   ├── reports/
│   │   ├── reports.html
│   │   └── reports.js
│   ├── js/
│   │   ├── api.js          # Fetch API wrapper
│   │   └── auth.js         # Auth + UI utilities
│   └── css/
│       └── custom.css      # Aero-Spatial Horizon design system
└── README.md
```

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Login, receive token |
| POST | `/logout` | Bearer | Invalidate token |
| GET | `/me` | Bearer | Get current user |
| GET | `/inventory` | Bearer | List all components |
| POST | `/inventory/add` | Admin | Add new component |
| PUT | `/inventory/update/<id>` | Admin | Update component |
| DELETE | `/inventory/delete/<id>` | Admin | Delete component |
| GET | `/inventory/categories` | Bearer | List categories |
| GET | `/purchases` | Bearer | Purchase history |
| POST | `/purchase` | Bearer | Record a purchase |
| GET | `/sales` | Bearer | Sales history |
| POST | `/sales` | Bearer | Record a sale |
| GET | `/alerts` | Bearer | Low-stock alerts |
| GET | `/dashboard/stats` | Bearer | Dashboard stats |
| GET | `/reports/data` | Bearer | Analytics data |

---

## ⚡ Features

- **Login System** – Role-based (Admin / User), bcrypt password hashing, Bearer token auth
- **Inventory CRUD** – Add, edit, delete drone components (Admin only)
- **Purchase Module** – Record supplier purchases → auto-increases stock
- **Sales Module** – Record customer sales → auto-decreases stock with negative-stock prevention
- **Stock Alerts** – Real-time flagging of low / critical stock items with reorder shortcuts
- **Reports** – Revenue trend, category donut chart, purchase vs sales comparison, top sellers
- **Dashboard** – KPI cards, trend charts, recent activity tables

---

## 🎨 Design System

Based on the **Aero-Spatial Horizon** concept:
- Deep aviation color palette (`#060e20` base, `#93aaff` primary)
- **Manrope** typeface for geometric clarity
- Glassmorphism modals & sidebar
- No 1px borders – tonal separation only
- Signature gradient (`#93aaff → #849df2` at 135°)

---

## 🛡️ Security

- Passwords hashed with **bcrypt**
- All SQL uses **parameterized queries** (no SQL injection)
- **CORS** enabled via flask-cors
- Role-based route protection (`@require_admin` decorator)
- Negative stock prevention at both API and UI level
