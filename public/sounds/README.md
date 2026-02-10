# Sound Resources

씬별·기능별 사운드 파일을 두는 폴더입니다.  
빌드 시 그대로 `dist/sounds/`로 복사되며, 런타임에 `/sounds/...` 경로로 로드합니다.

## 폴더 구조 (권장)

```
public/sounds/
├── welcome/       # Welcome 씬
├── qr/            # QR 씬
├── select_minigame/
├── game01/        # 가위바위보
├── game02/        # 스피드 탭
├── game_result/
├── pick_gift/
├── laser_style/
├── laser_process/
└── common/        # 공용 (클릭, 알림 등)
```

## 파일 형식

- 브라우저 호환성: **MP3** 또는 **WAV** 권장.
- `soundService`에서 사용할 경로 예: `/sounds/welcome/bg.mp3`, `/sounds/game01/win.mp3`

## 사용

`services/soundService.ts`에서 사운드 ID와 경로를 매핑한 뒤, 각 씬에서 `soundService.play('welcome_bg')` 등으로 재생합니다.
