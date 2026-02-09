# 개발 환경 설치 가이드

이 문서는 exhibition_front_end 프로젝트에 처음 참여하는 개발자를 위한 환경 설정 가이드입니다.

## 목차

1. [필수 소프트웨어 설치](#1-필수-소프트웨어-설치)
2. [프로젝트 클론 및 의존성 설치](#2-프로젝트-클론-및-의존성-설치)
3. [Cursor/VS Code 설정](#3-cursorvs-code-설정)
4. [개발 서버 실행](#4-개발-서버-실행)
5. [새 미니게임 개발 가이드](#5-새-미니게임-개발-가이드)

---

## 1. 필수 소프트웨어 설치

### Node.js 20+

Node.js는 JavaScript 런타임입니다. 프론트엔드 빌드 도구와 패키지 관리에 필요합니다.

**Windows:**
1. https://nodejs.org 접속
2. **LTS** 버전 다운로드 (20.x 이상)
3. 설치 프로그램 실행 → 기본 옵션으로 설치
4. 설치 확인:
   ```powershell
   node -v    # v20.x.x 출력되면 성공
   npm -v     # 10.x.x 출력되면 성공
   ```

### Cursor 또는 VS Code

- **Cursor** (권장): https://cursor.sh
- **VS Code**: https://code.visualstudio.com

둘 다 동일한 설정 파일(`.vscode/`)을 사용합니다.

### Git

버전 관리 도구입니다.
- https://git-scm.com/download/win 에서 다운로드
- 설치 후 확인: `git --version`

---

## 2. 프로젝트 클론 및 의존성 설치

### 2.1 프로젝트 받기

```powershell
# 원하는 폴더로 이동
cd C:\AIKorea

# 프로젝트 클론 (Git 주소는 실제 저장소로 변경)
git clone <repository-url> exhibition_front_end
cd exhibition_front_end
```

### 2.2 의존성 설치

```powershell
npm install
```

이 명령어가 `package.json`에 정의된 모든 패키지를 `node_modules/` 폴더에 설치합니다.

> **주의**: `node_modules/`는 Git에 포함되지 않습니다. 프로젝트를 받은 후 반드시 `npm install`을 실행하세요.

---

## 3. Cursor/VS Code 설정

프로젝트에는 이미 `.vscode/` 폴더에 설정이 포함되어 있습니다. Cursor나 VS Code로 프로젝트를 열면 자동으로 적용됩니다.

### 설정 파일 구조

```
.vscode/
├── launch.json    # 디버깅 설정
├── settings.json  # 에디터 설정
└── tasks.json     # 빌드 태스크 설정
```

### 3.1 launch.json (디버깅 설정)

Chrome에서 앱을 실행하고 브레이크포인트로 디버깅할 수 있습니다.

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch Chrome",
            "type": "chrome",
            "request": "launch",
            "url": "http://localhost:5173",
            "webRoot": "${workspaceFolder}",
            "preLaunchTask": "npm: run dev exhibition_front_end"
        },
        {
            "name": "Attach Chrome",
            "type": "chrome",
            "request": "attach",
            "port": 9222,
            "url": "http://localhost:5173",
            "webRoot": "${workspaceFolder}"
        }
    ]
}
```

**사용법:**
- `F5` 또는 **Run > Start Debugging** → "Launch Chrome" 선택
- 자동으로 개발 서버가 시작되고 Chrome이 열립니다
- 코드에 브레이크포인트를 찍으면 해당 라인에서 멈춥니다

### 3.2 settings.json (에디터 설정)

```json
{
    "editor.formatOnPaste": true,
    "editor.formatOnSave": true,
    "editor.formatOnType": true
}
```

저장할 때 자동으로 코드 포맷팅이 적용됩니다.

### 3.3 tasks.json (태스크 설정)

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "npm: run dev exhibition_front_end",
            "type": "shell",
            "command": "npm run dev",
            "options": {
                "cwd": "${workspaceFolder}"
            },
            "isBackground": true,
            "problemMatcher": {
                "pattern": {
                    "regexp": "^$",
                    "file": 1,
                    "location": 2,
                    "message": 3
                },
                "background": {
                    "activeOnStart": true,
                    "beginsPattern": ".*VITE.*ready.*",
                    "endsPattern": ".*Local:.*http://localhost:5173.*"
                }
            }
        }
    ]
}
```

`launch.json`의 `preLaunchTask`가 이 태스크를 참조합니다.

### 3.4 설정 파일이 없는 경우 직접 생성

만약 `.vscode/` 폴더가 없다면:

1. 프로젝트 루트에 `.vscode` 폴더 생성
2. 위의 세 파일(`launch.json`, `settings.json`, `tasks.json`)을 생성하고 내용 복사

---

## 4. 개발 서버 실행

### 방법 1: 터미널에서 직접 실행

```powershell
npm run dev
```

출력:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

브라우저에서 `http://localhost:5173` 접속

### 방법 2: Cursor/VS Code 디버깅 (권장)

1. `F5` 키 누르기
2. "Launch Chrome" 선택
3. 자동으로 서버 시작 + Chrome 열림 + 디버깅 연결

### 빌드 (프로덕션)

```powershell
npm run build
```

`dist/` 폴더에 배포용 파일이 생성됩니다.

---

## 5. 새 미니게임 개발 가이드

### 폴더 구조

미니게임은 `scenes/` 폴더 아래에 독립적인 폴더로 생성합니다:

```
scenes/
├── Game01/          # 가위바위보 게임 (참고용)
│   ├── index.tsx    # 메인 컴포넌트
│   ├── Game01.types.ts
│   ├── Game01.css
│   └── ...
├── Game02/          # 새 미니게임
│   ├── index.tsx
│   ├── Game02.types.ts
│   ├── Game02.css
│   └── ...
```

### Game02 생성 예시

1. **폴더 생성**: `scenes/Game02/`

2. **타입 정의** (`Game02.types.ts`):
```typescript
export interface Game02Props {
  onGameResult: (result: 'win' | 'lose' | 'draw') => void;
}

// 게임 전용 타입들...
```

3. **스타일** (`Game02.css`):
```css
/* Game02 전용 애니메이션/스타일 */
```

4. **메인 컴포넌트** (`index.tsx`):
```typescript
import React from 'react';
import './Game02.css';
import type { Game02Props } from './Game02.types';

const Game02: React.FC<Game02Props> = ({ onGameResult }) => {
  // 게임 로직...
  
  return (
    <div className="h-full w-full">
      {/* 게임 UI */}
    </div>
  );
};

export default Game02;
```

5. **App.tsx에 등록**:
```typescript
import Game02 from './scenes/Game02';

// renderScene() 안에 추가:
case SceneDefine.GAME02:
  return <Game02 onGameResult={(result) => handleUIEvent('GAME_RESULT', { result })} />;
```

6. **types.ts에 Scene 추가**:
```typescript
export enum SceneDefine {
  // ... 기존 Scene들
  GAME02 = 'GAME02',
}
```

### 참고 사항

- **Game01** 폴더를 참고하면 Vision WebSocket 연동(`services/visionWebSocketService`, `game_id`), 애니메이션, 결과 처리 패턴을 볼 수 있습니다.
- **Python/Vision 프로토콜**(SET_SCENE_PY, request_detection, HEAD_POSE, game_start/game_stop 등)은 [vision-python-websocket.md](vision-python-websocket.md)를 참고하세요.
- CSS는 게임별로 분리하여 충돌을 방지합니다.
- 결과는 `onGameResult` 콜백으로 C++ 백엔드에 전송됩니다.

---

## 문제 해결

### "vite를 찾을 수 없습니다"

```powershell
npm install
```
실행 후 다시 시도

### Chrome이 열리지 않음

- launch.json의 `url`이 `http://localhost:5173`인지 확인
- tasks.json의 `endsPattern`이 Vite 출력과 일치하는지 확인

### 포트 충돌

다른 프로세스가 5173 포트를 사용 중이면:
```powershell
# 사용 중인 프로세스 확인
netstat -ano | findstr :5173

# 프로세스 종료 (PID 확인 후)
taskkill /PID <PID> /F
```

또는 `vite.config.ts`에서 포트 변경:
```typescript
server: {
  port: 3000  // 다른 포트로 변경
}
```

---

## 추가 자료

- [Vite 공식 문서](https://vitejs.dev/)
- [React 공식 문서](https://react.dev/)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/handbook/)
- [Tailwind CSS](https://tailwindcss.com/docs)
