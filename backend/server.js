const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security Guardrails Pipeline
app.use(helmet({
    contentSecurityPolicy: false // Deactivated CSP natively to allow local static script linking without strict nonces
}));

// Global Rate Limiter to deter brute force parsing
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 300, // Strict cutoff after 300 requests
    message: { status: "error", message: "Too many requests from this IP. Firewall locked for 15 minutes." }
});
app.use(limiter);

// General Middleware
app.use(cors());
app.use(express.json());

// Legacy Routes without /api prefix
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);

// Strict API routes
const inventoryRoutes = require('./routes/inventory');
const transactionsRoutes = require('./routes/transactions');
const reportsRoutes = require('./routes/reports');
const orderRoutes = require('./routes/orders');

app.use('/api', inventoryRoutes);
app.use('/api', transactionsRoutes);
app.use('/api', reportsRoutes);
app.use('/api', orderRoutes);

// Static Frontend Bridging
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/static', express.static(path.join(__dirname, '../frontend')));

const servePage = (folder) => (req, res) => {
    res.sendFile(path.join(__dirname, `../frontend/${folder}/index.html`));
};

app.get('/admin-dashboard', servePage('admin-dashboard'));
app.get('/user-dashboard',   servePage('user-dashboard'));
app.get('/inventory', servePage('inventory'));
app.get('/sales', servePage('sales'));
app.get('/purchase', servePage('purchase'));
app.get('/reports', servePage('reports'));
app.get('/alerts',    servePage('alerts'));
app.get('/profile',   servePage('profile'));
app.get('/users',     servePage('users'));
app.get('/orders',    servePage('orders'));
app.get('/signup',    servePage('signup'));

// Serve main login portal and graceful fallback redirect for obsolete /dashboard
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

// API explicit fallback for missing routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ status: "error", message: "API Endpoint not found." });
});

// Database & Server Binding
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aerocurator_inventory';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB deeply connected.');
        app.listen(PORT, () => {
            console.log(`AeroCurator Native Backend securely mapped to port: ${PORT}`);
        });
    })
    .catch(err => console.error('MongoDB sync failure:', err));
