# 📁 DMS - Document Management System
> **Modern Full-Stack Document Management with AI Integration & Soft Dark Brutalism Aesthetics**

![DMS Dashboard Preview](https://via.placeholder.com/1200x600.png?text=Document+Management+System+Dashboard+Preview)

## 🌟 Overview
DMS (Document Management System) adalah aplikasi web full-stack yang dirancang untuk efisiensi pengelolaan dokumen perusahaan. Mengusung desain **Soft Dark Brutalism**, aplikasi ini memberikan pengalaman visual yang berani, bersih, dan modern. Proyek ini menggabungkan kekuatan Node.js di sisi backend dan interaktivitas Vanilla JS di sisi frontend, lengkap dengan asisten AI terintegrasi.

## 🚀 Key Features
- **📊 Real-time Dashboard**: Visualisasi statistik dokumen menggunakan Chart.js (Line & Doughnut charts).
- **📑 Document Management**: Operasi CRUD (Create, Read, Delete) untuk dokumen dengan kategori dan status.
- **⚡ AI Assistant Proxy**: Integrasi 9Router AI melalui backend proxy untuk keamanan API Key.
- **🕒 Activity Logging**: Melacak setiap aksi pengguna (tambah/hapus dokumen) secara otomatis.
- **🌓 Theme Toggle**: Mendukung Dark Mode dan Light Mode dengan penyimpanan `localStorage`.
- **🛡️ Secure Backend**: Menggunakan `.env` untuk manajemen kredensial dan SQLite untuk database lokal yang ringan.

## 🛠️ Tech Stack
### Frontend
- **Language**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Design Pattern**: Soft Dark Brutalism (Sharp edges, hard shadows, custom palette).
- **Libraries**: [Chart.js](https://www.chartjs.org/), [FontAwesome](https://fontawesome.com/).
- **Typography**: Space Grotesk.

### Backend
- **Runtime**: Node.js.
- **Framework**: Express.js.
- **Database**: SQLite (better-sqlite3).
- **Security**: Dotenv for environment variables & CORS for cross-origin protection.

## 📂 Project Structure
```text
/Web-Document Management System (DMS)
├── backend/            # Express.js Server & SQLite Logic
│   ├── database.js     # Database Schema & Seed Data
│   ├── server.js       # RESTful API Endpoints
│   └── .env            # Environment Variables (Ignored by Git)
├── frontend/           # Vanilla Web Client
│   ├── index.html      # UI Structure
│   ├── style.css       # Custom Brutalist Styling
│   └── script.js       # API Integration & Chat Logic
└── .gitignore          # Ensuring security of secrets
```

## ⚙️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/pieterlase06-arch/Web-Document-Management-System-DMS.git
   cd Web-Document-Management-System-DMS
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment Variables**
   Buat file `.env` di dalam folder `backend/`:
   ```env
   PORT=3000
   NINEROUTER_KEY=your_9router_api_key_here
   ```

4. **Run the Server**
   ```bash
   node server.js
   ```

5. **Launch Frontend**
   Buka `frontend/index.html` menggunakan Live Server atau buka langsung di browser.

## 🤖 AI Integration (9Router)
Sistem ini menggunakan **9Router Proxy pattern**. Frontend tidak langsung menghubungi endpoint AI, melainkan melalui backend Express untuk menjaga kerahasiaan `NINEROUTER_KEY`. Hal ini mencegah pencurian API Key dari sisi klien.

---
Developed with ❤️ by [pieterlase06](https://github.com/pieterlase06-arch)
