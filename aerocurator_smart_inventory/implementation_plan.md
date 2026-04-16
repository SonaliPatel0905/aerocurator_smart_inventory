# AeroCurator – Smart Inventory System: Implementation Plan

## Overview
Build a complete full-stack web application for drone component inventory management. The system mirrors enterprise SaaS systems (Zoho/Odoo Inventory) with a distinctive "Aero-Spatial Horizon" dark-theme design using the Manrope font, glassmorphism, and a deep aviation color palette.

The project will live at:
`C:\Users\shrey\Downloads\aerocurator_smart_inventory\`

---

## Architecture

```
aerocurator_smart_inventory/
├── backend/
│   ├── app.py               # Flask application + all routes
│   ├── models.py            # SQLite DB helpers + schema
│   ├── database.db          # Auto-created on first run
│   └── requirements.txt     # Flask, flask-cors, bcrypt
├── frontend/
│   ├── index.html           # Login page (from code.html reference)
│   ├── dashboard.html       # Main dashboard
│   ├── inventory.html       # Inventory management
│   ├── purchase.html        # Purchase module
│   ├── sales.html           # Sales module
│   ├── alerts.html          # Stock alerts
│   ├── reports.html         # Reports & analytics
│   ├── js/
│   │   ├── auth.js          # Login / session helpers
│   │   ├── api.js           # Fetch wrapper for all API calls
│   │   ├── dashboard.js     # Dashboard logic
│   │   ├── inventory.js     # Inventory CRUD
│   │   ├── purchase.js      # Purchase logic
│   │   ├── sales.js         # Sales logic
│   │   ├── alerts.js        # Low-stock alert logic
│   │   └── reports.js       # Charts & analytics
│   └── css/
│       └── custom.css       # Additional custom styles (animations, etc.)
└── README.md
```

---

## Backend (Flask + SQLite)

### [MODIFY] backend/app.py (new file)
Main Flask application with all REST endpoints.

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Log in, return session token |
| GET | `/inventory` | List all inventory items |
| POST | `/inventory/add` | Add new item |
| PUT | `/inventory/update/<id>` | Update item |
| DELETE | `/inventory/delete/<id>` | Delete item |
| POST | `/purchase` | Record purchase (increases stock) |
| GET | `/purchases` | List all purchases |
| POST | `/sales` | Record sale (decreases stock, validates stock level) |
| GET | `/sales` | List all sales |
| GET | `/alerts` | Items below low-stock threshold |
| GET | `/dashboard/stats` | Stats for dashboard cards |
| GET | `/reports/data` | Aggregated data for charts |

**Security:**
- bcrypt password hashing
- Parameterized SQL queries throughout
- CORS enabled via flask-cors
- Session token via simple JWT-style token stored in localStorage
- Role-based middleware checks on restricted routes

### [NEW] backend/models.py
SQLite schema initialization and query helpers.

**Tables:**
```sql
Users(id, email, password_hash, role, created_at)
Inventory(id, name, category, sku, quantity, price, low_stock_threshold, created_at, updated_at)
Purchases(id, supplier, component_id, quantity, cost_per_unit, total_cost, date, notes)
Sales(id, component_id, quantity, price_per_unit, total_price, date, customer)
```

### [NEW] backend/requirements.txt
```
Flask==3.0.3
flask-cors==4.0.1
bcrypt==4.1.3
```

---

## Frontend Pages

### Login Page (`index.html`)
- Exact replica of provided `code.html` design
- Connected to `POST /login` API
- Role toggle (User/Admin) stored in session
- Redirects to `dashboard.html` on success

### Dashboard (`dashboard.html`)
- Stats cards: Total Items, Total Value, Purchases This Month, Sales This Month
- Low-stock warning banner
- Recent Purchases & Sales tables
- Line charts: Inventory trend, Sales trend (using Chart.js)
- Quick action buttons

### Inventory Management (`inventory.html`)
- Full data table with search/filter
- Add / Edit / Delete actions
- Category filter chips
- Status badges: In Stock / Low Stock / Out of Stock
- Modal form for Add/Edit

### Purchase Module (`purchase.html`)
- Record new purchases from suppliers
- Auto-updates inventory quantity
- Purchase history table with filters

### Sales Module (`sales.html`)
- Record new sales
- Validates against current stock (prevents negative stock)
- Sales history table

### Stock Alerts (`alerts.html`)
- Table of items below threshold
- Color-coded severity (warning / critical)
- Quick reorder button links to purchase form

### Reports (`reports.html`)
- Inventory breakdown by category (Doughnut chart)
- Monthly sales trend (Bar chart)
- Top-selling components table
- Export-ready layout

---

## Design System (per DESIGN.md)

**Color Tokens (Tailwind custom config):**
- `surface`: `#060e20`
- `surface-container-low`: `#091328`
- `surface-container-highest`: `#192540`
- `surface-bright`: `#1f2b49`
- `primary`: `#93aaff`
- `primary-container`: `#849df2`
- `on-surface`: `#dee5ff`
- `on-surface-variant`: `#a3aac4`
- `error`: `#ff6e84`

**Typography:** Manrope (Google Fonts)

**Key UI Patterns:**
- No 1px borders – use tonal separation
- Glassmorphism for modals: `rgba(31,43,73,0.7)` + `backdrop-blur(24px)`
- Signature gradient: `#93aaff → #849df2` at 135°
- Shadow only for floating elements: `0px 24px 48px rgba(0,0,0,0.4)`
- Pill-shaped status chips
- `lg` (1rem) radius for cards, `xl` (1.5rem) for hero widgets

**Shared Layout (all authenticated pages):**
- Fixed left sidebar (240px) with nav links + logo
- Top navbar (64px) with page title, notifications bell, user avatar  
- Main content area with 32px+ margins

---

## JS Architecture

**`api.js`** – Central Fetch wrapper:
- Automatically attaches `Authorization` header from localStorage
- Handles 401 → redirect to login
- Wraps all endpoints

**`auth.js`** – login/logout, role checks, session guard on page load

**Chart library:** Chart.js CDN

**No heavy frameworks** – vanilla JS with DOM manipulation

---

## Verification Plan

### Automated
1. Run `python backend/app.py` – confirm server starts on port 5000
2. Test `/register` and `/login` via curl or browser console
3. Test inventory CRUD endpoints
4. Test purchase → stock increase → sales → stock decrease flow
5. Test negative stock prevention

### Manual (browser)
1. Open `frontend/index.html` in browser
2. Login with test credentials
3. Navigate all 7 pages
4. Add inventory item, make a purchase, record a sale
5. View stock alerts and reports

### Browser Tool
- Launch browser subagent to visually verify all pages render correctly

---

## Implementation Order
1. `backend/requirements.txt` + `backend/models.py` + `backend/app.py`
2. Shared CSS + Tailwind config in `frontend/css/custom.css`
3. Shared JS utilities (`api.js`, `auth.js`)
4. `frontend/index.html` (login)
5. `frontend/dashboard.html` + `dashboard.js`
6. `frontend/inventory.html` + `inventory.js`
7. `frontend/purchase.html` + `purchase.js`
8. `frontend/sales.html` + `sales.js`
9. `frontend/alerts.html` + `alerts.js`
10. `frontend/reports.html` + `reports.js`
11. `README.md`
12. Seed DB + verify full flow
