
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

## Protocol

통신 규격은 **V2 프로토콜**을 사용합니다. 메시지 이름·페이로드 상세는 [PROTOCOL.md](./PROTOCOL.md)를 참고하세요.

- **Backend → Frontend**: `SET_SCENE`, `PROGRESS_UPDATE`, `SYSTEM_ERROR`, `CAMERA_FRAME`
- **Frontend → Backend**: `START`, `CANCEL`, `MINIGAME_SELECTED`, `GIFT_SELECTED`, `STYLE_SELECTED`, `GAME_ACTION`, `ANIMATION_COMPLETE`

기본 WebSocket URL: `ws://127.0.0.1:8080`. 다른 주소 사용 시 `.env`에 `VITE_WS_URL=ws://호스트:포트` 설정.

## Resolution Note
The application is hardcoded to a **2560x720** container. For actual production, ensure the browser runs in fullscreen/kiosk mode on a matching display.
