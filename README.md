
# Kiosk Exhibition Frontend

High-resolution (2560x720) kiosk application built with Vite, React, and TypeScript. Designed for touch interaction and synchronized via WebSocket.

## Architecture
- **Vite + React 18**: Fast development and rendering.
- **Tailwind CSS**: Utility-first styling for complex, responsive kiosk layouts.
- **WebSocket (ws)**: Real-time communication with backend (C++/Qt or Mock Server).
- **Scene-based Pattern**: State-driven UI transitions.

## Prerequisites
- Node.js 20+
- npm

## Setup & Run

### 1. Install Dependencies
```bash
npm install
# Note: You also need 'ws' for the mock server
npm install -D ws @types/ws
```

### 2. Run the Mock Server (for testing)
Open a separate terminal:
```bash
npx tsx tools/mock-server.ts
```
The server will cycle through all scenes every 5 seconds.

### 3. Start Frontend Development Server
```bash
npm run dev
```
Open the provided URL in Chrome/Edge (typically `http://localhost:5173`).

## Protocol Details

### Inbound (Backend -> Frontend)
- `STATE`: Transitions the UI to a specific scene.
- `PROGRESS`: Updates current progress bars (0.0 to 1.0).
- `ERROR`: Displays an overlay error screen.

### Outbound (Frontend -> Backend)
- `UI_EVENT`: Triggered by touch interactions (START, CANCEL, etc.).

## Resolution Note
The application is hardcoded to a **2560x720** container. For actual production, ensure the browser runs in fullscreen/kiosk mode on a matching display.
