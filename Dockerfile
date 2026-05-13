# Gunakan Node.js LTS
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install build dependencies untuk better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files dari root (jika ada) dan backend
COPY backend/package*.json ./backend/

# Install dependencies di folder backend
RUN cd backend && npm install

# Copy semua file proyek
COPY . .

# Expose port yang digunakan Hugging Face
EXPOSE 7860

# Jalankan server
CMD ["node", "backend/server.js"]
