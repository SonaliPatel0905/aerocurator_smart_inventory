document.addEventListener('DOMContentLoaded', () => {
    
    // --- Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('page-title');
    
    // Explicit map for page titles
    const titles = {
        'dashboard': 'Dashboard Overview',
        'inventory': 'Inventory Management',
        'purchase': 'Purchase Orders',
        'sales': 'Sales Management',
        'alerts': 'Stock Alerts & Warnings',
        'reports': 'Analytics & Reports',
        'settings': 'System Settings'
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            
            // Handle Login modal separately
            if(targetId === 'login') {
                document.getElementById('login-modal').classList.add('show');
                return;
            }
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');
            
            // Change Page Title
            if(titles[targetId]) {
                pageTitle.textContent = titles[targetId];
            }
            
            // Hide all views
            views.forEach(view => {
                view.classList.remove('active-view');
            });
            
            // Show target view
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.classList.add('active-view');
            }
        });
    });

    // --- Modal Logic ---
    const loginModal = document.getElementById('login-modal');
    const closeLogin = document.getElementById('close-login');
    const signInBtn = document.getElementById('sign-in-btn');
    
    if (closeLogin) {
        closeLogin.addEventListener('click', () => {
            loginModal.classList.remove('show');
        });
    }
    
    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            loginModal.classList.remove('show');
            // Fake login feedback
            alert('Signed in successfully!');
        });
    }
    
    // Close modal if clicked outside
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.remove('show');
        }
    });

    // --- Chart.js Initialization ---
    
    // 1. Inventory Chart (Bar)
    const invCtx = document.getElementById('inventoryChart');
    if (invCtx) {
        new Chart(invCtx, {
            type: 'bar',
            data: {
                labels: ['Motors', 'Batteries', 'ESCs', 'Propellers', 'Sensors', 'Frames'],
                datasets: [{
                    label: 'Stock Quantity',
                    data: [142, 45, 65, 320, 24, 15],
                    backgroundColor: 'rgba(37, 99, 235, 0.8)', // Primary blue
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#334155'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // 2. Sales Trend Chart (Line)
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                datasets: [{
                    label: 'Revenue ($)',
                    data: [12500, 15000, 14200, 18500, 22000, 34200],
                    borderColor: '#10b981', // Success green
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4, // Smooth curve
                    fill: true,
                    pointBackgroundColor: '#1e293b',
                    pointBorderColor: '#10b981',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#334155'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // 3. Profit Margin Chart (Line in Reports)
    const profitCtx = document.getElementById('profitChart');
    if (profitCtx) {
        new Chart(profitCtx, {
            type: 'doughnut',
            data: {
                labels: ['Motors', 'Electronics', 'Batteries', 'Accessories'],
                datasets: [{
                    data: [40, 25, 20, 15],
                    backgroundColor: [
                        '#2563eb', // Primary
                        '#8b5cf6', // Purple
                        '#f59e0b', // Warning
                        '#10b981'  // Success
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                },
                cutout: '70%'
            }
        });
    }
});
