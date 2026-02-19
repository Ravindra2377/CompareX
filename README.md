# PricePilot

PricePilot is a cross-platform mobile application for real-time product price comparison across multiple e-commerce platforms.

## Tech Stack (Trendu Tech)
- **Frontend**: React Native (Expo)
- **Backend**: Go (Echo Framework)
- **Database**: PostgreSQL
- **Caching**: Redis
- **Search**: Meilisearch (Planned)

## Prerequisites
- Go 1.24+ 
- Node.js 18+
- Docker & Docker Compose

## Quick Start

### 1. Start Infrastructure (Database & Redis)
```bash
cd docker
docker-compose up -d
```

### 2. Run Backend
```bash
cd backend
go run main.go
```
The server will start at `http://localhost:8080`.
Health check: `curl http://localhost:8080/health`

### 3. Run Frontend (Mobile App)
First, ensure you have dependencies installed:
```bash
cd frontend
npm install
```
Then start the Expo development server:
```bash
npx expo start
```
Scan the QR code with the Expo Go app on your phone (Android/iOS) or press `i` to open in iOS Simulator / `a` to open in Android Emulator.

## Project Structure
- `backend/`: Go API server.
- `frontend/`: React Native (Expo) application.
- `docker/`: Docker Compose configuration for local development.
