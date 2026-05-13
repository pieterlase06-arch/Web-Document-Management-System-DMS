document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'http://localhost:3000/api';

    // --- State & Charts ---
    let growthChart, categoryChart;

    // --- Initialization ---
    initTheme();
    updateDate();
    fetchStats();
    fetchDocuments();
    fetchActivities();

    // --- API Calls ---

    async function fetchStats() {
        try {
            const res = await fetch(`${API_BASE}/stats`);
            const data = await res.json();
            
            document.getElementById('stat-total').textContent = data.total;
            document.getElementById('stat-active').textContent = data.active;
            document.getElementById('stat-draft').textContent = data.draft;
            document.getElementById('stat-archived').textContent = data.archived;

            initGrowthChart(); // Static for now as per backend seed
            initCategoryChart(data.categories);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    }

    async function fetchDocuments() {
        try {
            const res = await fetch(`${API_BASE}/documents`);
            const docs = await res.json();
            renderDocuments(docs);
        } catch (err) {
            console.error('Error fetching documents:', err);
        }
    }

    async function fetchActivities() {
        try {
            const res = await fetch(`${API_BASE}/activities`);
            const activities = await res.json();
            renderActivities(activities);
        } catch (err) {
            console.error('Error fetching activities:', err);
        }
    }

    // --- Rendering ---

    function renderDocuments(docs) {
        const tbody = document.getElementById('documentTableBody');
        tbody.innerHTML = '';
        docs.forEach(doc => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${doc.title.toLowerCase()}</strong></td>
                <td><span class="badge-tag">${doc.category.toLowerCase()}</span></td>
                <td><span class="status-${doc.status.toLowerCase()}">${doc.status.toLowerCase()}</span></td>
                <td>${new Date(doc.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="icon-btn delete-btn" data-id="${doc.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners for delete
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = () => deleteDocument(btn.dataset.id);
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

    async function deleteDocument(id) {
        if (!confirm('apakah anda yakin ingin menghapus dokumen ini?')) return;
        try {
            await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
            refreshData();
        } catch (err) {
            console.error('Error deleting document:', err);
        }
    }

    document.getElementById('addDocBtn').onclick = async () => {
        const title = prompt('masukkan judul dokumen:');
        if (!title) return;
        const category = prompt('masukkan kategori (finance, marketing, hr, development):', 'general');
        const status = prompt('masukkan status (active, draft, archived):', 'active');

        try {
            await fetch(`${API_BASE}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, category, status })
            });
            refreshData();
        } catch (err) {
            console.error('Error adding document:', err);
        }
    };

    function refreshData() {
        fetchStats();
        fetchDocuments();
        fetchActivities();
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
                plugins: { legend: { display: false } }
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

        // Legend
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

    // --- Chat Widget ---

    const chatToggle = document.getElementById('chatToggle');
    const chatWindow = document.getElementById('chatWindow');
    const closeChat = document.getElementById('closeChat');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatBody = document.getElementById('chatBody');

    chatToggle.onclick = () => chatWindow.classList.toggle('active');
    closeChat.onclick = () => chatWindow.classList.remove('active');

    async function handleChat() {
        const text = chatInput.value.trim();
        if (!text) return;

        addChatMessage(text, 'user');
        chatInput.value = '';

        const typingId = addTypingIndicator();

        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: text }]
                })
            });
            const data = await res.json();
            
            if (data.error) throw new Error(data.error);

            removeTypingIndicator(typingId);
            const reply = data.choices ? data.choices[0].message.content : 'maaf, saya sedang sibuk.';
            addChatMessage(reply.toLowerCase(), 'ai');
        } catch (err) {
            removeTypingIndicator(typingId);
            addChatMessage('kesalahan: ' + err.message, 'ai');
        }
    }

    sendMessage.onclick = handleChat;
    chatInput.onkeypress = (e) => { if (e.key === 'Enter') handleChat(); };

    function addChatMessage(text, role) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.innerHTML = `<div class="msg-content">${text}</div>`;
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function addTypingIndicator() {
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'message ai';
        div.innerHTML = `<div class="msg-content typing-indicator"><span></span><span></span><span></span></div>`;
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // --- Helpers ---

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
