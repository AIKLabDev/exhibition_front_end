# Exhibition WebSocket Protocol (V2)

Front-end(WebApp)와 Back-end(C++/Qt) 그리고, Python module간 통신 규격입니다.

## 공통 Message 형식

모든 Message는 JSON 객체이며 다음 구조를 따릅니다.

```ts
interface WSMessageV2 {
  header: {
    id: string;        // 고유 명령 ID (UUID)
    name: string;      // 명령 이름 (아래 목록 참고)
    sender: 'BACKEND' | 'FRONTEND';
    timestamp: number; // ms
  };
  data: any;           // 페이로드 (명령별로 다름)
}
```

---

## Backend → Frontend (수신)

| name | 설명 | data 필드 |
|------|------|-----------|
| `SET_SCENE` | 화면 전환 | `{ scene: SceneDefine, text?: string, result?: 'WIN' \| 'LOSE' }` |
| `PROGRESS_UPDATE` | 진행률 갱신 | `{ value: number (0~1), label?: string }` |
| `SYSTEM_ERROR` | 오류 오버레이 | `{ message: string }` |
| `CAMERA_FRAME` | 카메라 프레임 (실시간) | `{ image: string (base64), format: 'jpeg' \| 'png' \| 'webp', width?, height? }` |
| `GAME_START` | 게임 시작 신호 (예: 로봇 준비 완료) | `{}` — 프론트가 Game01 시작 트리거 + Python에 game_start 전달 |
| `GAME_STOP` | 게임 종료 신호 | `{}` — 프론트가 Python에 game_stop 전달 |

- `SceneDefine`: `WELCOME` \| `QR` \| `SELECT_MINIGAME` \| `GAME01` \| `GAME_RESULT` \| `PICK_GIFT` \| `LASER_STYLE` \| `LASER_PROCESS`

---

## Frontend → Backend (발신)

| name | 설명 | data 예시 |
|------|------|-----------|
| `START` | 시작 (예: 게임/플로우 시작) | `{}` |
| `CANCEL` | 취소 | `{}` |
| `MINIGAME_SELECTED` | 미니게임 선택 | `{ game: string }` |
| `GIFT_SELECTED` | 선물 선택 | `{ ... }` |
| `STYLE_SELECTED` | 스타일 선택 (레이저 등) | `{ style: string }` |
| `GAME_ACTION` | 게임 내 액션 | `{ action: string }` |
| `ANIMATION_COMPLETE` | 애니메이션 완료 알림 | `{}` |
| `HUMAN_DETECTED` | Welcome 씬에서 Vision이 human 감지 시 프론트가 전달. **백엔드는 수신 후 `SET_SCENE`으로 QR 씬 전환** | `{ detected: true }` |

---

## 연결

- **기본 URL**: `ws://127.0.0.1:8080`
- 빌드 시 `VITE_WS_URL`로 오버라이드 가능 (예: `ws://192.168.0.10:8080`)

백엔드(C++/Qt)는 앱 기동 시 포트 8080에서 WebSocket 서버를 수신합니다.

# Vision / Python 통신

- **C++ 백엔드**: `services/backendWebSocketService.ts` (씬 제어, 진행률 등)
- **Python 공통 모듈**: `services/visionWebSocketService.ts` (씬 컨텍스트, 감지 요청/응답)

프론트는 **중간다리** 역할을 한다. 백엔드에서 `SET_SCENE`을 받으면 현재 씬을 Python에 전달하고, Game01/Game02 등은 감지 요청 시 `game_id`를 넣어 공통 Python이 라우팅할 수 있게 한다.

---

## 1. 프론트 ↔ Python WebSocket 프로토콜

공통 메시지 형식: JSON, `type` 필드로 구분.

### 1.1 프론트 → Python

| type | 설명 | payload |
|------|------|---------|
| `SET_SCENE_PY` | 현재 씬 알림 (백엔드 SET_SCENE 수신 시 전달) | `scene`, `text?`, `result?`, `timestamp` |
| `request_detection` | 감지 요청 | `request_id`, `timestamp`, `game_id?` |
| `game_start` | 게임 시작 이벤트 (백엔드 GAME_START 수신 시 프론트가 전달) | `timestamp` |
| `game_stop` | 게임 종료 이벤트 (백엔드 GAME_STOP 수신 시 프론트가 전달) | `timestamp` |

- **SET_SCENE_PY**: `scene`(필수), `text`, `result`(WIN/LOSE) 등. Python이 씬별 파이프라인을 켜고 끄는 데 사용.
- **request_detection**: `game_id`(예: `GAME01`, `GAME02`)를 넣으면 Python이 해당 게임용 처리로 라우팅.
- **game_start / game_stop**: 올바른 구조는 백엔드 → 프론트 → Python. 백엔드가 GAME_START/GAME_STOP을 보내면, 프론트가 Game01 시작 트리거 및 Python에 이벤트만 전달.

### 1.2 Python → 프론트

| type | 설명 |
|------|------|
| `detection_result` | 감지 결과 (`request_id`로 매칭, 필요 시 `game_id` 포함) |
| `headpose` | Game02 HumanTrack 헤드포즈 (yaw, pitch). 공통 Python이 UDP 등 수신 후 WebSocket으로 전달 |
| `game_start` | (레거시) 게임 시작 신호 — 신규는 백엔드 GAME_START 사용 권장 |
| `game_stop` | (레거시) 게임 종료 신호 |
| `error` | 오류 |
| `ack` | 수신 확인 |

---

## 2. 구현 위치

- **컨텍스트 전송**: `App.tsx`에서 백엔드 `SET_SCENE` 수신 시 `getVisionWsService().sendScene({ scene, text, result })` 호출.
- **GAME_START / GAME_STOP**: `App.tsx`에서 백엔드 `GAME_START` 수신 시 `sendGameStart()` 호출 후 `gameStartTrigger` 증가 → Game01이 `triggerStartFromBackend`로 버튼 없이 시작. `GAME_STOP` 수신 시 `sendGameStop()` 호출.
- **감지 요청**: Game01은 `requestDetection({ game_id: 'GAME01' })`, Game02 등은 동일 패턴으로 `game_id` 지정.
- **헤드포즈**: Game02는 `getVisionWsService().onPose(cb)`로 `headpose` 스트림 구독. UDP/Vite 플러그인 없음.
- **연결**: `getVisionWsService()` 싱글톤, Game01/Game02 마운트 시 각자 `connect()` 또는 `onPose` 등으로 사용.

---

## 3. Game02 HumanTrack (WebSocket 통합)

브라우저는 **UDP를 직접 사용할 수 없으므로**, Game02 헤드포즈는 **공통 Python WebSocket** 한 경로로만 수신한다.

- **흐름**: Python 공통 모듈이 헤드포즈를 수집(UDP/로컬 등 자유)한 뒤, 프론트와의 WebSocket으로 `type: 'headpose'`, `yaw`, `pitch` 를 보낸다. Game02는 `visionWebSocketService.onPose(cb)`로 구독.
- **과거**: Vite 플러그인이 UDP 수신 후 HMR WebSocket/HTTP로 브라우저에 전달하던 방식은 제거됨. 이제는 Python → WebSocket → 브라우저 한 경로만 사용.

---

## 4. Welcome → Human 감지 → QR 씬 전환

1. **Frontend** Welcome 씬 표시. **Backend**가 `SET_SCENE` WELCOME 보냄 → **Frontend**가 **Python**에 `SET_SCENE`(현재 씬) 전달.
2. **Python** (Welcome 씬 컨텍스트)에서 human 감지 시 **Python**이 **Frontend**에 `HUMAN_DETECTED` 전송. `data: { detected: true }`.
3. **Frontend**는 `HUMAN_DETECTED` 수신 시, 현재 씬이 Welcome일 때만 **Backend**에 `HUMAN_DETECTED` 이벤트 전달 (`sendCommand('HUMAN_DETECTED', data)`).
4. **Backend**는 `HUMAN_DETECTED` 수신 후 **Frontend**에 `SET_SCENE` QR 전송.
5. **Frontend**는 기존대로 `SET_SCENE` 수신 시 QR 씬으로 전환.

정리: **Python → Frontend (HUMAN_DETECTED) → Frontend → Backend (HUMAN_DETECTED) → Backend → Frontend (SET_SCENE QR)**. 씬 전환은 반드시 Backend의 SET_SCENE으로만 수행.
