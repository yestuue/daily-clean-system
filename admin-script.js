document.addEventListener('DOMContentLoaded', () => {

    const loginScreen = document.getElementById('login-screen');
    const dashboardApp = document.getElementById('dashboard-app');
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const views = document.querySelectorAll('.view');
    const refreshBtn = document.getElementById('refresh-bookings');

    let token = sessionStorage.getItem('dc_admin_token') || null;
    let allBookings = [];

    // ── POLLING STATE ─────────────────────────────────────────────────────────
    let pollInterval = null;
    let activeView = 'dashboard';
    const POLL_INTERVAL_MS = 30000; // 30 seconds

    function startPolling() {
        stopPolling();
        pollInterval = setInterval(() => {
            if (activeView === 'dashboard') fetchDashboardData(true);
            if (activeView === 'bookings')  fetchAllBookings(true);
        }, POLL_INTERVAL_MS);
    }

    function stopPolling() {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    }
    // ─────────────────────────────────────────────────────────────────────────

    function authHeader() {
    return { 'Authorization': `Bearer ${token}` };
}

    const todayEl = document.getElementById('today-date');
    if (todayEl) todayEl.textContent = new Date().toLocaleDateString('en-NG', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    if (token) showDashboard();

    // LOGIN
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

    // LOGOUT — stop polling before clearing session
    logoutBtn.addEventListener('click', () => {
        stopPolling(); // ← stop auto-refresh on logout
        sessionStorage.removeItem('dc_admin_token');
        token = null;
        dashboardApp.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        errorMsg.textContent = '';
    });

    // NAV
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.getAttribute('data-view'));
        });
    });

    window.switchView = function(targetView) {
        activeView = targetView; // ← track which view is visible
        startPolling();          // ← restart poll timer on every view switch

        navLinks.forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-view="${targetView}"]`)?.classList.add('active');
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${targetView}`)?.classList.add('active');
        const titles = { dashboard:'Dashboard Overview', bookings:'Order Management', customers:'Loyalty Members', analytics:'Analytics', messages:'Quick Messages', settings:'Settings' };
        document.getElementById('page-title').textContent = titles[targetView] || targetView;
        if (targetView === 'dashboard') fetchDashboardData();
        if (targetView === 'bookings') fetchAllBookings();
        if (targetView === 'customers') fetchLoyaltyMembers();
        if (targetView === 'analytics') fetchAnalytics();
        if (targetView === 'messages') fetchQuickMessages();
    };

    if (refreshBtn) refreshBtn.addEventListener('click', () => fetchAllBookings());

    const searchInput = document.getElementById('search-bookings');
    const filterStatus = document.getElementById('filter-status');
    if (searchInput) searchInput.addEventListener('input', filterBookings);
    if (filterStatus) filterStatus.addEventListener('change', filterBookings);

    function showDashboard() {
        loginScreen.classList.add('hidden');
        dashboardApp.classList.remove('hidden');
        fetchDashboardData();
        startPolling(); // ← begin polling immediately on login
    }

    function handleUnauth() {
        stopPolling(); // ← also stop polling on session expiry
        sessionStorage.removeItem('dc_admin_token');
        token = null;
        dashboardApp.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        errorMsg.textContent = 'Session expired. Please login again.';
    }

    // DASHBOARD
    // silent=true means it was triggered by the poll, not a user action
    async function fetchDashboardData(silent = false) {
        try {
            const res = await fetch('/api/admin/dashboard', { headers: authHeader() });
            if (res.status === 401) return handleUnauth();
            const data = await res.json();
            document.getElementById('stat-total-bookings').textContent = data.totalBookings || '0';
            document.getElementById('stat-pending').textContent = data.pendingBookings || '0';
            document.getElementById('stat-loyalty').textContent = data.totalLoyalty || '0';

            const bRes = await fetch('/api/admin/bookings', { headers: authHeader() });
            const bookings = await bRes.json();

            // ── NEW ORDER DETECTION ───────────────────────────────────────────
            if (silent && bookings.length > allBookings.length) {
                flashNewOrderAlert(bookings.length - allBookings.length);
            }
            // ─────────────────────────────────────────────────────────────────

            allBookings = bookings;

            const today = new Date().toISOString().split('T')[0];
            const completedToday = bookings.filter(b => b.status === 'Delivered' && b.created_at?.startsWith(today)).length;
            document.getElementById('stat-completed').textContent = completedToday;

            const tbody = document.getElementById('recent-bookings-list');
            tbody.innerHTML = '';
            if (!bookings.length) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No bookings yet. Share your site!</td></tr>';
            } else {
                bookings.slice(0,5).forEach(b => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="id-tag">#${String(b.id).padStart(4,'0')}</td>
                        <td><b>${b.full_name}</b></td>
                        <td>${(b.services||'').substring(0,30)}${b.services?.length>30?'...':''}</td>
                        <td>${new Date(b.created_at).toLocaleDateString('en-NG')}</td>
                        <td><span class="status-pill status-${b.status?.toLowerCase()}">${b.status}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            const pickupsDiv = document.getElementById('todays-pickups');
            const todayPickups = bookings.filter(b => b.pickup_date === today || b.pickup_date?.startsWith(today));
            if (!todayPickups.length) {
                pickupsDiv.innerHTML = '<div class="empty-state">No pickups scheduled for today.</div>';
            } else {
                pickupsDiv.innerHTML = todayPickups.map(b => `
                    <div class="pickup-item">
                        <div>
                            <div class="pickup-name">${b.full_name}</div>
                            <div class="pickup-time">${b.time_slot||''}</div>
                        </div>
                        <span class="pickup-service">${(b.services||'').split(',')[0]}</span>
                    </div>
                `).join('');
            }
        } catch (err) { console.error('Dashboard error:', err); }
    }

    // ALL BOOKINGS
    // silent=true suppresses the spinner (used during background polling)
    async function fetchAllBookings(silent = false) {
        const btn = document.getElementById('refresh-bookings');
        if (!silent && btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
        try {
            const res = await fetch('/api/admin/bookings', { headers: authHeader() });
            if (res.status === 401) return handleUnauth();
            const fresh = await res.json();

            // ── NEW ORDER DETECTION ───────────────────────────────────────────
            if (silent && fresh.length > allBookings.length) {
                flashNewOrderAlert(fresh.length - allBookings.length);
            }
            // ─────────────────────────────────────────────────────────────────

            allBookings = fresh;
            renderBookings(allBookings);
        } catch (err) { console.error('Bookings error:', err); }
        finally {
            if (!silent && btn) btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Refresh';
        }
    }

    // ── NEW ORDER FLASH ALERT ─────────────────────────────────────────────────
    function flashNewOrderAlert(count) {
        // Flash the refresh button green
        const btn = document.getElementById('refresh-bookings');
        if (btn) {
            btn.style.background = '#10B981';
            btn.style.color = '#fff';
            setTimeout(() => { btn.style.background = ''; btn.style.color = ''; }, 2000);
        }

        // Show a non-blocking toast notification
        const existing = document.getElementById('new-order-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'new-order-toast';
        toast.innerHTML = `<i class="fa-solid fa-bell"></i> ${count} new order${count > 1 ? 's' : ''} received!`;
        Object.assign(toast.style, {
            position: 'fixed', bottom: '30px', right: '30px',
            background: '#10B981', color: '#fff',
            padding: '14px 24px', borderRadius: '50px',
            fontFamily: 'Poppins, sans-serif', fontWeight: '600',
            fontSize: '0.95rem', boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            zIndex: '99999', display: 'flex', alignItems: 'center', gap: '10px',
            animation: 'slideInToast 0.4s ease'
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);

        // Inject keyframe once
        if (!document.getElementById('toast-style')) {
            const style = document.createElement('style');
            style.id = 'toast-style';
            style.textContent = `@keyframes slideInToast { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`;
            document.head.appendChild(style);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────

    function renderBookings(bookings) {
        const tbody = document.getElementById('all-bookings-list');
        tbody.innerHTML = '';
        if (!bookings.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No bookings found.</td></tr>';
            return;
        }
        bookings.forEach(b => {
            const tr = document.createElement('tr');
            const phoneClean = (b.phone||'').replace(/[^0-9]/g,'').slice(-10);
            tr.innerHTML = `
                <td>
                    <div class="id-tag">#${String(b.id).padStart(4,'0')}</div>
                    <div class="time-tag">${new Date(b.created_at).toLocaleString('en-NG')}</div>
                </td>
                <td>
                    <div style="font-weight:600">${b.full_name}</div>
                    <a href="https://wa.me/234${phoneClean}" target="_blank" style="color:#25d366;font-size:0.82rem;display:flex;align-items:center;gap:4px;margin-top:3px;">
                        <i class="fa-brands fa-whatsapp"></i> ${b.phone}
                    </a>
                </td>
                <td>
                    <div style="font-weight:600;margin-bottom:4px;">${b.services||'-'}</div>
                    <small style="color:#888;">${b.pickup_date||''} | ${b.time_slot||''}</small>
                </td>
                <td>
                    <div>${b.address||'-'}</div>
                    <small style="color:#aaa;">Notes: ${b.notes||'None'}</small>
                </td>
                <td>
                    <select class="status-select" data-id="${b.id}" data-name="${b.full_name}" data-phone="${b.phone}">
                        <option value="Pending"    ${b.status==='Pending'   ?'selected':''}>⏳ Pending</option>
                        <option value="Processing" ${b.status==='Processing'?'selected':''}>🔄 Processing</option>
                        <option value="Ready"      ${b.status==='Ready'     ?'selected':''}>✅ Ready</option>
                        <option value="Delivered"  ${b.status==='Delivered' ?'selected':''}>🚀 Delivered</option>
                        <option value="Cancelled"  ${b.status==='Cancelled' ?'selected':''}>❌ Cancelled</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });
        attachStatusListeners();
    }

    function filterBookings() {
        const search = (document.getElementById('search-bookings')?.value||'').toLowerCase();
        const status = document.getElementById('filter-status')?.value||'';
        const filtered = allBookings.filter(b => {
            const matchSearch = !search || b.full_name?.toLowerCase().includes(search) || String(b.id).includes(search) || b.phone?.includes(search);
            const matchStatus = !status || b.status === status;
            return matchSearch && matchStatus;
        });
        renderBookings(filtered);
    }

    // LOYALTY
    async function fetchLoyaltyMembers() {
        const tbody = document.getElementById('loyalty-list');
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Loading...</td></tr>';
        try {
            const res = await fetch('/api/admin/dashboard', { headers: authHeader() });
            const data = await res.json();
            const count = parseInt(data.totalLoyalty)||0;
            tbody.innerHTML = count > 0
                ? `<tr><td colspan="4" class="empty-state">🎉 <strong>${count} loyalty member${count>1?'s':''}</strong> signed up via your landing page.</td></tr>`
                : '<tr><td colspan="4" class="empty-state">No members yet. Share your site!</td></tr>';
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Error loading.</td></tr>';
        }
    }

    // ANALYTICS
    async function fetchAnalytics() {
        try {
            const res = await fetch('/api/admin/bookings', { headers: authHeader() });
            const bookings = await res.json();
            document.getElementById('ana-total').textContent = bookings.length;
            document.getElementById('ana-delivered').textContent = bookings.filter(b=>b.status==='Delivered').length;
            document.getElementById('ana-processing').textContent = bookings.filter(b=>b.status==='Processing'||b.status==='Ready').length;
            document.getElementById('ana-cancelled').textContent = bookings.filter(b=>b.status==='Cancelled').length;

            const serviceCounts = {};
            bookings.forEach(b => {
                (b.services||'').split(',').forEach(s => {
                    const key = s.trim();
                    if (key) serviceCounts[key] = (serviceCounts[key]||0)+1;
                });
            });
            const total = Object.values(serviceCounts).reduce((a,b)=>a+b,0)||1;
            document.getElementById('services-breakdown').innerHTML = Object.entries(serviceCounts)
                .sort((a,b)=>b[1]-a[1])
                .map(([name,count])=>`
                    <div class="service-bar-item">
                        <div class="service-bar-label"><span>${name}</span><span>${count} order${count>1?'s':''}</span></div>
                        <div class="service-bar-track"><div class="service-bar-fill" style="width:${Math.round((count/total)*100)}%"></div></div>
                    </div>
                `).join('') || '<p style="color:#aaa;padding:20px;">No data yet.</p>';

            document.getElementById('booking-timeline').innerHTML = bookings.slice(0,8).map(b=>`
                <div class="timeline-entry">
                    <div class="tl-dot"></div>
                    <div class="tl-content">
                        <div class="tl-name">${b.full_name} — ${b.services}</div>
                        <div class="tl-detail">${new Date(b.created_at).toLocaleString('en-NG')} · <span class="status-pill status-${b.status?.toLowerCase()}">${b.status}</span></div>
                    </div>
                </div>
            `).join('') || '<p style="color:#aaa;">No bookings yet.</p>';
        } catch (err) { console.error('Analytics error:', err); }
    }

    // QUICK MESSAGES
    async function fetchQuickMessages() {
        try {
            const res = await fetch('/api/admin/bookings', { headers: authHeader() });
            const bookings = await res.json();
            const list = document.getElementById('quick-msg-list');
            if (!list) return;
            list.innerHTML = bookings.slice(0,10).map(b => {
                const phoneClean = (b.phone||'').replace(/[^0-9]/g,'').slice(-10);
                return `
                    <div class="quick-msg-customer">
                        <div>
                            <div class="qm-name">#${String(b.id).padStart(4,'0')} — ${b.full_name}</div>
                            <div class="qm-phone">${b.phone} · ${b.status}</div>
                        </div>
                        <button class="btn-qm-wa" onclick="prefillMessage('${b.full_name}','234${phoneClean}')">
                            <i class="fa-brands fa-whatsapp"></i> Message
                        </button>
                    </div>
                `;
            }).join('') || '<p style="color:#aaa;">No bookings yet.</p>';
        } catch (err) {}
    }

    // STATUS UPDATE
    function attachStatusListeners() {
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const name = e.target.getAttribute('data-name');
                const phone = e.target.getAttribute('data-phone');
                const newStatus = e.target.value; // clean value — regex removed, not needed
                try {
                    const res = await fetch(`/api/admin/bookings/${id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type':'application/json', ...authHeader() },
                        body: JSON.stringify({ status: newStatus })
                    });
                    if (res.ok) {
                        if (confirm(`✅ Status updated to "${newStatus}".\n\nSend WhatsApp update to ${name}?`)) {
                            const phoneClean = (phone||'').replace(/[^0-9]/g,'').slice(-10);
                            const msg = encodeURIComponent(`Hi ${name}! 👋\n\nYour Daily Clean order #${String(id).padStart(4,'0')} is now *${newStatus.toUpperCase()}*.\n\nThank you for choosing Daily Clean! 🧺✨`);
                            window.open(`https://wa.me/234${phoneClean}?text=${msg}`, '_blank');
                        }
                    } else { alert('Update failed.'); fetchAllBookings(); }
                } catch (err) { alert('Connection error.'); fetchAllBookings(); }
            });
        });
    }

    // EXPORT CSV
    window.exportBookings = function() {
        if (!allBookings.length) { alert('No bookings to export.'); return; }
        const headers = ['ID','Name','Phone','Services','Date','Time Slot','Address','Notes','Status','Created'];
        const rows = allBookings.map(b => [
            `#${String(b.id).padStart(4,'0')}`, b.full_name, b.phone, b.services,
            b.pickup_date, b.time_slot, b.address, b.notes||'', b.status,
            new Date(b.created_at).toLocaleString('en-NG')
        ]);
        const csv = [headers,...rows].map(r=>r.map(v=>`"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csv],{type:'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `dailyclean-bookings-${new Date().toISOString().split('T')[0]}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    window.exportLoyalty = function() { alert('Loyalty export — coming soon!'); };

    window.sendBroadcast = function() {
        const msg = encodeURIComponent(`🧺 *Daily Clean Special Offer!*\n\nBook your laundry pickup today and get FREE delivery!\n\n📍 No 33 Ayodele Street, Ikate Surulere\n📞 07084588119\n🌐 https://daily-clean-system.onrender.com`);
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    };

    window.setTemplate = function(type) {
        const name = document.getElementById('msg-name')?.value || 'Customer';
        const templates = {
            ready: `Hi ${name}! 🎉\n\nYour laundry is ready for delivery!\n\nWe'll be at your doorstep soon 🚗\n\n— Daily Clean Team 🧺`,
            pickup: `Hi ${name}! 🏍️\n\nOur rider is on the way to pick up your laundry!\n\nPlease have your items ready.\n\n— Daily Clean Team 🧺`,
            delivered: `Hi ${name}! ✅\n\nYour laundry has been delivered — clean, fresh & perfectly folded! 🌟\n\nThank you for choosing Daily Clean!\n\n— Daily Clean Team 🧺`,
            delay: `Hi ${name}! ⏰\n\nWe apologize for the slight delay. We're working hard to get your order to you ASAP.\n\nThank you for your patience!\n\n— Daily Clean Team 🧺`,
            promo: `Hi ${name}! 🎊\n\n*SPECIAL OFFER!*\n\nGet 20% OFF your next order this week!\n\nBook: https://daily-clean-system.onrender.com\n\n— Daily Clean Team 🧺`,
            custom: ''
        };
        const textarea = document.getElementById('msg-body');
        if (textarea) textarea.value = templates[type]||'';
    };

    window.sendWhatsApp = function() {
        const phone = (document.getElementById('msg-phone')?.value||'').replace(/[^0-9]/g,'');
        const body = document.getElementById('msg-body')?.value;
        if (!phone) { alert('Please enter a phone number.'); return; }
        if (!body) { alert('Please enter or select a message.'); return; }
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, '_blank');
    };

    window.prefillMessage = function(name, phone) {
        switchView('messages');
        setTimeout(() => {
            document.getElementById('msg-name').value = name;
            document.getElementById('msg-phone').value = phone;
            setTemplate('ready');
        }, 100);
    };
});