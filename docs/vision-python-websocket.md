# Vision / Python WebSocket 아키텍처

프론트엔드는 **C++ 백엔드**와 **Python(Vision 등)** 과 각각 WebSocket으로 통신합니다.

| 대상 | 서비스 파일 | 용도 |
|------|-------------|------|
| C++ 백엔드 | `services/backendWebSocketService.ts` | 씬 제어, 진행률, 카메라 프레임 등 |
| Python (Vision 등) | `scenes/Game01/visionWebSocket.ts` | 제스처/객체 감지 등 (Game01 사용, Game02 등에서도 사용 예정) |

---

## Python 쪽 구조 선택 (공통 모듈 vs 개별 모듈)

**고민:** Python과의 WebSocket 통신을  
- **(A) 공통 Python 모듈**이 담당하고, 그 안에서 Game01/Game02 등으로 전달할지  
- **(B) Game01용 Python, Game02용 Python** 등 **개별 모듈**이 각각 프론트와 통신할지  

### (A) 공통 Python 모듈이 WebSocket 담당

- **장점**
  - 프론트엔드는 **연결 1개**만 유지 (포트 1개, 인증/재연결 로직 한 곳).
  - 게임/기능 추가 시 Python 쪽에서 라우팅만 추가하면 됨.
  - 연결 상태·헬스체크를 한 곳에서 관리 가능.
- **단점**
  - 공통 모듈이 모든 게임/기능의 메시지 형식을 알거나, 라우팅 규약을 정해야 함.
  - 한 연결이 끊기면 Vision 관련 기능 전체에 영향.

### (B) 개별 Python 모듈이 각각 WebSocket

- **장점**
  - Game01 전용, Game02 전용 등 **역할이 명확**하고, 프로토콜을 게임별로 다르게 가져가기 쉬움.
  - 한 게임의 Python만 재시작/배포해도 다른 게임에 영향 없음.
- **단점**
  - 프론트엔드가 **연결을 여러 개** 관리 (예: Game01용 포트, Game02용 포트).
  - 포트·URL 설정이 늘어남.

### 추천

- **게임/기능이 2~3개 수준이고, 메시지 형식이 비슷하다** → **(A) 공통 Python 모듈**이 WebSocket을 받고, 내부에서 `game_id`나 `type`으로 Game01/Game02 등에 전달하는 방식이 단순함.
- **게임별로 프로토콜·배포가 완전히 달라질 가능성이 크다** → **(B) 개별 모듈**이 각각 WebSocket을 열고, 프론트는 필요한 씬에서만 해당 연결을 사용.

프론트엔드에서는 **(A)를 선택할 경우**에도, 지금처럼 Game01에서만 쓰는 `visionWebSocket`을 **Game02 등에서도 재사용**할 수 있도록 `services/visionWebSocketService.ts` 같은 **공용 서비스**로 옮겨 두면, URL만 공통 Python 한 Endpoint로 맞추면 됩니다.  
**(B)를 선택할 경우**에는 `services/visionWebSocketService.ts`에서 URL을 게임/기능별로 받거나, Game01/Game02용 인스턴스를 나누는 식으로 확장할 수 있습니다.
