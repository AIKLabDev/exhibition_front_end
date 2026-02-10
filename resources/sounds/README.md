# Sound 리소스 (편집용)

실제 **사운드 파일**은 빌드 시 그대로 서빙되도록 **`public/sounds/`** 에 두세요.

- Vite는 `public/` 내용을 루트에 복사하므로, `public/sounds/welcome/bg.mp3` → `/sounds/welcome/bg.mp3` 로 로드됩니다.
- 등록/경로는 `services/soundService.ts` 의 `SOUND_PATHS` 에서 관리합니다.

이 폴더(`resources/sounds/`)는 “사운드 리소스 목록/기획” 용으로 두고, 실제 파일 위치는 `public/sounds/` 를 사용하는 것을 권장합니다.
