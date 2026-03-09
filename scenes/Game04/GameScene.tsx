/**
 * Game04 (Zombie Defender) 3D scene.
 * Uses a rigged FBX zombie model and plays the embedded animation clip.
 */

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import actionFbxUrl from '../../3dModel/action.fbx';
import bossActionFbxUrl from '../../3dModel/bossaction.fbx';
import background360Url from '../../3dModel/background.png';
import weaponIdleUrl from '../../3dModel/0.png';
import weaponFireUrl from '../../3dModel/1.png';
import weaponFire2Url from '../../3dModel/2.png';
import weaponFire3Url from '../../3dModel/3.png';
import {
  SPAWN_RADIUS,
  BULLET_SPEED,
  ZOMBIE_BASE_SPEED,
  FIRE_RATE,
  GAME_DURATION,
  INITIAL_SPAWN_INTERVAL,
  MIN_SPAWN_INTERVAL,
  RADAR_DETECT_RANGE,
  PLAYER_VIEW_ANGLE_DEGREES,
} from './constants';

// Entity counts
const MAX_BULLETS = 600;
const MAX_ZOMBIES = 80;
const MAX_PARTICLES = 800;

// Spawn only inside player front cone
const SPAWN_HALF_ANGLE_RAD = (PLAYER_VIEW_ANGLE_DEGREES / 2) * (Math.PI / 180);
const FLOOR_LEVEL = -1.5;

// Zombie model tuning
const ZOMBIE_TARGET_HEIGHT = 2.0;
const ZOMBIE_MODEL_FORWARD_OFFSET_RAD = 0;
const ZOMBIE_UNIFORM_SCALE = 1.0;
const ZOMBIE_SCALE_FAR = 1;
const ZOMBIE_SCALE_NEAR = 1.5;
const PANORAMA_CENTER_X = 2000;
const CAMERA_START_FOV = 50;
const SHADOW_Y_OFFSET = 0.02;
const SHADOW_BASE_SCALE = 1.55;
const SHADOW_MIN_SCALE = 0.55;
const ZOMBIE_ALT_POSE_CHANCE = 0.5;
const ZOMBIE_ALT_POSE_TRIGGER_DIST_MIN = 15;
const ZOMBIE_ALT_POSE_TRIGGER_DIST_MAX = 30;
const ZOMBIE_ALT_POSE_DURATION_MS = 3500;
const ZOMBIE_RUNNER_SPAWN_CHANCE = 0.3;
const ZOMBIE_RUNNER_SPEED_MULTIPLIER = 1.5;
const ZOMBIE_DEAD_ANIM_SPEED = 2.2;
const ZOMBIE_DEAD_ANIM_DURATION_MS = 900;
const ZOMBIE_DEAD_FALL_DROP_FACTOR = 0.5;
const ZOMBIE_DEAD_FALL_MIN_DROP = 0.65;
const ZOMBIE_DEAD_FALL_MAX_DROP = 1.45;
type HitSphereDefinition = {
  yRatio: number;
  radiusRatio: number;
  critical: boolean;
};

type HitboxTuning = {
  bodyRadiusScale: number;
  headRadiusScale: number;
  headLowerOffsetRatio: number;
  headUpperOffsetRatio: number;
};

// Tune these in source to widen/narrow body/head hit detection.
// Head uses stacked critical spheres so vertical range can grow without only inflating left/right radius.
const HITBOX_TUNING = {
  zombie: {
    bodyRadiusScale: 2.0,
    headRadiusScale: 2.0,
    headLowerOffsetRatio: 0.08,
    headUpperOffsetRatio: 0.08,
  },
  boss: {
    bodyRadiusScale: 2.0,
    headRadiusScale: 2.0,
    headLowerOffsetRatio: 0.08,
    headUpperOffsetRatio: 0.08,
  },
} as const;

function buildHitSpheres(
  baseSpheres: readonly HitSphereDefinition[],
  tuning: HitboxTuning
): HitSphereDefinition[] {
  const expanded = baseSpheres.flatMap((sphere) => {
    const radiusScale = sphere.critical ? tuning.headRadiusScale : tuning.bodyRadiusScale;

    if (!sphere.critical) {
      return [{
        ...sphere,
        radiusRatio: sphere.radiusRatio * radiusScale,
      }];
    }

    return [
      -tuning.headLowerOffsetRatio,
      0,
      tuning.headUpperOffsetRatio,
    ].map((yOffset) => ({
      ...sphere,
      yRatio: THREE.MathUtils.clamp(sphere.yRatio + yOffset, 0, 1.12),
      radiusRatio: sphere.radiusRatio * radiusScale,
    }));
  });

  // Check head hit zones first so enlarged body spheres do not swallow headshots.
  expanded.sort((left, right) => Number(right.critical) - Number(left.critical));
  return expanded;
}

const ZOMBIE_HIT_SPHERES_BASE = [
  { yRatio: 0.34, radiusRatio: 0.15, critical: false },
  { yRatio: 0.6, radiusRatio: 0.19, critical: false },
  { yRatio: 0.84, radiusRatio: 0.18, critical: true },
] as const;
const ZOMBIE_HIT_SPHERES = buildHitSpheres(ZOMBIE_HIT_SPHERES_BASE, HITBOX_TUNING.zombie);

// Boss settings
const BOSS_SPAWN_TIME_LEFT = 20; // seconds
const BOSS_MAX_HP = 30;
const BOSS_SPEED = 2.5; // slower than zombies
const BOSS_SPAWN_DISTANCE = 30; // spawn further away
const BOSS_TARGET_HEIGHT = 5.0; // taller than normal zombies
const BOSS_SHADOW_MIN_SCALE = 2.0;
const BOSS_HIT_SPHERES_BASE = [
  { yRatio: 0.2, radiusRatio: 0.14, critical: false },
  { yRatio: 0.42, radiusRatio: 0.18, critical: false },
  { yRatio: 0.62, radiusRatio: 0.2, critical: false },
  { yRatio: 0.82, radiusRatio: 0.2, critical: true },
] as const;
const BOSS_HIT_SPHERES = buildHitSpheres(BOSS_HIT_SPHERES_BASE, HITBOX_TUNING.boss);

// Weapon sprite tuning (centered in view)
const WEAPON_SPRITE_OFFSET_X = 0.2;
const WEAPON_SPRITE_OFFSET_Y = 0.0;
const WEAPON_SPRITE_OFFSET_Z = -0.66;
const WEAPON_SPRITE_SCALE = 2;
const WEAPON_ANIMATION_FRAME_MS = 28;
const WEAPON_FRAME_Y_LIFT = [0, 0.018, 0.036, 0.052] as const;
// Bullet spawn from muzzle (right-bottom weapon position), then converge to center aim
const BULLET_MUZZLE_RIGHT_OFFSET = 0.54;
const BULLET_MUZZLE_UP_OFFSET = -0.20;
const BULLET_MUZZLE_FORWARD_OFFSET = 0.45;
const BULLET_AIM_DISTANCE = 20;
const BULLET_MUZZLE_JITTER = 0.018;
const BULLET_AIM_JITTER = 0.01;
const CAMERA_BREATH_PITCH_AMPLITUDE = 0.01;
const CAMERA_BREATH_PITCH_SPEED = 0.60;

const COLOR_BULLET = '#fff9a5';
const COLOR_PARTICLE = '#ff0000';
const COLOR_BULLET_TRAIL = '#fffacd';

// R3F JSX workaround (TS intrinsic element)
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const PointLight = 'pointLight' as any;
const BoxGeometry = 'boxGeometry' as any;
const CircleGeometry = 'circleGeometry' as any;
const PlaneGeometry = 'planeGeometry' as any;
const InstancedMesh = 'instancedMesh' as any;
const SphereGeometry = 'sphereGeometry' as any;
const CylinderGeometry = 'cylinderGeometry' as any;
const AmbientLight = 'ambientLight' as any;
const HemisphereLight = 'hemisphereLight' as any;
const DirectionalLight = 'directionalLight' as any;

/** Nearby zombie info for radar UI. */
export interface NearbyZombieRadar {
  angle: number;
  distance: number;
}

export interface GameSceneProps {
  headRotation: React.MutableRefObject<{ yaw: number; pitch: number }>;
  onGameOver: (score: number) => void;
  onPlayerHit: () => void;
  gameStarted: boolean;
  debugMouseControl?: boolean;
  /** PAUSE 오버레이 표시 중이면 true. 게임 로직·타이머 정지 */
  isPaused?: boolean;
  setScore: (cb: (prev: number) => number) => void;
  setTimeLeft: (time: number) => void;
  onNearbyZombies?: (zombies: NearbyZombieRadar[]) => void;
  onBossSpawn?: () => void;
  onBossHPChange?: (hp: number, maxHP: number) => void;
  onBossDefeated?: () => void;
  onHeadshot?: (xPercent: number, yPercent: number, target: 'zombie' | 'boss') => void;
  onZombieSpawnSound?: () => void;
  onShootSound?: () => void;
  onZombieHitSound?: () => void;
}

interface ZombieRenderRig {
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  walkAction: THREE.AnimationAction | null;
  altPoseAction: THREE.AnimationAction | null;
  deadAction: THREE.AnimationAction | null;
  activeMode: 'walk' | 'altPose' | 'dead';
  materials: THREE.Material[];
  originalColors: Map<THREE.Material, THREE.Color>;
  originalEmissives: Map<THREE.Material, THREE.Color>;
}

const configureZombieMaterial = (material: THREE.Material) => {
  const mat = material as any;

  // Color textures must be treated as sRGB to keep original albedo colors.
  if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
  if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;

  // Data textures stay in linear/no-color space.
  const dataMaps = ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'bumpMap', 'displacementMap', 'alphaMap', 'specularMap'];
  for (const key of dataMaps) {
    if (mat[key]) mat[key].colorSpace = THREE.NoColorSpace;
  }

  if (mat.color?.isColor) mat.color.set(0xffffff);
  if (mat.emissive?.isColor) mat.emissive.multiplyScalar(0.85);
  if (typeof mat.toneMapped === 'boolean') mat.toneMapped = false;
  mat.needsUpdate = true;
};

const findClipByName = (clips: THREE.AnimationClip[], pattern: RegExp): THREE.AnimationClip | null => {
  return clips.find((clip) => pattern.test(clip.name)) ?? null;
};

/** Trim `trimFrames` frames from the start and end of a clip (assumes 30 fps if not known). */
const trimClip = (clip: THREE.AnimationClip | null, trimFrames = 1, fps = 30): THREE.AnimationClip | null => {
  if (!clip) return null;
  const trimTime = trimFrames / fps;
  const newStart = trimTime;
  const newEnd = clip.duration - trimTime;
  if (newEnd <= newStart) return clip; // clip too short to trim

  const newTracks: THREE.KeyframeTrack[] = [];
  for (const track of clip.tracks) {
    const valueSize = track.getValueSize();
    const times: number[] = [];
    const values: number[] = [];

    for (let i = 0; i < track.times.length; i++) {
      const t = track.times[i];
      if (t >= newStart && t <= newEnd) {
        times.push(t - newStart);
        for (let v = 0; v < valueSize; v++) {
          values.push(track.values[i * valueSize + v]);
        }
      }
    }

    if (times.length > 0) {
      const newTrack = new (track.constructor as any)(track.name, new Float32Array(times), new Float32Array(values));
      newTracks.push(newTrack);
    }
  }

  if (newTracks.length === 0) return clip;
  return new THREE.AnimationClip(clip.name, newEnd - newStart, newTracks);
};

/** Slice a clip by frame range [startFrame, endFrame] (assumes given fps). */
const sliceClipByFrames = (clip: THREE.AnimationClip | null, startFrame: number, endFrame: number, fps = 30): THREE.AnimationClip | null => {
  if (!clip) return null;
  const newStart = startFrame / fps;
  const newEnd = endFrame / fps;
  if (newEnd <= newStart) return clip;

  const newTracks: THREE.KeyframeTrack[] = [];
  for (const track of clip.tracks) {
    const valueSize = track.getValueSize();
    const times: number[] = [];
    const values: number[] = [];

    for (let i = 0; i < track.times.length; i++) {
      const t = track.times[i];
      if (t >= newStart && t <= newEnd) {
        times.push(t - newStart);
        for (let v = 0; v < valueSize; v++) {
          values.push(track.values[i * valueSize + v]);
        }
      }
    }

    if (times.length > 0) {
      const newTrack = new (track.constructor as any)(track.name, new Float32Array(times), new Float32Array(values));
      newTracks.push(newTrack);
    }
  }

  if (newTracks.length === 0) return clip;
  return new THREE.AnimationClip(clip.name, newEnd - newStart, newTracks);
};

const createZombieRig = (
  source: THREE.Group,
  walkClip: THREE.AnimationClip | null,
  altPoseClip: THREE.AnimationClip | null,
  deadClip: THREE.AnimationClip | null
): ZombieRenderRig => {
  const root = cloneSkeleton(source) as THREE.Group;
  const materials: THREE.Material[] = [];
  const originalColors = new Map<THREE.Material, THREE.Color>();
  const originalEmissives = new Map<THREE.Material, THREE.Color>();

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!materials.includes(mat)) {
          materials.push(mat);
          const m = mat as any;
          // Save original colors BEFORE configureZombieMaterial modifies them
          if (m.color?.isColor) {
            originalColors.set(mat, m.color.clone());
          }
          if (m.emissive?.isColor) {
            originalEmissives.set(mat, m.emissive.clone());
          }
          configureZombieMaterial(mat);
        }
      });
    }
  });

  let mixer: THREE.AnimationMixer | null = null;
  let walkAction: THREE.AnimationAction | null = null;
  let altPoseAction: THREE.AnimationAction | null = null;
  let deadAction: THREE.AnimationAction | null = null;

  if (walkClip || altPoseClip || deadClip) {
    mixer = new THREE.AnimationMixer(root);

    if (walkClip) {
      walkAction = mixer.clipAction(walkClip);
      walkAction.loop = THREE.LoopRepeat;
      walkAction.clampWhenFinished = false;
      walkAction.enabled = true;
      walkAction.play();
    }

    if (altPoseClip) {
      altPoseAction = mixer.clipAction(altPoseClip);
      altPoseAction.loop = THREE.LoopRepeat;
      altPoseAction.clampWhenFinished = false;
      altPoseAction.enabled = true;
      altPoseAction.stop();
    }

    if (deadClip) {
      deadAction = mixer.clipAction(deadClip);
      deadAction.loop = THREE.LoopOnce;
      deadAction.clampWhenFinished = true;
      deadAction.enabled = true;
      deadAction.stop();
    }
  }

  root.visible = false;
  return { root, mixer, walkAction, altPoseAction, deadAction, activeMode: 'walk', materials, originalColors, originalEmissives };
};

const getZombieDistanceScale = (x: number, z: number) => {
  const distance = Math.sqrt(x * x + z * z);
  const proximity = 1 - THREE.MathUtils.clamp(distance / SPAWN_RADIUS, 0, 1);
  return THREE.MathUtils.lerp(ZOMBIE_SCALE_FAR, ZOMBIE_SCALE_NEAR, proximity);
};

const pointToSegmentDistanceSq = (
  point: THREE.Vector3,
  segmentStart: THREE.Vector3,
  segmentEnd: THREE.Vector3,
  tempSegment: THREE.Vector3,
  tempToPoint: THREE.Vector3
) => {
  tempSegment.subVectors(segmentEnd, segmentStart);
  const lengthSq = tempSegment.lengthSq();
  if (lengthSq <= 1e-6) {
    return point.distanceToSquared(segmentStart);
  }

  tempToPoint.subVectors(point, segmentStart);
  const t = THREE.MathUtils.clamp(tempToPoint.dot(tempSegment) / lengthSq, 0, 1);
  tempSegment.multiplyScalar(t).add(segmentStart);
  return point.distanceToSquared(tempSegment);
};

const worldToScreenPercent = (point: THREE.Vector3, camera: THREE.Camera) => {
  const projected = point.clone().project(camera);
  const x = (projected.x * 0.5 + 0.5) * 100;
  const y = (-projected.y * 0.5 + 0.5) * 100;
  return {
    x,
    y,
    visible: projected.z >= -1 && projected.z <= 1 && x >= 0 && x <= 100 && y >= 0 && y <= 100,
  };
};

// ---------- Static 360 background ----------
const PanoramaBackground = () => {
  const { scene } = useThree();
  const panoramaTexture = useLoader(THREE.TextureLoader, background360Url);

  useEffect(() => {
    const previousBackground = scene.background;
    const previousBackgroundRotation = scene.backgroundRotation.clone();
    const textureWidth = Math.max(1, panoramaTexture.image?.width ?? 1);
    const normalizedCenterX = THREE.MathUtils.euclideanModulo(PANORAMA_CENTER_X, textureWidth) / textureWidth;
    const yawOffset = (normalizedCenterX - 0.5) * Math.PI * 2;

    panoramaTexture.mapping = THREE.EquirectangularReflectionMapping;
    panoramaTexture.colorSpace = THREE.SRGBColorSpace;
    panoramaTexture.generateMipmaps = false;
    panoramaTexture.minFilter = THREE.LinearFilter;
    panoramaTexture.magFilter = THREE.LinearFilter;
    panoramaTexture.anisotropy = 1;
    panoramaTexture.needsUpdate = true;

    // Fixed 360 background centered at camera; view changes only with look direction.
    scene.background = panoramaTexture;
    scene.backgroundRotation.set(0, -yawOffset, 0);

    return () => {
      scene.background = previousBackground;
      scene.backgroundRotation.copy(previousBackgroundRotation);
    };
  }, [panoramaTexture, scene]);

  return null;
};

// ---------- Main game logic ----------
const GameController = ({ headRotation, onGameOver, onPlayerHit, gameStarted, debugMouseControl = false, isPaused = false, setScore, setTimeLeft, onNearbyZombies, onBossSpawn, onBossHPChange, onBossDefeated, onHeadshot, onZombieSpawnSound, onShootSound, onZombieHitSound }: GameSceneProps) => {
  const { camera } = useThree();
  // action.fbx contains all models and animations
  const actionTemplate = useLoader(FBXLoader, actionFbxUrl) as THREE.Group;
  const bossTemplate = useLoader(FBXLoader, bossActionFbxUrl) as THREE.Group;
  const zombieTemplate = actionTemplate; // Use action.fbx model for normal zombies
  const zombieRunTemplate = actionTemplate; // Use action.fbx model for runner zombies (same model)
  const weaponIdleTexture = useLoader(THREE.TextureLoader, weaponIdleUrl);
  const weaponFireTexture = useLoader(THREE.TextureLoader, weaponFireUrl);
  const weaponFire2Texture = useLoader(THREE.TextureLoader, weaponFire2Url);
  const weaponFire3Texture = useLoader(THREE.TextureLoader, weaponFire3Url);

  const bulletsData = useRef(
    Array.from({ length: MAX_BULLETS }).map((_, i) => ({
      active: false,
      pos: new THREE.Vector3(0, -500, 0),
      prevPos: new THREE.Vector3(0, -500, 0), // 이전 위치 (궤적용)
      dir: new THREE.Vector3(0, 0, -1),
      id: i,
    }))
  );
  const zombiesData = useRef(
    Array.from({ length: MAX_ZOMBIES }).map((_, i) => ({
      active: false,
      pos: new THREE.Vector3(0, -500, 0),
      speed: 0,
      id: i,
      scale: 1,
      hp: 1,
      maxHP: 1,
      variant: 'normal' as 'normal' | 'runner',
      mode: 'walk' as 'walk' | 'altPose' | 'dead',
      willAltPose: false,
      altPoseTriggered: false,
      altPoseTriggerDistance: ZOMBIE_ALT_POSE_TRIGGER_DIST_MAX,
      altPoseEndAtMs: -Infinity,
      deathStartAtMs: -Infinity,
      deathEndAtMs: -Infinity,
      deathDropAmount: 0,
    }))
  );
  const particlesData = useRef(
    Array.from({ length: MAX_PARTICLES }).map((_, i) => ({
      active: false,
      pos: new THREE.Vector3(0, -500, 0),
      velocity: new THREE.Vector3(),
      life: 0,
      scale: 1,
      id: i,
    }))
  );

  const bulletMeshRef = useRef<THREE.InstancedMesh>(null);
  const bulletTrailMeshRef = useRef<THREE.InstancedMesh>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);
  const zombieShadowMeshRef = useRef<THREE.InstancedMesh>(null);
  const weaponSpriteMeshRef = useRef<THREE.Mesh>(null);
  const weaponSpriteMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  const weaponSpriteGroupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Both normal and runner use the same model from action.fbx
  const zombieTemplateBounds = useMemo(() => new THREE.Box3().setFromObject(actionTemplate), [actionTemplate]);
  const zombieTemplateMinY = useMemo(() => zombieTemplateBounds.min.y, [zombieTemplateBounds]);
  const zombieTemplateHeight = useMemo(() => {
    const size = new THREE.Vector3();
    zombieTemplateBounds.getSize(size);
    return Math.max(0.001, size.y);
  }, [zombieTemplateBounds]);
  const zombieBaseScale = useMemo(() => ZOMBIE_TARGET_HEIGHT / zombieTemplateHeight, [zombieTemplateHeight]);
  // Runner uses same model, so same bounds
  const zombieRunTemplateBounds = zombieTemplateBounds;
  const zombieRunTemplateMinY = zombieTemplateMinY;
  const zombieRunTemplateHeight = zombieTemplateHeight;
  const zombieRunnerBaseScale = zombieBaseScale;

  // Boss bounds and scale
  const bossTemplateBounds = useMemo(() => new THREE.Box3().setFromObject(bossTemplate), [bossTemplate]);
  const bossTemplateMinY = useMemo(() => bossTemplateBounds.min.y, [bossTemplateBounds]);
  const bossTemplateHeight = useMemo(() => {
    const size = new THREE.Vector3();
    bossTemplateBounds.getSize(size);
    return Math.max(0.001, size.y);
  }, [bossTemplateBounds]);
  const bossBaseScale = useMemo(() => BOSS_TARGET_HEIGHT / bossTemplateHeight, [bossTemplateHeight]);

  // Debug: log available clips from action.fbx and bossaction.fbx
  useEffect(() => {
    console.log('[action.fbx] clips:', actionTemplate.animations.map((c) => ({ name: c.name, duration: c.duration.toFixed(2) })));
    console.log('[bossaction.fbx] clips:', bossTemplate.animations.map((c) => ({ name: c.name, duration: c.duration.toFixed(2) })));
  }, [actionTemplate, bossTemplate]);

  // Extract animation clips from action.fbx by name, trim 1 frame from start/end
  const zombieWalkAnimationClip = useMemo(
    () => trimClip(findClipByName(actionTemplate.animations, /walk/i) ?? (actionTemplate.animations[0] ?? null)),
    [actionTemplate]
  );
  const zombieDeadClip = useMemo(
    () => sliceClipByFrames(findClipByName(actionTemplate.animations, /dead/i), 2, 48),
    [actionTemplate]
  );
  const zombieAltPoseClip = useMemo(
    () => sliceClipByFrames(findClipByName(actionTemplate.animations, /alt/i), 50, 150),
    [actionTemplate]
  );
  // Runner uses run animation from action.fbx
  const zombieRunAnimationClip = useMemo(
    () => trimClip(findClipByName(actionTemplate.animations, /run/i)),
    [actionTemplate]
  );

  const zombieNormalRigs = useMemo(() => {
    return Array.from({ length: MAX_ZOMBIES }).map(() => createZombieRig(actionTemplate, zombieWalkAnimationClip, zombieAltPoseClip, zombieDeadClip));
  }, [actionTemplate, zombieWalkAnimationClip, zombieAltPoseClip, zombieDeadClip]);
  const zombieRunnerRigs = useMemo(() => {
    return Array.from({ length: MAX_ZOMBIES }).map(() => createZombieRig(actionTemplate, zombieRunAnimationClip, null, zombieDeadClip));
  }, [actionTemplate, zombieRunAnimationClip, zombieDeadClip]);

  // Boss animation and rig
  const bossWalkClip = useMemo(() => {
    const fromBoss = findClipByName(bossTemplate.animations, /walk/i);
    if (fromBoss) return trimClip(fromBoss);
    // Fallback to action.fbx walk animation
    return zombieWalkAnimationClip;
  }, [bossTemplate, zombieWalkAnimationClip]);
  const bossDeadClip = useMemo(() => {
    const fromBoss = findClipByName(bossTemplate.animations, /dead/i);
    if (fromBoss) return trimClip(fromBoss);
    return zombieDeadClip;
  }, [bossTemplate, zombieDeadClip]);
  const bossRig = useMemo(() => createZombieRig(bossTemplate, bossWalkClip, null, bossDeadClip), [bossTemplate, bossWalkClip, bossDeadClip]);

  const shakeIntensity = useRef(0);
  const shootRecoilOffset = useRef(0);
  const shootRecoilVelocity = useRef(0);
  const gameEndedTriggered = useRef(false);

  const lastFireTime = useRef(0);
  const lastSpawnTime = useRef(0);
  const startTime = useRef(0);
  const localScore = useRef(0);
  const lastReportedTime = useRef(GAME_DURATION + 1);
  const pauseStartRealTime = useRef(0);
  const wasPausedRef = useRef(false);

  // Boss state
  const bossData = useRef({
    active: false,
    hp: BOSS_MAX_HP,
    pos: new THREE.Vector3(0, -500, -BOSS_SPAWN_DISTANCE), // Start hidden
    speed: BOSS_SPEED,
    spawned: false,
    deathStartAtMs: -Infinity,
    deathEndAtMs: -Infinity,
  });
  const bossSpawnTriggered = useRef(false);
  const playerLightRef = useRef<THREE.PointLight>(null);
  const weaponAnimStartTimeRef = useRef(-Infinity);
  const weaponCurrentFrameRef = useRef(0);

  const tempLookDir = useMemo(() => new THREE.Vector3(), []);
  const tempPlayerLightDir = useMemo(() => new THREE.Vector3(), []);
  const tempZombieTarget = useMemo(() => new THREE.Vector3(), []);
  const tempZombieBodyTarget = useMemo(() => new THREE.Vector3(), []);
  const tempCameraRight = useMemo(() => new THREE.Vector3(), []);
  const tempCameraUp = useMemo(() => new THREE.Vector3(), []);
  const tempMuzzlePos = useMemo(() => new THREE.Vector3(), []);
  const tempAimPoint = useMemo(() => new THREE.Vector3(), []);
  const tempBulletUp = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tempBulletQuat = useMemo(() => new THREE.Quaternion(), []);
  const tempTrailVec = useMemo(() => new THREE.Vector3(), []);
  const tempTrailMid = useMemo(() => new THREE.Vector3(), []);
  const tempHitSphereCenter = useMemo(() => new THREE.Vector3(), []);
  const tempHitSegmentClosest = useMemo(() => new THREE.Vector3(), []);
  const tempHitSegmentToPoint = useMemo(() => new THREE.Vector3(), []);
  // WASD ?대룞 湲곕뒫 鍮꾪솢?깊솕 (3D ?붾뱶留듭씠 ?꾨땲?댁꽌 二쇱꽍泥섎━)
  // const debugMoveOffset = useRef(new THREE.Vector3(0, 0, 0));
  // const keyState = useRef({ KeyW: false, KeyA: false, KeyS: false, KeyD: false });

  // useEffect(() => {
  //   const onKeyDown = (e: KeyboardEvent) => {
  //     if (e.code in keyState.current) (keyState.current as any)[e.code] = true;
  //   };
  //   const onKeyUp = (e: KeyboardEvent) => {
  //     if (e.code in keyState.current) (keyState.current as any)[e.code] = false;
  //   };
  //   window.addEventListener('keydown', onKeyDown);
  //   window.addEventListener('keyup', onKeyUp);
  //   return () => {
  //     window.removeEventListener('keydown', onKeyDown);
  //     window.removeEventListener('keyup', onKeyUp);
  //   };
  // }, []);
  const weaponTextures = useMemo(
    () => [weaponIdleTexture, weaponFireTexture, weaponFire2Texture, weaponFire3Texture],
    [weaponIdleTexture, weaponFireTexture, weaponFire2Texture, weaponFire3Texture]
  );
  const weaponSpriteAspect = useMemo(() => {
    const img = weaponTextures[0].image as { width?: number; height?: number } | undefined;
    if (!img?.width || !img?.height) return 1;
    return img.height / img.width;
  }, [weaponTextures]);



  const spawnExplosion = (position: THREE.Vector3, intensity = 1.0) => {
    const particleCount = Math.floor(8 * intensity);
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!particlesData.current[i].active) {
        const p = particlesData.current[i];
        p.active = true;
        p.pos.copy(position);
        p.pos.y += (Math.random() - 0.5) * 0.5; // Slight vertical spread
        p.life = 1.0;
        const speed = 10 + Math.random() * 15 * intensity;
        const angle = Math.random() * Math.PI * 2;
        const vertical = Math.random() * 0.6 + 0.4;
        p.velocity.set(
          Math.cos(angle) * speed,
          vertical * speed * intensity,
          Math.sin(angle) * speed
        );
        p.scale = (Math.random() * 0.5 + 0.3) * intensity;
        spawned++;
        if (spawned >= particleCount) break;
      }
    }
  };

  // 좀비 피격 시 섬광 효과 (작고 빠르게 퍼지는 파티클)
  const spawnFlash = (position: THREE.Vector3) => {
    const particleCount = 20; // 더 많은 파편
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!particlesData.current[i].active) {
        const p = particlesData.current[i];
        p.active = true;
        p.pos.copy(position);
        p.pos.y += (Math.random() - 0.5) * 0.3;
        p.life = 0.38;
        const speed = 24 + Math.random() * 28;
        const angle = Math.random() * Math.PI * 2;
        const vertical = (Math.random() - 0.5) * 0.8;
        p.velocity.set(
          Math.cos(angle) * speed,
          vertical * speed,
          Math.sin(angle) * speed
        );
        p.scale = Math.random() * 0.12 + 0.08;
        spawned++;
        if (spawned >= particleCount) break;
      }
    }
  };

  const setZombieRigMode = (rig: ZombieRenderRig, mode: 'walk' | 'altPose' | 'dead') => {
    if (rig.activeMode === mode) return;

    if (mode === 'dead') {
      rig.walkAction?.fadeOut(0.08);
      rig.altPoseAction?.fadeOut(0.08);
      if (rig.deadAction) {
        rig.deadAction.reset();
        rig.deadAction.setEffectiveTimeScale(ZOMBIE_DEAD_ANIM_SPEED);
        rig.deadAction.fadeIn(0.08).play();
      }
      rig.activeMode = 'dead';
      return;
    }

    if (mode === 'altPose' && rig.altPoseAction) {
      rig.deadAction?.stop();
      rig.walkAction?.fadeOut(0.14);
      rig.altPoseAction.reset().fadeIn(0.14).play();
      rig.activeMode = 'altPose';
      return;
    }

    if (rig.walkAction) {
      rig.altPoseAction?.fadeOut(0.1);
      rig.deadAction?.stop();
      rig.walkAction.reset().fadeIn(0.1).play();
      rig.activeMode = 'walk';
    }
  };



  useEffect(() => {
    weaponTextures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 1;
      texture.needsUpdate = true;
    });

    if (weaponSpriteMaterialRef.current) {
      weaponSpriteMaterialRef.current.map = weaponTextures[0];
      weaponSpriteMaterialRef.current.needsUpdate = true;
    }
    weaponCurrentFrameRef.current = 0;
    weaponAnimStartTimeRef.current = -Infinity;
  }, [weaponTextures]);

  useEffect(() => {
    if (gameStarted) {
      startTime.current = 0;
      localScore.current = 0;
      lastReportedTime.current = GAME_DURATION + 1;
      shakeIntensity.current = 0;
      shootRecoilOffset.current = 0;
      shootRecoilVelocity.current = 0;
      gameEndedTriggered.current = false;

      bulletsData.current.forEach((b) => {
        b.active = false;
        b.pos.set(0, -500, 0);
        b.prevPos.set(0, -500, 0);
      });
      zombiesData.current.forEach((z) => {
        z.active = false;
        z.pos.set(0, -500, 0);
        z.hp = 1;
        z.maxHP = 1;
        z.variant = 'normal';
        z.mode = 'walk';
        z.willAltPose = false;
        z.altPoseTriggered = false;
        z.altPoseTriggerDistance = ZOMBIE_ALT_POSE_TRIGGER_DIST_MAX;
        z.altPoseEndAtMs = -Infinity;
        z.deathStartAtMs = -Infinity;
        z.deathEndAtMs = -Infinity;
        z.deathDropAmount = 0;
      });
      particlesData.current.forEach((p) => {
        p.active = false;
        p.pos.set(0, -500, 0);
      });
      zombieNormalRigs.forEach((rig) => {
        rig.root.visible = false;
        rig.walkAction?.reset().play();
        rig.altPoseAction?.stop();
        rig.deadAction?.stop();
        rig.activeMode = 'walk';
      });
      zombieRunnerRigs.forEach((rig) => {
        rig.root.visible = false;
        rig.walkAction?.reset().play();
        rig.altPoseAction?.stop();
        rig.deadAction?.stop();
        rig.activeMode = 'walk';
      });

      if (weaponSpriteMaterialRef.current) {
        weaponSpriteMaterialRef.current.map = weaponTextures[0];
        weaponSpriteMaterialRef.current.needsUpdate = true;
      }
      weaponCurrentFrameRef.current = 0;
      weaponAnimStartTimeRef.current = -Infinity;

      // Reset boss
      bossData.current.active = false;
      bossData.current.hp = BOSS_MAX_HP;
      bossData.current.pos.set(0, -500, -BOSS_SPAWN_DISTANCE); // Hidden position
      bossData.current.spawned = false;
      bossData.current.deathStartAtMs = -Infinity;
      bossData.current.deathEndAtMs = -Infinity;
      bossSpawnTriggered.current = false;

      // Keep visible but hidden underground to pre-compile shaders
      bossRig.root.visible = true;
      bossRig.root.position.set(0, -500, 0);
      bossRig.walkAction?.reset().play();
      bossRig.deadAction?.stop();
      bossRig.activeMode = 'walk';
    }
  }, [gameStarted, zombieNormalRigs, zombieRunnerRigs, weaponTextures, bossRig]);

  useFrame((state) => {
    const now = Date.now();
    const delta = 0.016;
    const time = state.clock.elapsedTime;
    const boss = bossData.current;

    // Camera + shake
    const yaw = headRotation.current.yaw || 0;
    const pitch = headRotation.current.pitch || 0;
    let camX = 0;
    let camY = 0.6;
    let camZ = 0;
    if (shakeIntensity.current > 0) {
      shakeIntensity.current = THREE.MathUtils.lerp(shakeIntensity.current, 0, 0.1);
      const sx = (Math.random() - 0.5) * shakeIntensity.current;
      const sy = (Math.random() - 0.5) * shakeIntensity.current;
      camX += sx;
      camY += sy;
      camZ += shakeIntensity.current * 0.5;
    }

    // Spring recoil (per-shot up-kick + recovery)
    shootRecoilVelocity.current += (-shootRecoilOffset.current * 120 - shootRecoilVelocity.current * 24) * delta;
    shootRecoilOffset.current += shootRecoilVelocity.current * delta;
    shootRecoilOffset.current = THREE.MathUtils.clamp(shootRecoilOffset.current, -0.12, 0.12);

    // WASD ?대룞 湲곕뒫 鍮꾪솢?깊솕 (3D ?붾뱶留듭씠 ?꾨땲?댁꽌 二쇱꽍泥섎━)
    // Debug mouse mode only: WASD free move
    // if (debugMouseControl) {
    //   const moveSpeed = 5.0 * delta;
    //   const forwardX = -Math.sin(yaw);
    //   const forwardZ = -Math.cos(yaw);
    //   const rightX = Math.cos(yaw);
    //   const rightZ = -Math.sin(yaw);
    //   if (keyState.current.KeyW) {
    //     debugMoveOffset.current.x += forwardX * moveSpeed;
    //     debugMoveOffset.current.z += forwardZ * moveSpeed;
    //   }
    //   if (keyState.current.KeyS) {
    //     debugMoveOffset.current.x -= forwardX * moveSpeed;
    //     debugMoveOffset.current.z -= forwardZ * moveSpeed;
    //   }
    //   if (keyState.current.KeyA) {
    //     debugMoveOffset.current.x -= rightX * moveSpeed;
    //     debugMoveOffset.current.z -= rightZ * moveSpeed;
    //   }
    //   if (keyState.current.KeyD) {
    //     debugMoveOffset.current.x += rightX * moveSpeed;
    //     debugMoveOffset.current.z += rightZ * moveSpeed;
    //   }
    // } else {
    //   debugMoveOffset.current.set(0, 0, 0);
    // }

    camera.position.set(camX, camY, camZ);
    const playerWorldX = 0; // ?뚮젅?댁뼱 ?꾩튂????긽 ?먯젏
    const playerWorldZ = 0; // ?뚮젅?댁뼱 ?꾩튂????긽 ?먯젏
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -yaw, 0.2);
    const breathPitch = Math.sin(time * CAMERA_BREATH_PITCH_SPEED * Math.PI * 2) * CAMERA_BREATH_PITCH_AMPLITUDE;
    const targetPitch = pitch + breathPitch - shootRecoilOffset.current * 0.35;
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetPitch, 0.18);

    if (weaponSpriteGroupRef.current) {
      weaponSpriteGroupRef.current.rotation.copy(camera.rotation);
      weaponSpriteGroupRef.current.position.copy(camera.position);
    }

    let nextWeaponFrame = 0;
    const elapsedSinceAnimStart = now - weaponAnimStartTimeRef.current;
    if (elapsedSinceAnimStart >= 0) {
      const firingFrame = Math.floor(elapsedSinceAnimStart / WEAPON_ANIMATION_FRAME_MS) + 1;
      if (firingFrame >= 1 && firingFrame <= 3) {
        nextWeaponFrame = firingFrame;
      }
    }

    if (weaponSpriteMaterialRef.current && nextWeaponFrame !== weaponCurrentFrameRef.current) {
      weaponCurrentFrameRef.current = nextWeaponFrame;
      weaponSpriteMaterialRef.current.map = weaponTextures[nextWeaponFrame];
      weaponSpriteMaterialRef.current.needsUpdate = true;
    }
    if (weaponSpriteMeshRef.current) {
      const frameLift = WEAPON_FRAME_Y_LIFT[nextWeaponFrame] ?? 0;
      weaponSpriteMeshRef.current.position.set(
        WEAPON_SPRITE_OFFSET_X,
        WEAPON_SPRITE_OFFSET_Y + frameLift,
        WEAPON_SPRITE_OFFSET_Z
      );
      // slight pitch on firing frames
      weaponSpriteMeshRef.current.rotation.set(-frameLift * 2.0, 0, 0);
    }
    if (playerLightRef.current) {
      camera.getWorldDirection(tempPlayerLightDir);
      playerLightRef.current.position.set(
        camera.position.x + tempPlayerLightDir.x * 1.6,
        camera.position.y - 0.05 + tempPlayerLightDir.y * 1.6,
        camera.position.z + tempPlayerLightDir.z * 1.6
      );
      playerLightRef.current.intensity = 2.2 + Math.sin(time * 10) * 0.18;
    }

    // Main game loop
    if (gameStarted) {
      if (isPaused) {
        if (!wasPausedRef.current) {
          pauseStartRealTime.current = state.clock.elapsedTime;
          wasPausedRef.current = true;
        }
        return;
      }
      if (wasPausedRef.current) {
        startTime.current += state.clock.elapsedTime - pauseStartRealTime.current;
        wasPausedRef.current = false;
      }
      if (startTime.current === 0) startTime.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - startTime.current;
      const remainingTime = Math.max(0, GAME_DURATION - elapsed);

      if (Math.ceil(remainingTime) !== lastReportedTime.current) {
        setTimeLeft(remainingTime);
        lastReportedTime.current = Math.ceil(remainingTime);
      }

      // Boss spawn at 10 seconds remaining
      if (remainingTime <= BOSS_SPAWN_TIME_LEFT && !bossSpawnTriggered.current) {
        bossSpawnTriggered.current = true;
        bossData.current.active = true;
        bossData.current.spawned = true;
        bossData.current.hp = BOSS_MAX_HP;
        bossData.current.pos.set(playerWorldX, FLOOR_LEVEL, playerWorldZ - BOSS_SPAWN_DISTANCE);
        bossRig.root.visible = true;
        bossRig.walkAction?.reset().play();
        bossRig.activeMode = 'walk';
        if (onBossSpawn) onBossSpawn();
        if (onBossHPChange) onBossHPChange(BOSS_MAX_HP, BOSS_MAX_HP);
      }

      if (remainingTime <= 0 && !gameEndedTriggered.current) {
        gameEndedTriggered.current = true;
        onGameOver(localScore.current);
        return;
      }

      // Stop game logic when boss is dying (wait for death animation to finish)
      const bossIsDying = boss.deathStartAtMs !== -Infinity && now < boss.deathEndAtMs;

      // Auto fire (disabled when boss is dying)
      if (!bossIsDying && now - lastFireTime.current > FIRE_RATE) {
        lastFireTime.current = now;
        weaponAnimStartTimeRef.current = now;
        onShootSound?.();
        // Fire recoil kick: instant upward impulse, then spring-down recovery
        shootRecoilVelocity.current += 1.05;
        shootRecoilOffset.current = THREE.MathUtils.clamp(shootRecoilOffset.current, -0.09, 0.09);
        const bullet = bulletsData.current.find((b) => !b.active);
        if (bullet) {
          bullet.active = true;
          camera.getWorldDirection(tempLookDir);
          tempLookDir.normalize();

          // Build camera basis vectors
          tempCameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
          tempCameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();

          // Spawn from weapon muzzle area (right-bottom of view)
          tempMuzzlePos
            .copy(camera.position)
            .addScaledVector(tempCameraRight, BULLET_MUZZLE_RIGHT_OFFSET)
            .addScaledVector(tempCameraUp, BULLET_MUZZLE_UP_OFFSET)
            .addScaledVector(tempLookDir, BULLET_MUZZLE_FORWARD_OFFSET);

          // Per-shot tiny muzzle variation
          tempMuzzlePos
            .addScaledVector(tempCameraRight, (Math.random() - 0.5) * BULLET_MUZZLE_JITTER)
            .addScaledVector(tempCameraUp, (Math.random() - 0.5) * BULLET_MUZZLE_JITTER);

          // Aim to center crosshair line so shot travels from muzzle toward center
          tempAimPoint.copy(camera.position).addScaledVector(tempLookDir, BULLET_AIM_DISTANCE);
          tempAimPoint
            .addScaledVector(tempCameraRight, (Math.random() - 0.5) * BULLET_AIM_JITTER)
            .addScaledVector(tempCameraUp, (Math.random() - 0.5) * BULLET_AIM_JITTER);
          bullet.dir.copy(tempAimPoint.sub(tempMuzzlePos).normalize());
          bullet.pos.copy(tempMuzzlePos);

          // Create immediate short streak from muzzle
          bullet.prevPos.copy(tempMuzzlePos).addScaledVector(bullet.dir, -0.22);
        }
      }

      // Zombie spawn (disabled when boss is dying)
      const progress = elapsed / GAME_DURATION;
      if (!bossIsDying) {
        const currentSpawnInterval = THREE.MathUtils.lerp(INITIAL_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, progress);

        if (now - lastSpawnTime.current > currentSpawnInterval) {
          lastSpawnTime.current = now;
          const zombieIndex = zombiesData.current.findIndex((z) => !z.active);
          if (zombieIndex !== -1) {
            const zombie = zombiesData.current[zombieIndex];
            const normalRig = zombieNormalRigs[zombieIndex];
            const runnerRig = zombieRunnerRigs[zombieIndex];
            const isRunner = zombieRunAnimationClip != null && Math.random() < ZOMBIE_RUNNER_SPAWN_CHANCE;
            zombie.active = true;
            onZombieSpawnSound?.();
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2 * SPAWN_HALF_ANGLE_RAD;
            zombie.pos.set(playerWorldX + Math.cos(angle) * SPAWN_RADIUS, FLOOR_LEVEL, playerWorldZ + Math.sin(angle) * SPAWN_RADIUS);
            const baseSpeed = ZOMBIE_BASE_SPEED + progress * 15;
            zombie.speed = isRunner ? baseSpeed * ZOMBIE_RUNNER_SPEED_MULTIPLIER : baseSpeed;
            zombie.scale = ZOMBIE_UNIFORM_SCALE;
            zombie.maxHP = 1;
            zombie.hp = zombie.maxHP;
            zombie.variant = isRunner ? 'runner' : 'normal';
            zombie.deathStartAtMs = -Infinity;
            zombie.deathEndAtMs = -Infinity;
            zombie.deathDropAmount = 0;
            zombie.mode = 'walk';
            zombie.altPoseTriggered = false;
            zombie.altPoseEndAtMs = -Infinity;
            if (isRunner) {
              // Runner zombies don't use altPose
              zombie.willAltPose = false;
              zombie.altPoseTriggerDistance = ZOMBIE_ALT_POSE_TRIGGER_DIST_MAX;
              setZombieRigMode(runnerRig, 'walk');
              normalRig.root.visible = false;
            } else {
              // Normal zombies: random chance to do altPose when close to player
              zombie.willAltPose = zombieAltPoseClip != null && Math.random() < ZOMBIE_ALT_POSE_CHANCE;
              zombie.altPoseTriggerDistance =
                ZOMBIE_ALT_POSE_TRIGGER_DIST_MIN +
                Math.random() * (ZOMBIE_ALT_POSE_TRIGGER_DIST_MAX - ZOMBIE_ALT_POSE_TRIGGER_DIST_MIN);
              setZombieRigMode(normalRig, 'walk');
              runnerRig.root.visible = false;
            }
          }
        }
      } // end bossIsDying spawn check

      // Bullet simulation
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = bulletsData.current[i];
        if (b.active) {
          b.prevPos.copy(b.pos); // ?댁쟾 ?꾩튂 ???(沅ㅼ쟻??
          b.pos.addScaledVector(b.dir, BULLET_SPEED * delta);
          if (b.pos.distanceToSquared(camera.position) > (SPAWN_RADIUS * 2) * (SPAWN_RADIUS * 2)) b.active = false;
        }
      }

      // Particle simulation
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particlesData.current[i];
        if (p.active) {
          p.pos.addScaledVector(p.velocity, delta);
          p.velocity.y -= 20 * delta;
          p.life -= delta * 2;
          if (p.life <= 0 || p.pos.y < FLOOR_LEVEL) p.active = false;
        }
      }

      // Zombie movement + collisions
      const playerPos = new THREE.Vector2(playerWorldX, playerWorldZ);
      const zombiePos = new THREE.Vector2();

      for (let i = 0; i < MAX_ZOMBIES; i++) {
        const z = zombiesData.current[i];
        if (z.active) {
          const rig = z.variant === 'runner' ? zombieRunnerRigs[i] : zombieNormalRigs[i];

          if (z.mode === 'dead') {
            if (now >= z.deathEndAtMs) {
              z.active = false;
            }
            continue;
          }

          // Skip zombie movement and collision when boss is dying
          if (bossIsDying) {
            continue;
          }

          if (z.mode === 'walk') {
            tempZombieTarget.set(playerWorldX, FLOOR_LEVEL, playerWorldZ).sub(z.pos);
            tempZombieTarget.y = 0;
            tempZombieTarget.normalize();
            z.pos.addScaledVector(tempZombieTarget, z.speed * delta);

            const distToPlayer = Math.hypot(z.pos.x - playerWorldX, z.pos.z - playerWorldZ);
            if (z.variant === 'normal' && z.willAltPose && !z.altPoseTriggered && distToPlayer <= z.altPoseTriggerDistance) {
              z.altPoseTriggered = true;
              z.mode = 'altPose';
              z.altPoseEndAtMs = now + ZOMBIE_ALT_POSE_DURATION_MS;
              setZombieRigMode(rig, 'altPose');
            }
          }

          if (z.mode === 'altPose' && now >= z.altPoseEndAtMs) {
            z.mode = 'walk';
            setZombieRigMode(rig, 'walk');
          }

          // Player collision
          zombiePos.set(z.pos.x, z.pos.z);
          if (zombiePos.distanceTo(playerPos) < 2.2) {
            z.active = false;
            spawnExplosion(z.pos);
            shakeIntensity.current = 1.0;
            onPlayerHit();
            continue;
          }

          // Bullet collision
          for (let j = 0; j < MAX_BULLETS; j++) {
            const b = bulletsData.current[j];
            if (!b.active) continue;

            const distanceScale = getZombieDistanceScale(z.pos.x - playerWorldX, z.pos.z - playerWorldZ);
            const visualScale = z.scale * distanceScale;
            const zombieHeight = ZOMBIE_TARGET_HEIGHT * visualScale;
            let hitZombie = false;

            for (const hitSphere of ZOMBIE_HIT_SPHERES) {
              tempHitSphereCenter.set(
                z.pos.x,
                z.pos.y + zombieHeight * hitSphere.yRatio,
                z.pos.z
              );

              const hitRadius = Math.max(0.18, zombieHeight * hitSphere.radiusRatio);
              const hitDistSq = pointToSegmentDistanceSq(
                tempHitSphereCenter,
                b.prevPos,
                b.pos,
                tempHitSegmentClosest,
                tempHitSegmentToPoint
              );

              if (hitDistSq > hitRadius * hitRadius) continue;

              b.active = false;
              const isHeadshot = hitSphere.critical;
              const damage = 1;
              z.hp = Math.max(0, z.hp - damage);
              tempZombieBodyTarget.copy(tempHitSegmentClosest);
              spawnFlash(tempZombieBodyTarget);
              spawnExplosion(tempZombieBodyTarget, z.hp <= 0 ? 2.2 : 1.3);
              onZombieHitSound?.();

              if (isHeadshot && onHeadshot) {
                const screen = worldToScreenPercent(tempHitSphereCenter, camera);
                if (screen.visible) {
                  onHeadshot(screen.x, screen.y, 'zombie');
                }
              }

              if (z.hp <= 0) {
                z.mode = 'dead';
                z.deathStartAtMs = now;
                const deadClipDurationMs = rig.deadAction?.getClip().duration
                  ? (rig.deadAction.getClip().duration * 1000) / ZOMBIE_DEAD_ANIM_SPEED
                  : ZOMBIE_DEAD_ANIM_DURATION_MS;
                z.deathEndAtMs = now + Math.max(250, deadClipDurationMs);
                const drop = zombieHeight * ZOMBIE_DEAD_FALL_DROP_FACTOR;
                z.deathDropAmount = THREE.MathUtils.clamp(drop, ZOMBIE_DEAD_FALL_MIN_DROP, ZOMBIE_DEAD_FALL_MAX_DROP);
                setZombieRigMode(rig, 'dead');
                localScore.current += 10;
                setScore((s) => s + 10);
              }

              hitZombie = true;
              break;
            }

            if (hitZombie) {
              break;
            }
          }
        }
      }

      // Radar data
      const nearby: NearbyZombieRadar[] = [];
      for (let i = 0; i < MAX_ZOMBIES; i++) {
        const z = zombiesData.current[i];
        if (!z.active) continue;
        const dx = z.pos.x - playerWorldX;
        const dz = z.pos.z - playerWorldZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > RADAR_DETECT_RANGE) continue;
        const angle = Math.atan2(dx, -dz);
        nearby.push({ angle, distance: dist });
      }
      if (onNearbyZombies) onNearbyZombies(nearby);

      // Boss movement and collision
      if (boss.active && boss.hp > 0 && !bossIsDying) {
        // Move boss towards player
        tempZombieTarget.set(playerWorldX, FLOOR_LEVEL, playerWorldZ).sub(boss.pos);
        tempZombieTarget.y = 0;
        tempZombieTarget.normalize();
        boss.pos.addScaledVector(tempZombieTarget, boss.speed * delta);

        // Player collision - game over
        const bossPos2D = new THREE.Vector2(boss.pos.x, boss.pos.z);
        const playerPos2D = new THREE.Vector2(playerWorldX, playerWorldZ);
        if (bossPos2D.distanceTo(playerPos2D) < 2.5) {
          gameEndedTriggered.current = true;
          onPlayerHit();
          onGameOver(localScore.current);
          return;
        }

        // Bullet collision
        for (let j = 0; j < MAX_BULLETS; j++) {
          const b = bulletsData.current[j];
          if (!b.active) continue;

          let hitBoss = false;
          for (const hitSphere of BOSS_HIT_SPHERES) {
            tempHitSphereCenter.set(
              boss.pos.x,
              boss.pos.y + BOSS_TARGET_HEIGHT * hitSphere.yRatio,
              boss.pos.z
            );

            const hitRadius = BOSS_TARGET_HEIGHT * hitSphere.radiusRatio;
            const hitDistSq = pointToSegmentDistanceSq(
              tempHitSphereCenter,
              b.prevPos,
              b.pos,
              tempHitSegmentClosest,
              tempHitSegmentToPoint
            );

            if (hitDistSq > hitRadius * hitRadius) continue;

            b.active = false;
            const isHeadshot = hitSphere.critical;
            const damage = isHeadshot ? 2 : 1;
            boss.hp = Math.max(0, boss.hp - damage);
            if (onBossHPChange) onBossHPChange(boss.hp, BOSS_MAX_HP);
            tempZombieBodyTarget.copy(tempHitSegmentClosest);
            spawnFlash(tempZombieBodyTarget);
            spawnExplosion(tempZombieBodyTarget, 2.0);
            onZombieHitSound?.();

            if (isHeadshot && onHeadshot) {
              const screen = worldToScreenPercent(tempHitSphereCenter, camera);
              if (screen.visible) {
                onHeadshot(screen.x, screen.y, 'boss');
              }
            }

            hitBoss = true;

            if (boss.hp <= 0 && boss.deathStartAtMs === -Infinity) {
              // Boss defeated - kill all zombies and play boss death animation
              boss.deathStartAtMs = now;
              const deadClipDurationMs = bossRig.deadAction?.getClip().duration
                ? (bossRig.deadAction.getClip().duration * 1000) / ZOMBIE_DEAD_ANIM_SPEED
                : ZOMBIE_DEAD_ANIM_DURATION_MS;
              boss.deathEndAtMs = now + Math.max(250, deadClipDurationMs);
              setZombieRigMode(bossRig, 'dead');

              // Kill all active zombies
              for (let i = 0; i < MAX_ZOMBIES; i++) {
                const z = zombiesData.current[i];
                if (z.active && z.mode !== 'dead') {
                  z.mode = 'dead';
                  z.deathStartAtMs = now;
                  z.deathEndAtMs = now + Math.max(250, ZOMBIE_DEAD_ANIM_DURATION_MS);
                  const rig = z.variant === 'runner' ? zombieRunnerRigs[i] : zombieNormalRigs[i];
                  setZombieRigMode(rig, 'dead');
                }
              }

              if (onBossDefeated) onBossDefeated();
              localScore.current += 500;
              setScore((s) => s + 500);
            }
            break;
          }

          if (hitBoss) {
            break;
          }
        }
      }

      // Boss death animation finished - trigger victory
      if (boss.deathStartAtMs !== -Infinity && now >= boss.deathEndAtMs && !gameEndedTriggered.current) {
        gameEndedTriggered.current = true;
        onGameOver(localScore.current);
        return;
      }
    } else if (onNearbyZombies) {
      onNearbyZombies([]);
    }

    // Bullet render updates (thin projectile, not round dots)
    if (bulletMeshRef.current) {
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = bulletsData.current[i];
        if (b.active) {
          // Slightly ahead along direction so the projectile feels like a streak
          dummy.position.copy(b.pos).addScaledVector(b.dir, 0.12);
          tempBulletQuat.setFromUnitVectors(tempBulletUp, b.dir);
          dummy.quaternion.copy(tempBulletQuat);
          dummy.scale.set(1, 1, 1);
        } else {
          dummy.position.set(0, -500, 0);
          dummy.scale.set(0, 0, 0);
          dummy.quaternion.set(0, 0, 0, 1);
        }
        dummy.updateMatrix();
        bulletMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      bulletMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Bullet trail render updates (궤적)
    if (bulletTrailMeshRef.current) {
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = bulletsData.current[i];
        if (b.active) {
          // 현재 위치와 이전 위치 사이의 거리와 방향 계산
          tempTrailVec.subVectors(b.pos, b.prevPos);
          const trailLength = tempTrailVec.length();

          if (trailLength > 0.01) {
            tempTrailVec.normalize();
            // 중간점 계산
            tempTrailMid.addVectors(b.prevPos, b.pos).multiplyScalar(0.5);

            // 원기둥을 궤적 방향으로 회전
            dummy.position.copy(tempTrailMid);
            // Thin and long trail
            dummy.scale.set(0.015, Math.max(0.18, trailLength * 1.25), 0.015);

            // 방향 벡터를 회전으로 변환 (Y축을 trailVec 방향으로)
            tempBulletQuat.setFromUnitVectors(tempBulletUp, tempTrailVec);
            dummy.quaternion.copy(tempBulletQuat);
          } else {
            dummy.position.set(0, -500, 0);
            dummy.scale.set(0, 0, 0);
            dummy.quaternion.set(0, 0, 0, 1);
          }
        } else {
          dummy.position.set(0, -500, 0);
          dummy.scale.set(0, 0, 0);
          dummy.quaternion.set(0, 0, 0, 1);
        }
        dummy.updateMatrix();
        bulletTrailMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      bulletTrailMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Particle render updates
    if (particleMeshRef.current) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particlesData.current[i];
        if (p.active) {
          dummy.position.copy(p.pos);
          dummy.scale.set(p.scale * p.life, p.scale * p.life, p.scale * p.life);
          dummy.rotation.set(Math.random(), Math.random(), Math.random());
        } else {
          dummy.position.set(0, -500, 0);
          dummy.scale.set(0, 0, 0);
        }
        dummy.updateMatrix();
        particleMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      particleMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Zombie blob shadow render updates (including boss at index MAX_ZOMBIES)
    if (zombieShadowMeshRef.current) {
      for (let i = 0; i < MAX_ZOMBIES; i++) {
        const z = zombiesData.current[i];
        if (z.active) {
          const distanceScale = getZombieDistanceScale(z.pos.x - playerWorldX, z.pos.z - playerWorldZ);
          const baseScale = z.variant === 'runner' ? zombieRunnerBaseScale : zombieBaseScale;
          const finalScale = baseScale * z.scale * distanceScale;
          const shadowScale = Math.max(SHADOW_MIN_SCALE, finalScale * SHADOW_BASE_SCALE);

          dummy.position.set(z.pos.x, FLOOR_LEVEL + SHADOW_Y_OFFSET, z.pos.z);
          dummy.rotation.set(-Math.PI / 2, 0, 0);
          dummy.scale.set(shadowScale, shadowScale * 0.82, 1);
        } else {
          dummy.position.set(0, -500, 0);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(0, 0, 0);
        }
        dummy.updateMatrix();
        zombieShadowMeshRef.current.setMatrixAt(i, dummy.matrix);
      }

      zombieShadowMeshRef.current.count = MAX_ZOMBIES + 1;

      // Add boss shadow at the end
      if (boss.active || (boss.deathStartAtMs !== -Infinity && now < boss.deathEndAtMs)) {
        const bossShadowScale = Math.max(BOSS_SHADOW_MIN_SCALE, bossBaseScale * SHADOW_BASE_SCALE * 1.8);
        dummy.position.set(boss.pos.x, FLOOR_LEVEL + SHADOW_Y_OFFSET + 0.08, boss.pos.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(bossShadowScale, bossShadowScale * 0.82, 1);
      } else {
        dummy.position.set(0, -500, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0, 0, 0);
      }
      dummy.updateMatrix();
      zombieShadowMeshRef.current.setMatrixAt(MAX_ZOMBIES, dummy.matrix);

      zombieShadowMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Zombie model render updates + embedded animation playback
    for (let i = 0; i < MAX_ZOMBIES; i++) {
      const z = zombiesData.current[i];
      const normalRig = zombieNormalRigs[i];
      const runnerRig = zombieRunnerRigs[i];
      const rig = z.variant === 'runner' ? runnerRig : normalRig;
      const hiddenRig = z.variant === 'runner' ? normalRig : runnerRig;

      if (!z.active) {
        normalRig.root.visible = false;
        runnerRig.root.visible = false;
        continue;
      }

      hiddenRig.root.visible = false;

      if (!rig.root.visible) {
        const targetMode = z.mode === 'dead' ? 'dead' : z.variant === 'runner' ? 'walk' : z.mode;
        setZombieRigMode(rig, targetMode);
      }
      rig.root.visible = true;
      const targetMode = z.mode === 'dead' ? 'dead' : z.variant === 'runner' ? 'walk' : z.mode;
      setZombieRigMode(rig, targetMode);
      rig.mixer?.update(delta);


      const distanceScale = getZombieDistanceScale(z.pos.x - playerWorldX, z.pos.z - playerWorldZ);
      const baseScale = z.variant === 'runner' ? zombieRunnerBaseScale : zombieBaseScale;
      const meshMinY = z.variant === 'runner' ? zombieRunTemplateMinY : zombieTemplateMinY;
      const finalScale = baseScale * z.scale * distanceScale;

      const yawToPlayer = Math.atan2(playerWorldX - z.pos.x, playerWorldZ - z.pos.z);

      rig.root.position.set(
        z.pos.x,
        FLOOR_LEVEL - meshMinY * finalScale,
        z.pos.z
      );
      rig.root.rotation.set(0, yawToPlayer + ZOMBIE_MODEL_FORWARD_OFFSET_RAD, 0);
      rig.root.scale.setScalar(finalScale);
    }

    // Boss render updates + animation playback
    if (boss.active || (boss.deathStartAtMs !== -Infinity && now < boss.deathEndAtMs)) {
      bossRig.mixer?.update(delta);

      const yawToPlayer = Math.atan2(playerWorldX - boss.pos.x, playerWorldZ - boss.pos.z);
      // Ensure boss feet touch the floor
      // When dead, lower by 0.3
      const isDead = boss.deathStartAtMs !== -Infinity && now < boss.deathEndAtMs;
      const yOffset = isDead ? -0.6 : 0;
      bossRig.root.position.set(
        boss.pos.x,
        FLOOR_LEVEL - bossTemplateMinY * bossBaseScale + yOffset,
        boss.pos.z
      );
      bossRig.root.rotation.set(0, yawToPlayer + ZOMBIE_MODEL_FORWARD_OFFSET_RAD, 0);
      bossRig.root.scale.setScalar(bossBaseScale);
      bossRig.root.visible = true;
    } else {
      // Keep visible but move underground to avoid shader compile stutter
      bossRig.root.position.set(0, -500, 0);
      bossRig.root.visible = true;
    }
  });

  return (
    <>
      {zombieNormalRigs.map((rig, idx) => (
        <primitive key={idx} object={rig.root} />
      ))}
      {zombieRunnerRigs.map((rig, idx) => (
        <primitive key={`runner-${idx}`} object={rig.root} />
      ))}

      <primitive object={bossRig.root} />

      <Group ref={weaponSpriteGroupRef}>
        <Mesh
          ref={weaponSpriteMeshRef}
          position={[WEAPON_SPRITE_OFFSET_X, WEAPON_SPRITE_OFFSET_Y, WEAPON_SPRITE_OFFSET_Z]}
          scale={[WEAPON_SPRITE_SCALE, WEAPON_SPRITE_SCALE * weaponSpriteAspect, 1]}
          renderOrder={2500}
        >
          <PlaneGeometry args={[1, 1]} />
          <MeshBasicMaterial
            ref={weaponSpriteMaterialRef}
            map={weaponTextures[0]}
            transparent
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </Mesh>
      </Group>

      {/* 총알 궤적 (먼저 렌더링) */}
      <InstancedMesh ref={bulletTrailMeshRef} args={[undefined, undefined, MAX_BULLETS]} frustumCulled={false}>
        <CylinderGeometry args={[0.03, 0.03, 1, 8]} />
        <MeshBasicMaterial
          color={COLOR_BULLET_TRAIL}
          depthWrite={false}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </InstancedMesh>

      {/* 총알 본체 */}
      <InstancedMesh ref={bulletMeshRef} args={[undefined, undefined, MAX_BULLETS]} frustumCulled={false}>
        <CylinderGeometry args={[0.012, 0.012, 0.38, 6]} />
        <MeshBasicMaterial
          color={COLOR_BULLET}
          transparent
          opacity={0.7}
          depthWrite={false}
          toneMapped={false}
        />
      </InstancedMesh>

      <InstancedMesh ref={particleMeshRef} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
        <BoxGeometry args={[0.03, 0.03, 0.2]} />
        <MeshBasicMaterial color={COLOR_PARTICLE} transparent opacity={0.8} />
      </InstancedMesh>

      <InstancedMesh ref={zombieShadowMeshRef} args={[undefined, undefined, MAX_ZOMBIES + 1]} frustumCulled={false}>
        <CircleGeometry args={[1, 20]} />
        <MeshBasicMaterial color="#000000" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </InstancedMesh>

      <AmbientLight intensity={0.38} />
      <HemisphereLight skyColor="#ffffff" groundColor="#3f3f48" intensity={0.75} />
      <DirectionalLight position={[12, 22, 8]} intensity={2.0} color="#ffffff" />
      <DirectionalLight position={[-10, 10, -12]} intensity={0.55} color="#fff2dd" />
      <PointLight position={[0, 5, -15]} intensity={5.4} distance={60} decay={2} color="#ffd7c2" />
      <PointLight ref={playerLightRef} intensity={2.2} distance={14} decay={2} color="#ffffff" />
    </>
  );
};

// ---------- Canvas wrapper ----------
export const GameCanvas = (props: GameSceneProps) => {
  return (
    <div className="w-full h-full relative bg-black">
      <Canvas
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{
          antialias: false,
          toneMapping: THREE.ReinhardToneMapping,
          toneMappingExposure: 1.5,
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0.6, 0]} fov={CAMERA_START_FOV} />
        <Suspense fallback={null}>
          <PanoramaBackground />
          <GameController {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
};







