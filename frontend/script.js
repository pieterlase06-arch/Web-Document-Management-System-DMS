document.addEventListener('DOMContentLoaded', () => {
    // URL API dinamis: Jika di Vercel, arahkan ke Hugging Face. Jika lokal/HF, gunakan path relatif.
    const API_BASE = window.location.hostname.includes('vercel.app') 
        ? 'https://pieterlase-dms-app.hf.space/api' 
        : '/api';

    // --- Authentication Logic ---
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    const loginForm = document.getElementById('loginForm');

    const checkAuth = () => {
        const userStr = localStorage.getItem('dms_user');
        if (!userStr) {
            if (loginScreen) loginScreen.style.display = 'flex';
            if (appContainer) appContainer.style.display = 'none';
            return;
        }

        const user = JSON.parse(userStr);
        if (loginScreen) loginScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';

        // Update profile in sidebar
        const userNameEl = document.querySelector('.sidebar-user h4');
        const userRoleEl = document.querySelector('.sidebar-user .role');
        const userDeptEl = document.querySelector('.sidebar-user .dept');
        
        if (userNameEl) userNameEl.textContent = user.name;
        if (userRoleEl) userRoleEl.textContent = user.role;
        // Kita belum punya nama departemen di user object, bisa ditambahkan nanti
        
        // RBAC: Show/Hide Admin menus
        const adminElements = document.querySelectorAll('.admin-only');
        const isAdmin = user.role && user.role.toLowerCase() === 'admin';
        adminElements.forEach(el => {
            el.style.display = isAdmin ? 'block' : 'none';
        });

        init();
    }

    const fetchActivities = async () => {
        try {
            const res = await fetch(`${API_BASE}/activities`);
            const data = await res.json();
            const container = document.getElementById('auditTableBody');
            if (container) {
                container.innerHTML = data.map(act => `
                    <tr>
                        <td><span class="badge ${act.type || 'info'}">${act.type || 'log'}</span></td>
                        <td><strong>${act.user_name}</strong></td>
                        <td>${act.action}</td>
                        <td>${act.document_title || '-'}</td>
                        <td>${new Date(act.timestamp).toLocaleString('id-ID')}</td>
                    </tr>
                `).join('') || '<tr><td colspan="5" style="text-align:center;">Belum ada aktivitas.</td></tr>';
            }
        } catch (err) { console.error('Error fetching activities:', err); }
    }

    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('dms_user', JSON.stringify(data.user));
                    checkAuth();
                } else {
                    alert('Login Gagal: ' + (data.error || 'Username/Password salah'));
                }
            } catch (err) {
                console.error('Login error:', err);
                alert('Gagal menghubungi server. Pastikan koneksi internet aktif.');
            }
        };
    }

    window.logout = () => {
        localStorage.removeItem('dms_user');
        window.location.reload();
    };

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.logout();
        });
    }

    checkAuth();

    // --- Initialization ---
    function init() {
        try {
            initTheme();
            updateDate();
            initNavigation();
            refreshData();
        } catch (e) {
            console.error('Initialization error:', e);
        }
    }

    // --- Navigation Logic ---
    function initNavigation() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        sidebar.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (!item) return;

            e.preventDefault();
            e.stopPropagation();

            const sectionId = item.getAttribute('data-section');
            if (!sectionId) return;

            console.log('SPA Navigation Triggered:', sectionId);

            // Special Case: Upload
            if (sectionId === 'upload') {
                const addModal = document.getElementById('addModal');
                if (addModal) addModal.classList.add('active');
                return;
            }

            // Update UI: Sidebar Active State
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update UI: Content Section Visibility
            const sections = document.querySelectorAll('.content-section');
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `section-${sectionId}`) {
                    section.classList.add('active');
                }
            });

            // Trigger Data Fetching/Rendering
            if (sectionId === 'files' || sectionId === 'dashboard') {
                refreshData();
            } else if (sectionId === 'audit') {
                fetchActivities();
            } else if (sectionId === 'review') {
                renderReview();
            } else if (sectionId === 'categories') {
                fetchCategories();
            } else if (sectionId === 'departments') {
                fetchDepartments();
            } else if (sectionId === 'users') {
                fetchUsers();
            }
        });

        // "Tambah Dokumen" from File Manager section
        const addDocBtnFiles = document.getElementById('addDocBtnFiles');
        if (addDocBtnFiles) {
            addDocBtnFiles.onclick = (e) => {
                e.preventDefault();
                const addModal = document.getElementById('addModal');
                if (addModal) addModal.classList.add('active');
            };
        }
    }

    // --- State & Charts ---
    let growthChart, categoryChart;
    let allDocuments = []; // Local cache for filtering
    let currentFilter = { text: '', type: 'all' };

    // --- API Calls ---

    async function fetchStats() {
        try {
            const res = await fetch(`${API_BASE}/stats`);
            const data = await res.json();
            
            document.getElementById('stat-total').textContent = data.total;
            document.getElementById('stat-active').textContent = data.active;
            document.getElementById('stat-draft').textContent = data.draft;
            document.getElementById('stat-archived').textContent = data.archived;

            if (window.Chart) {
                initGrowthChart(); // Static simulation for trend
                initCategoryChart(data.categories);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    }

    async function fetchDocuments() {
        try {
            const res = await fetch(`${API_BASE}/documents`);
            allDocuments = await res.json();
            applyFilters();
        } catch (err) {
            console.error('Error fetching documents:', err);
        }
    }

    async function fetchActivitiesOld() {
        // Redundant, using the consolidated one at the top
    }

    function refreshData() {
        fetchStats();
        fetchDocuments();
        fetchActivities();
        // Background update for others if they are visible
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection) {
            if (activeSection.id === 'section-review') renderReview();
            if (activeSection.id === 'section-categories') fetchCategories();
            if (activeSection.id === 'section-departments') fetchDepartments();
            if (activeSection.id === 'section-users') fetchUsers();
        }
    }

    // --- Rendering & Filtering ---

    function applyFilters() {
        let filtered = allDocuments;

        // Filter by sidebar selection
        if (currentFilter.type !== 'all') {
            if (currentFilter.type === 'Trash') {
                filtered = filtered.filter(d => d.status === 'Archived');
            } else if (currentFilter.type === 'Shared') {
                filtered = filtered.filter(d => d.category === 'Marketing'); // Logic simulation
            } else if (currentFilter.type === 'Storage') {
                filtered = filtered.filter(d => d.status === 'Active');
            }
        }

        // Filter by search text
        if (currentFilter.text) {
            const search = currentFilter.text.toLowerCase();
            filtered = filtered.filter(d => 
                d.title.toLowerCase().includes(search) || 
                d.category.toLowerCase().includes(search)
            );
        }

        renderDocuments(filtered);
    }

    function renderDocuments(docs) {
        const tbody = document.getElementById('documentTableBody');
        tbody.innerHTML = '';
        
        if (docs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">tidak ada dokumen yang ditemukan.</td></tr>';
            return;
        }

        docs.forEach(doc => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${doc.title.toLowerCase()}</strong></td>
                <td><span class="badge-tag">${doc.category.toLowerCase()}</span></td>
                <td><span class="status-${doc.status.toLowerCase()}">${doc.status.toLowerCase()}</span></td>
                <td>${new Date(doc.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="action-group">
                        <button class="icon-btn delete-btn" data-id="${doc.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        <button class="icon-btn" onclick="alert('fitur download segera hadir!')"><i class="fa-solid fa-download"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Event listener for delete
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                deleteDocument(btn.dataset.id);
            };
        });
    }

    function renderActivities(activities) {
        const list = document.getElementById('activityList');
        list.innerHTML = '';
        activities.forEach(act => {
            const li = document.createElement('li');
            li.className = 'activity-item';
            li.innerHTML = `
                <div class="activity-icon"><i class="fa-solid fa-${act.type}"></i></div>
                <div class="activity-content">
                    <p><strong>${act.user_name.toLowerCase()}</strong> ${act.action.toLowerCase()} <strong>${act.document_title.toLowerCase()}</strong></p>
                    <span class="activity-time">${new Date(act.timestamp).toLocaleString()}</span>
                </div>
            `;
            list.appendChild(li);
        });
    }

    // --- Actions ---

    // Modal Add Document
    const addModal = document.getElementById('addModal');
    const addDocBtn = document.getElementById('addDocBtnFiles'); // Fixed ID to match index.html
    const closeModal = document.getElementById('closeModal');
    const addDocForm = document.getElementById('addDocForm');

    if (addDocBtn) addDocBtn.onclick = () => addModal.classList.add('active');
    if (closeModal) closeModal.onclick = () => addModal.classList.remove('active');
    
    // Close modal on background click
    addModal.onclick = (e) => { if (e.target === addModal) addModal.classList.remove('active'); };

    addDocForm.onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('docTitle').value;
        const category = document.getElementById('docCategory').value;
        const status = document.getElementById('docStatus').value;

        try {
            const res = await fetch(`${API_BASE}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, category, status })
            });
            if (res.ok) {
                addDocForm.reset();
                addModal.classList.remove('active');
                refreshData();
            }
        } catch (err) {
            console.error('Error adding document:', err);
            alert('gagal menambah dokumen.');
        }
    };

    async function deleteDocument(id) {
        if (!confirm('apakah anda yakin ingin menghapus dokumen ini?')) return;
        try {
            const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
            if (res.ok) refreshData();
        } catch (err) {
            console.error('Error deleting document:', err);
        }
    }

    // --- Global Search ---
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.oninput = (e) => {
            currentFilter.text = e.target.value;
            applyFilters();
        };
    }


    function renderAudit(activities) {
        const auditList = document.getElementById('auditList');
        if (!auditList) return;
        auditList.innerHTML = '';
        
        activities.forEach(act => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="activity-icon audit"><i class="fa-solid fa-fingerprint"></i></div>
                <div class="activity-details">
                    <p><strong>${act.user_name}</strong> ${act.action.toLowerCase()}: <em>${act.document_title.toLowerCase()}</em></p>
                    <span>${new Date(act.timestamp).toLocaleString('id-ID').toLowerCase()}</span>
                </div>
            `;
            auditList.appendChild(li);
        });
    }

    function renderReview() {
        const reviewTbody = document.getElementById('reviewTableBody');
        if (!reviewTbody) return;
        
        const reviewDocs = allDocuments.filter(d => d.status === 'Draft');
        reviewTbody.innerHTML = '';
        
        if (reviewDocs.length === 0) {
            reviewTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">tidak ada dokumen dalam antrean review.</td></tr>';
            return;
        }

        reviewDocs.forEach(doc => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${doc.title.toLowerCase()}</strong></td>
                <td><span class="badge-tag">${doc.category.toLowerCase()}</span></td>
                <td>${new Date(doc.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-primary btn-sm" onclick="alert('fitur approve segera hadir!')">approve</button>
                        <button class="btn-danger btn-sm" onclick="alert('fitur reject segera hadir!')">reject</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async function fetchCategories() {
        try {
            const res = await fetch(`${API_BASE}/categories`);
            const data = await res.json();
            renderCategories(data);
        } catch (err) { console.error(err); }
    }

    function renderCategories(cats) {
        const container = document.getElementById('categoriesGrid');
        if (!container) return;
        container.innerHTML = '';
        cats.forEach(c => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `<div class="stat-title">kategori</div><div class="stat-value" style="font-size: 20px;">${c.name.toLowerCase()}</div>`;
            container.appendChild(card);
        });
    }

    async function fetchDepartments() {
        try {
            const res = await fetch(`${API_BASE}/departments`);
            const data = await res.json();
            renderDepartments(data);
        } catch (err) { console.error(err); }
    }

    function renderDepartments(depts) {
        const container = document.getElementById('departmentsList');
        if (!container) return;
        container.innerHTML = '';
        depts.forEach(d => {
            const li = document.createElement('div');
            li.className = 'content-card';
            li.style.marginBottom = '10px';
            li.innerHTML = `<strong>${d.name.toLowerCase()}</strong>`;
            container.appendChild(li);
        });
    }

    async function fetchUsers() {
        try {
            const res = await fetch(`${API_BASE}/users`);
            const data = await res.json();
            renderUsers(data);
        } catch (err) { console.error(err); }
    }

    function renderUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        users.forEach(u => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${u.name.toLowerCase()}</strong></td>
                <td>${u.role.toLowerCase()}</td>
                <td>${u.department_name ? u.department_name.toLowerCase() : '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // --- Charts ---

    function initGrowthChart() {
        const ctx = document.getElementById('growthChart').getContext('2d');
        if (growthChart) growthChart.destroy();
        growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['jan', 'feb', 'mar', 'apr', 'mei'],
                datasets: [{
                    label: 'dokumen',
                    data: [12, 19, 3, 5, 2],
                    borderColor: '#b4a7d6',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: '#333' }, ticks: { color: '#888' } },
                    x: { grid: { color: '#333' }, ticks: { color: '#888' } }
                }
            }
        });
    }

    function initCategoryChart(categories) {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        if (categoryChart) categoryChart.destroy();

        const labels = categories.map(c => c.category.toLowerCase());
        const counts = categories.map(c => c.count);
        const colors = ['#b4a7d6', '#a8d5ba', '#f4d381', '#e29596', '#a2c4c9'];

        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: colors.slice(0, counts.length),
                    borderWidth: 2,
                    borderColor: '#121212'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { display: false } }
            }
        });

        // Legend Rendering
        const legend = document.getElementById('categoryLegend');
        legend.innerHTML = '';
        categories.forEach((c, i) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <div class="legend-label">
                    <span class="legend-color" style="background-color: ${colors[i % colors.length]}"></span>
                    <span>${c.category.toLowerCase()}</span>
                </div>
                <div class="legend-value">${c.count}</div>
            `;
            legend.appendChild(item);
        });
    }

    // --- Master Data Management ---

    async function fetchCategories() {
        try {
            const res = await fetch(`${API_BASE}/categories`);
            const data = await res.json();
            renderCategories(data);
        } catch (err) { console.error('Error fetching categories:', err); }
    }

    function renderCategories(data) {
        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;
        tbody.innerHTML = data.map(cat => `
            <tr>
                <td>${cat.name.toLowerCase()}</td>
                <td><button class="icon-btn delete-btn" onclick="deleteMasterData('categories', ${cat.id})"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="2" style="text-align:center; padding:1rem;">belum ada kategori.</td></tr>';
    }

    async function fetchDepartments() {
        try {
            const res = await fetch(`${API_BASE}/departments`);
            const data = await res.json();
            renderDepartments(data);
        } catch (err) { console.error('Error fetching departments:', err); }
    }

    function renderDepartments(data) {
        const tbody = document.getElementById('departmentsTableBody');
        if (!tbody) return;
        tbody.innerHTML = data.map(dept => `
            <tr>
                <td>${dept.name.toLowerCase()}</td>
                <td><button class="icon-btn delete-btn" onclick="deleteMasterData('departments', ${dept.id})"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="2" style="text-align:center; padding:1rem;">belum ada departemen.</td></tr>';
    }

    async function fetchUsers() {
        try {
            const res = await fetch(`${API_BASE}/users`);
            const data = await res.json();
            renderUsers(data);
        } catch (err) { console.error('Error fetching users:', err); }
    }

    function renderUsers(data) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        tbody.innerHTML = data.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.name.toLowerCase()}</td>
                <td><span class="badge-tag">${user.role.toLowerCase()}</span></td>
                <td>${(user.department_name || 'N/A').toLowerCase()}</td>
                <td><button class="icon-btn delete-btn" onclick="deleteMasterData('users', ${user.id})"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center; padding:1rem;">belum ada pengguna.</td></tr>';
    }

    // --- Master Data Management Improved ---

    window.closeMasterModal = () => {
        document.getElementById('masterModal').classList.remove('active');
    };

    window.addMasterData = (type) => {
        const modal = document.getElementById('masterModal');
        const title = document.getElementById('masterModalTitle');
        const fields = document.getElementById('masterFields');
        const typeInput = document.getElementById('masterType');

        typeInput.value = type;
        modal.classList.add('active');
        fields.innerHTML = '';

        if (type === 'categories' || type === 'departments') {
            title.textContent = `Tambah ${type === 'categories' ? 'Kategori' : 'Departemen'}`;
            fields.innerHTML = `
                <div class="form-group">
                    <label>Nama ${type === 'categories' ? 'Kategori' : 'Departemen'}</label>
                    <input type="text" name="name" class="brutalist-input" required placeholder="Masukkan nama...">
                </div>
            `;
        } else if (type === 'users') {
            title.textContent = 'Tambah Pengguna Baru';
            fields.innerHTML = `
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" class="brutalist-input" required placeholder="admin_baru">
                </div>
                <div class="form-group" style="margin-top:10px;">
                    <label>Password</label>
                    <input type="password" name="password" class="brutalist-input" required placeholder="******">
                </div>
                <div class="form-group" style="margin-top:10px;">
                    <label>Nama Lengkap</label>
                    <input type="text" name="name" class="brutalist-input" required placeholder="Nama Lengkap">
                </div>
                <div class="form-group" style="margin-top:10px;">
                    <label>Role</label>
                    <select name="role" class="brutalist-input">
                        <option value="Admin">Admin</option>
                        <option value="User">User</option>
                    </select>
                </div>
            `;
        }
    };

    const masterForm = document.getElementById('masterForm');
    if (masterForm) {
        masterForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(masterForm);
            const type = document.getElementById('masterType').value;
            const payload = Object.fromEntries(formData.entries());
            
            if (type === 'users') payload.department_id = 1; // Default IT

            try {
                const res = await fetch(`${API_BASE}/${type}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    closeMasterModal();
                    if (type === 'categories') fetchCategories();
                    else if (type === 'departments') fetchDepartments();
                    else fetchUsers();
                } else {
                    alert('Gagal: ' + (data.error || 'Terjadi kesalahan'));
                }
            } catch (err) { alert('Gagal menghubungi server'); }
        };
    }

    window.deleteMasterData = async (type, id) => {
        if (!confirm('Yakin ingin menghapus data ini?')) return;
        try {
            const res = await fetch(`${API_BASE}/${type}/${id}`, { method: 'DELETE' });
            if (res.ok) refreshData();
        } catch (err) { alert('Gagal menghapus data'); }
    }

    // --- Global Helpers ---

    function initTheme() {
        const themeBtn = document.querySelector('.theme-toggle');
        const themeIcon = themeBtn.querySelector('i');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            themeIcon.className = 'fa-solid fa-sun';
        }

        themeBtn.onclick = () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            themeIcon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        };
    }

    function updateDate() {
        const el = document.getElementById('current-date');
        const now = new Date();
        el.innerHTML = `<i class="fa-regular fa-calendar"></i> ${now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase()}`;
    }
});
