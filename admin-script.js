document.addEventListener('DOMContentLoaded', () => {
    
    const loginScreen = document.getElementById('login-screen');
    const dashboardApp = document.getElementById('dashboard-app');
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const views = document.querySelectorAll('.view');
    const refreshBtn = document.getElementById('refresh-bookings');

    // ✅ FIX: Use sessionStorage and always prefix with "Bearer "
    let token = sessionStorage.getItem('dc_admin_token') || null;

    // Helper: always returns correct auth header
    function authHeader() {
        return { 'Authorization': `Bearer ${token}` };
    }

    // Check Auth on Load
    if (token) {
        showDashboard();
    }

    // Login Handler
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const btn = loginForm.querySelector('button');
        
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
        btn.disabled = true;
        errorMsg.textContent = '';

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();

            if (res.ok) {
                token = data.token;
                // ✅ FIX: Save to sessionStorage (not localStorage)
                sessionStorage.setItem('dc_admin_token', token);
                showDashboard();
            } else {
                errorMsg.textContent = data.error || 'Invalid credentials';
            }
        } catch (err) {
            errorMsg.textContent = 'Server connection error. Try again.';
        } finally {
            btn.innerHTML = 'Login to Dashboard';
            btn.disabled = false;
        }
    });

    // Logout Handler
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('dc_admin_token');
        token = null;
        dashboardApp.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        errorMsg.textContent = '';
    });

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.getAttribute('data-view');
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${targetView}`).classList.add('active');

            const titles = {
                dashboard: 'Dashboard Overview',
                bookings: 'Order Management',
                customers: 'Loyalty Members'
            };
            document.getElementById('page-title').textContent = titles[targetView] || targetView;

            if (targetView === 'dashboard') fetchDashboardData();
            if (targetView === 'bookings') fetchAllBookings();
            if (targetView === 'customers') fetchLoyaltyMembers();
        });
    });

    if (refreshBtn) refreshBtn.addEventListener('click', fetchAllBookings);

    function showDashboard() {
        loginScreen.classList.add('hidden');
        dashboardApp.classList.remove('hidden');
        fetchDashboardData();
    }

    // ✅ FIX: All fetches now use authHeader() which adds "Bearer " prefix
    async function fetchDashboardData() {
        try {
            const res = await fetch('/api/admin/dashboard', {
                headers: authHeader()
            });

            // ✅ FIX: If 401, clear token and show login (don't auto-click logout)
            if (res.status === 401) {
                sessionStorage.removeItem('dc_admin_token');
                token = null;
                dashboardApp.classList.add('hidden');
                loginScreen.classList.remove('hidden');
                errorMsg.textContent = 'Session expired. Please login again.';
                return;
            }

            const data = await res.json();
            document.getElementById('stat-total-bookings').textContent = data.totalBookings || '0';
            document.getElementById('stat-pending').textContent = data.pendingBookings || '0';
            document.getElementById('stat-loyalty').textContent = data.totalLoyalty || '0';

            // Load recent bookings for dashboard view
            const bRes = await fetch('/api/admin/bookings', { headers: authHeader() });
            const bookings = await bRes.json();
            
            const tbody = document.getElementById('recent-bookings-list');
            tbody.innerHTML = '';
            
            if (!bookings.length) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No bookings yet. Share your site!</td></tr>';
                return;
            }

            bookings.slice(0, 5).forEach(b => {
                const statusClass = `status-${b.status.toLowerCase()}`;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="id-tag">#${b.id.toString().padStart(4, '0')}</td>
                    <td><b>${b.full_name}</b></td>
                    <td>${(b.services || '').substring(0, 30)}${b.services && b.services.length > 30 ? '...' : ''}</td>
                    <td>${new Date(b.created_at).toLocaleDateString('en-NG')}</td>
                    <td><span class="status-pill ${statusClass}">${b.status}</span></td>
                `;
                tbody.appendChild(tr);
            });

        } catch (err) {
            console.error('Dashboard fetch error:', err);
        }
    }

    async function fetchAllBookings() {
        const btn = document.getElementById('refresh-bookings');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
        
        try {
            const res = await fetch('/api/admin/bookings', {
                headers: authHeader()
            });

            if (res.status === 401) {
                sessionStorage.removeItem('dc_admin_token');
                token = null;
                dashboardApp.classList.add('hidden');
                loginScreen.classList.remove('hidden');
                return;
            }

            const bookings = await res.json();
            const tbody = document.getElementById('all-bookings-list');
            tbody.innerHTML = '';
            
            if (!bookings.length) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No bookings yet.</td></tr>';
                return;
            }

            bookings.forEach(b => {
                const tr = document.createElement('tr');
                const phoneClean = (b.phone || '').replace(/[^0-9]/g, '').slice(-10);
                tr.innerHTML = `
                    <td>
                        <div class="id-tag">#${b.id.toString().padStart(4, '0')}</div>
                        <div class="time-tag">${new Date(b.created_at).toLocaleString('en-NG')}</div>
                    </td>
                    <td>
                        <b>${b.full_name}</b><br>
                        <a href="https://wa.me/234${phoneClean}" target="_blank" style="color:#25d366; font-size:0.85rem;">
                           <i class="fa-brands fa-whatsapp"></i> ${b.phone}
                        </a>
                    </td>
                    <td>
                        <div style="font-weight:600; margin-bottom:4px;">${b.services || '-'}</div>
                        <small style="color:#888;">${b.pickup_date || ''} | ${b.time_slot || ''}</small>
                    </td>
                    <td>
                        <div>${b.address || '-'}</div>
                        <small style="color:#888;">Notes: ${b.notes || 'None'}</small>
                    </td>
                    <td>
                        <select class="status-select" data-id="${b.id}" data-name="${b.full_name}" data-phone="${b.phone}">
                            <option value="Pending"    ${b.status==='Pending'    ?'selected':''}>⏳ Pending</option>
                            <option value="Processing" ${b.status==='Processing' ?'selected':''}>🔄 Processing</option>
                            <option value="Ready"      ${b.status==='Ready'      ?'selected':''}>✅ Ready</option>
                            <option value="Delivered"  ${b.status==='Delivered'  ?'selected':''}>🚀 Delivered</option>
                            <option value="Cancelled"  ${b.status==='Cancelled'  ?'selected':''}>❌ Cancelled</option>
                        </select>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            attachStatusListeners();

        } catch (err) {
            console.error('Bookings fetch error:', err);
        } finally {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Refresh List';
        }
    }

    async function fetchLoyaltyMembers() {
        const tbody = document.getElementById('loyalty-list');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
        try {
            const res = await fetch('/api/admin/dashboard', { headers: authHeader() });
            const data = await res.json();
            const count = parseInt(data.totalLoyalty) || 0;
            
            tbody.innerHTML = count > 0
                ? `<tr><td colspan="4" class="text-center" style="padding:30px;">
                    <div style="font-size:2rem;margin-bottom:10px;">🎉</div>
                    <strong>${count} loyalty member${count > 1 ? 's' : ''}</strong> signed up via your landing page.
                   </td></tr>`
                : '<tr><td colspan="4" class="text-center">No members yet. Share your site to get signups!</td></tr>';
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading members.</td></tr>';
        }
    }

    function attachStatusListeners() {
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const name = e.target.getAttribute('data-name');
                const phone = e.target.getAttribute('data-phone');
                const newStatus = e.target.value.replace(/[^a-zA-Z]/g, ''); // strip emoji
                
                try {
                    const res = await fetch(`/api/admin/bookings/${id}/status`, {
                        method: 'PUT',
                        headers: { 
                            'Content-Type': 'application/json', 
                            ...authHeader()
                        },
                        body: JSON.stringify({ status: newStatus })
                    });

                    if (res.ok) {
                        if (confirm(`✅ Status updated to "${newStatus}".\n\nSend WhatsApp notification to ${name}?`)) {
                            const msg = encodeURIComponent(`Hi ${name}! 👋\n\nYour Daily Clean order #${id.toString().padStart(4,'0')} status is now: *${newStatus.toUpperCase()}*\n\nThank you for choosing Daily Clean! 🧺✨`);
                            const phoneClean = (phone || '').replace(/[^0-9]/g, '').slice(-10);
                            window.open(`https://wa.me/234${phoneClean}?text=${msg}`, '_blank');
                        }
                    } else {
                        alert('Update failed. Please try again.');
                        fetchAllBookings();
                    }
                } catch(err) {
                    alert('Connection error. Check your internet.');
                    fetchAllBookings();
                }
            });
        });
    }
});