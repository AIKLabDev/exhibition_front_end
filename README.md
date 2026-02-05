# Kiosk Exhibition Frontend

High-resolution (2560x720) kiosk application built with Vite, React, and TypeScript. Designed for touch interaction and synchronized via WebSocket.

## Architecture
- **Vite + React 18**: Fast development and rendering.
- **Tailwind CSS**: Utility-first styling for complex, responsive kiosk layouts.
- **WebSocket (ws)**: Real-time communication with backend (C++/Qt or Mock Server).
- **Scene-based Pattern**: State-driven UI transitions.

## Quick Start

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

> **처음 참여하는 개발자는** [docs/installation.md](./docs/installation.md)에서 상세 설치 가이드를 확인하세요.

### Cursor/VS Code 디버깅

프로젝트에 `.vscode/` 설정이 포함되어 있습니다:
- `F5` → "Launch Chrome" 선택 → 자동으로 서버 시작 + Chrome 디버깅

## Project Structure

```
exhibition_front_end/
├── scenes/              # Scene 컴포넌트들
│   ├── Welcome.tsx
│   ├── QR.tsx
│   ├── Game01/          # 미니게임 01 (가위바위보)
│   │   ├── index.tsx
│   │   ├── Game01.types.ts
│   │   ├── Game01.css
│   │   └── ...
│   └── ...
├── services/            # WebSocket 등 서비스
├── types.ts             # 공통 타입 정의
├── App.tsx              # 메인 앱 (Scene 라우팅)
├── docs/                # 문서
│   └── installation.md  # 설치 가이드
├── .vscode/             # Cursor/VS Code 설정
│   ├── launch.json
│   ├── settings.json
│   └── tasks.json
└── .cursor/rules/       # AI Agent 규칙
    └── AGENTS.md        # 코딩 스타일 가이드
```

## AI Agent Guidelines

Cursor 등 AI 코딩 어시스턴트는 [.cursor/rules/AGENTS.md](./.cursor/rules/AGENTS.md)를 참고합니다:

- **Frontend Master 페르소나**: 30년 경력의 시니어 프론트엔드 개발자
- **웹 비전문가를 위한 상세 설명**: 코드에 주석으로 웹 개념 설명
- **디버깅 용이한 코드**: 의미있는 변수명, 컨텍스트 있는 로그
- **기능별 파일 분리**: 타입, 스타일, 상수를 별도 파일로 분리

## Adding a New Minigame (Game02, Game03...)

새 미니게임은 `scenes/` 아래에 독립 폴더로 생성합니다:

```
scenes/Game02/
├── index.tsx          # 메인 컴포넌트
├── Game02.types.ts    # 전용 타입
├── Game02.css         # 전용 스타일
└── ...
```

자세한 내용은 [docs/installation.md](./docs/installation.md)의 "새 미니게임 개발 가이드" 섹션 참고.

## Mock Server (Testing)

C++ 백엔드 없이 테스트하려면:
```bash
npx tsx tools/mock-server.ts
```
5초마다 Scene이 자동 전환됩니다.

## Protocol

통신 규격은 **V2 프로토콜**을 사용합니다. 메시지 이름·페이로드 상세는 [PROTOCOL.md](./PROTOCOL.md)를 참고하세요.

- **Backend → Frontend**: `SET_SCENE`, `PROGRESS_UPDATE`, `SYSTEM_ERROR`, `CAMERA_FRAME`
- **Frontend → Backend**: `START`, `CANCEL`, `MINIGAME_SELECTED`, `GIFT_SELECTED`, `STYLE_SELECTED`, `GAME_ACTION`, `ANIMATION_COMPLETE`

기본 WebSocket URL: `ws://127.0.0.1:8080`. 다른 주소 사용 시 `.env`에 `VITE_WS_URL=ws://호스트:포트` 설정.

## Resolution Note
The application is hardcoded to a **2560x720** container. For actual production, ensure the browser runs in fullscreen/kiosk mode on a matching display.
