/**
 * 공통 타입: 프로토콜은 protocol.ts, 여기는 앱 전역 타입만.
 */

export { SceneDefine, Sender, BackendMessageName, VisionMessageName, VisionMessageType } from './protocol';
export type {
  WSMessageHeader,
  WSMessageV2,
  CameraFrameData,
  SceneData,
  ProgressData,
  UIEventNameType,
  UIEventName,
  BackendMessageNameType,
  VisionMessageNameType,
  VisionReqHandGesture,
  VisionResultHandGesture,
  VisionErrorData,
  VisionMessageTypeValue,
} from './protocol';

/** 연결 상태 (프로토콜이 아닌 UI/상태용) */
export enum ConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
}
