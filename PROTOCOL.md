# Exhibition WebSocket Protocol (V2)

프론트엔드(키오스크 웹앱)와 백엔드(C++/Qt 또는 Mock Server) 간 통신 규격입니다.

## 공통 메시지 형식

모든 메시지는 JSON 객체이며 다음 구조를 따릅니다.

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
| `SET_SCENE` | 화면 전환 | `{ scene: Scene, text?: string, result?: 'WIN' \| 'LOSE' }` |
| `PROGRESS_UPDATE` | 진행률 갱신 | `{ value: number (0~1), label?: string }` |
| `SYSTEM_ERROR` | 오류 오버레이 | `{ message: string }` |
| `CAMERA_FRAME` | 카메라 프레임 (실시간) | `{ image: string (base64), format: 'jpeg' \| 'png' \| 'webp', width?, height? }` |

- `Scene`: `WELCOME` \| `QR` \| `SELECT_MINIGAME` \| `GAME01` \| `GAME_RESULT` \| `PICK_GIFT` \| `LASER_STYLE` \| `LASER_PROCESS`

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

---

## 연결

- **기본 URL**: `ws://127.0.0.1:8080`
- 빌드 시 `VITE_WS_URL`로 오버라이드 가능 (예: `ws://192.168.0.10:8080`)

백엔드(Qt)는 앱 기동 시 포트 8080에서 WebSocket 서버를 수신합니다.
