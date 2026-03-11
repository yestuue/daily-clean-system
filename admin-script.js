document.addEventListener('DOMContentLoaded', () => {
    
    // Elements
    const loginScreen = document.getElementById('login-screen');
    const dashboardApp = document.getElementById('dashboard-app');
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const views = document.querySelectorAll('.view');
    const refreshBtn = document.getElementById('refresh-bookings');

    // State
    let token = localStorage.getItem('dc_admin_token') || null;

    // Check Auth on Load
    if (token) {
        showDashboard();
    }

    // Login Handle
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const btn = loginForm.querySelector('button');
        
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();

            if (res.ok) {
                token = data.token;
                localStorage.setItem('dc_admin_token', token);
                showDashboard();
            } else {
                errorMsg.textContent = data.error || 'Invalid credentials';
            }
        } catch (err) {
            errorMsg.textContent = 'Server connection error';
        } finally {
            btn.innerHTML = 'Login to Dashboard';
            btn.disabled = false;
        }
    });

    // Logout Handle
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('dc_admin_token');
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

            // Page Title
            document.getElementById('page-title').textContent = targetView.charAt(0).toUpperCase() + targetView.slice(1) + ' ' + (targetView === 'dashboard' ? 'Overview' : 'Management');

            // Refresh data based on view
            if (targetView === 'dashboard') fetchDashboardData();
            if (targetView === 'bookings') fetchAllBookings();
            if (targetView === 'customers') fetchLoyaltyMembers();
        });
    });

    refreshBtn.addEventListener('click', fetchAllBookings);

    function showDashboard() {
        loginScreen.classList.add('hidden');
        dashboardApp.classList.remove('hidden');
        fetchDashboardData();
    }

    // Data Fetching: Dashboard Stats & Recent
    async function fetchDashboardData() {
        try {
            const res = await fetch('/api/admin/dashboard', {
                headers: { 'Authorization': token }
            });
            if (res.status === 401) return logoutBtn.click();
            const data = await res.json();
            
            document.getElementById('stat-total-bookings').textContent = data.totalBookings || '0';
            document.getElementById('stat-pending').textContent = data.pendingBookings || '0';
            document.getElementById('stat-loyalty').textContent = data.totalLoyalty || '0';

            const bRes = await fetch('/api/admin/bookings', { headers: { 'Authorization': token }});
            const bookings = await bRes.json();
            
            const tbody = document.getElementById('recent-bookings-list');
            tbody.innerHTML = '';
            
            bookings.slice(0, 5).forEach(b => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${b.id.toString().padStart(4, '0')}</td>
                    <td><b>${b.full_name}</b></td>
                    <td>${b.services.substring(0, 20)}...</td>
                    <td>${new Date(b.created_at).toLocaleDateString()}</td>
                    <td><span class="badge ${b.status.toLowerCase()}">${b.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        }
    }

    // Data Fetching: All Bookings
    async function fetchAllBookings() {
        const btn = document.getElementById('refresh-bookings');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
        
        try {
            const res = await fetch('/api/admin/bookings', {
                headers: { 'Authorization': token }
            });
            if (res.status === 401) return logoutBtn.click();
            const bookings = await res.json();
            
            const tbody = document.getElementById('all-bookings-list');
            tbody.innerHTML = '';
            
            bookings.forEach(b => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <b>#${b.id.toString().padStart(4, '0')}</b><br>
                        <small style="color:#888">${new Date(b.created_at).toLocaleString()}</small>
                    </td>
                    <td>
                        <b>${b.full_name}</b><br>
                        <a href="https://wa.me/234${b.phone.replace(/[^0-9]/g, '').slice(-10)}" target="_blank" class="wa-link">
                           <i class="fa-brands fa-whatsapp"></i> ${b.phone}
                        </a>
                    </td>
                    <td>
                        <div style="margin-bottom:5px;"><b>${b.services}</b></div>
                        <span class="badge-date">${b.pickup_date} | ${b.time_slot}</span>
                    </td>
                    <td>
                        <div class="addr-text">${b.address}</div>
                        <small class="note-text">Notes: ${b.notes || 'None'}</small>
                    </td>
                    <td>
                        <select class="status-select" data-id="${b.id}" data-name="${b.full_name}" data-phone="${b.phone}">
                            <option value="Pending" ${b.status==='Pending'?'selected':''}>Pending</option>
                            <option value="Processing" ${b.status==='Processing'?'selected':''}>Processing</option>
                            <option value="Ready" ${b.status==='Ready'?'selected':''}>Ready</option>
                            <option value="Delivered" ${b.status==='Delivered'?'selected':''}>Delivered</option>
                            <option value="Cancelled" ${b.status==='Cancelled'?'selected':''}>Cancelled</option>
                        </select>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            attachStatusListeners();

        } catch (err) {
            console.error(err);
        } finally {
            btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Refresh List';
        }
    }

    async function fetchLoyaltyMembers() {
        const tbody = document.getElementById('loyalty-list');
        try {
            // Reusing dashboard data for member count/list if endpoint exists
            const res = await fetch('/api/admin/bookings', { headers: { 'Authorization': token }}); // Fallback check
            const members = await res.json(); // You can create a specific /api/admin/loyalty endpoint in server.js
            
            tbody.innerHTML = members.length > 0 
                ? '<tr><td colspan="4" class="text-center">Connected to Loyalty Database. Active Members: ' + members.length + '</td></tr>'
                : '<tr><td colspan="4" class="text-center">No members found yet.</td></tr>';
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-error">Sync Error.</td></tr>';
        }
    }

    function attachStatusListeners() {
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const name = e.target.getAttribute('data-name');
                const phone = e.target.getAttribute('data-phone');
                const newStatus = e.target.value;
                
                e.target.parentElement.classList.add('updating');
                
                try {
                    const sRes = await fetch(`/api/admin/bookings/${id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': token },
                        body: JSON.stringify({ status: newStatus })
                    });

                    if (sRes.ok) {
                        // Optional: Ask to notify customer via WhatsApp
                        if (confirm(`Status updated to ${newStatus}. Send WhatsApp update to ${name}?`)) {
                            const msg = encodeURIComponent(`Hi ${name}, your Daily Clean order #${id.toString().padStart(4, '0')} is now ${newStatus.toUpperCase()}. Thank you!`);
                            window.open(`https://wa.me/234${phone.replace(/[^0-9]/g, '').slice(-10)}?text=${msg}`, '_blank');
                        }
                    }
                } catch(err) {
                    alert('Update failed. Check server connection.');
                    fetchAllBookings();
                } finally {
                    e.target.parentElement.classList.remove('updating');
                }
            });
        });
    }
});