/**
 * QR 씬 상수
 */

/** 인식 완료 연출 표시 시간(ms). 이후 백엔드로 전달 또는 중복 참여자 연출 */
export const QR_SUCCESS_DISPLAY_MS = 1000;

/** 중복 참여자 연출 표시 시간(ms). 0이면 백엔드 씬 전환까지 유지 */
export const QR_DUPLICATED_DISPLAY_MS = 0;

/** 인식 완료 / 중복 참여 오버레이 페이드인 애니메이션 시간(ms) */
export const QR_OVERLAY_FADE_IN_MS = 300;

/** 인식 완료 / 중복 참여 오버레이 아이콘 스케일 애니메이션 시간(ms) */
export const QR_OVERLAY_SCALE_MS = 400;

/** 오른쪽 패널 안내 문구 (한글) */
export const QR_SCAN_INSTRUCTION = '화면에 전시회 QR 티켓을 놓아주세요.';

/** QR 씬 UI 문자열 (한글·영문) */
export const QR_STRINGS = {
  /** 상태: 인식 중 / 인식 완료 / 중복 참여 */
  statusRecognizing: '인식 중',
  statusScanned: '인식 완료',
  statusDuplicated: '중복 참여',

  /** 인식 완료 오버레이 */
  successTitle: '인식 완료',
  successSubtitle: '티켓이 확인되었습니다',

  /** 중복 참여자 오버레이 */
  duplicatedTitle: '이미 참여하셨군요',
  duplicatedSubtitle: '해당 티켓은 이미 사용되었습니다',

  /** 카메라 대기 화면 */
  waitingTitle: 'Waiting for camera frame...',
  waitingSubtitle: 'need to check back-end camera frame',

  /** 오른쪽 패널 */
  serverStreamActive: 'Server Stream Active',
  visionSystem: 'VISION SYSTEM',
  online: 'Online',
  offline: 'Offline',
} as const;
