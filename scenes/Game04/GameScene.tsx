/**
 * Game04 (Zombie Defender) 3D scene.
 * Uses a rigged FBX zombie model and plays the embedded animation clip.
 */

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import zombieFbxUrl from '../../3dModel/zombie.fbx';
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
const ZOMBIE_UNIFORM_SCALE = 2.0;
const ZOMBIE_SCALE_FAR = 0.76;
const ZOMBIE_SCALE_NEAR = 1.3;

// Colors
const COLOR_BG = '#020008';
const COLOR_GRID_1 = '#00ffff';
const COLOR_GRID_2 = '#ff00ff';
const COLOR_BULLET = '#ffff00';
const COLOR_PARTICLE = '#ffff00';

// R3F JSX workaround (TS intrinsic element)
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const Color = 'color' as any;
const Fog = 'fog' as any;
const CircleGeometry = 'circleGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const PointLight = 'pointLight' as any;
const PlaneGeometry = 'planeGeometry' as any;
const GridHelper = 'gridHelper' as any;
const ConeGeometry = 'coneGeometry' as any;
const BoxGeometry = 'boxGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const InstancedMesh = 'instancedMesh' as any;
const SphereGeometry = 'sphereGeometry' as any;
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
  setScore: (cb: (prev: number) => number) => void;
  setTimeLeft: (time: number) => void;
  onNearbyZombies?: (zombies: NearbyZombieRadar[]) => void;
}

interface ZombieRenderRig {
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  action: THREE.AnimationAction | null;
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

const pickZombieClip = (clips: THREE.AnimationClip[]) => {
  if (!clips.length) return null;
  const preferred = clips.find((clip) => /walk|run|zombie|idle/i.test(clip.name));
  return preferred ?? clips[0];
};

const createZombieRig = (source: THREE.Group, clip: THREE.AnimationClip | null): ZombieRenderRig => {
  const root = cloneSkeleton(source) as THREE.Group;

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => configureZombieMaterial(mat));
      } else if (mesh.material) {
        configureZombieMaterial(mesh.material);
      }
    }
  });

  let mixer: THREE.AnimationMixer | null = null;
  let action: THREE.AnimationAction | null = null;
  if (clip) {
    mixer = new THREE.AnimationMixer(root);
    action = mixer.clipAction(clip);
    action.loop = THREE.LoopRepeat;
    action.clampWhenFinished = false;
    action.enabled = true;
    action.play();
  }

  root.visible = false;
  return { root, mixer, action };
};

const getZombieDistanceScale = (x: number, z: number) => {
  const distance = Math.sqrt(x * x + z * z);
  const proximity = 1 - THREE.MathUtils.clamp(distance / SPAWN_RADIUS, 0, 1);
  return THREE.MathUtils.lerp(ZOMBIE_SCALE_FAR, ZOMBIE_SCALE_NEAR, proximity);
};

// ---------- Retro background ----------
const RetroBackground = () => {
  const gridRef = useRef<THREE.Mesh>(null);
  const mountainRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const speed = 120.3;
    if (gridRef.current) gridRef.current.position.z = (time * speed) % 5;
    if (mountainRef.current) mountainRef.current.position.z = (time * speed * 0.3) % 150;
  });

  return (
    <Group>
      <Color attach="background" args={[COLOR_BG]} />
      <Fog attach="fog" args={[COLOR_BG, 10, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={6} saturation={0} fade speed={6} />

      <Mesh position={[0, 10, -150]}>
        <CircleGeometry args={[40, 64]} />
        <MeshBasicMaterial color="#ff0055" />
      </Mesh>
      <PointLight position={[0, 20, -140]} intensity={2} color="#ff0055" distance={100} />

      <Group position={[0, FLOOR_LEVEL, 0]}>
        <Mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <PlaneGeometry args={[1000, 1000]} />
          <MeshBasicMaterial color="#050010" />
        </Mesh>
        <GridHelper args={[1000, 200, COLOR_GRID_1, COLOR_GRID_2]} position={[0, 0, 0]} ref={gridRef as any} />
        <Mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <PlaneGeometry args={[6, 1000]} />
          <MeshBasicMaterial color="#111" />
        </Mesh>
      </Group>

      <Group ref={mountainRef} position={[0, FLOOR_LEVEL, -150]}>
        {[-1, 0, 1].map((offset) => (
          <Group key={offset} position={[offset * 150, 0, offset * -50]}>
            <Mesh position={[0, 0, 0]}>
              <ConeGeometry args={[50, 60, 4]} />
              <MeshBasicMaterial color="#00ffff" wireframe linewidth={1} />
            </Mesh>
          </Group>
        ))}
      </Group>
    </Group>
  );
};

// ---------- Main game logic ----------
const GameController = ({ headRotation, onGameOver, onPlayerHit, gameStarted, setScore, setTimeLeft, onNearbyZombies }: GameSceneProps) => {
  const { camera } = useThree();
  const zombieTemplate = useLoader(FBXLoader, zombieFbxUrl) as THREE.Group;

  const bulletsData = useRef(
    Array.from({ length: MAX_BULLETS }).map((_, i) => ({
      active: false,
      pos: new THREE.Vector3(0, -500, 0),
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
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);

  const gunGroupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const zombieTemplateBounds = useMemo(() => new THREE.Box3().setFromObject(zombieTemplate), [zombieTemplate]);
  const zombieTemplateMinY = useMemo(() => zombieTemplateBounds.min.y, [zombieTemplateBounds]);
  const zombieTemplateHeight = useMemo(() => {
    const size = new THREE.Vector3();
    zombieTemplateBounds.getSize(size);
    return Math.max(0.001, size.y);
  }, [zombieTemplateBounds]);
  const zombieBaseScale = useMemo(() => ZOMBIE_TARGET_HEIGHT / zombieTemplateHeight, [zombieTemplateHeight]);
  const zombieAnimationClip = useMemo(() => pickZombieClip(zombieTemplate.animations ?? []), [zombieTemplate]);

  const zombieRigs = useMemo(() => {
    return Array.from({ length: MAX_ZOMBIES }).map(() => createZombieRig(zombieTemplate, zombieAnimationClip));
  }, [zombieTemplate, zombieAnimationClip]);

  const shakeIntensity = useRef(0);
  const gameEndedTriggered = useRef(false);

  const lastFireTime = useRef(0);
  const lastSpawnTime = useRef(0);
  const startTime = useRef(0);
  const localScore = useRef(0);
  const lastReportedTime = useRef(GAME_DURATION + 1);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const playerLightRef = useRef<THREE.PointLight>(null);

  const tempLookDir = useMemo(() => new THREE.Vector3(), []);
  const tempPlayerLightDir = useMemo(() => new THREE.Vector3(), []);
  const tempZombieTarget = useMemo(() => new THREE.Vector3(), []);
  const tempZombieBodyTarget = useMemo(() => new THREE.Vector3(), []);

  const playSound = (type: 'shoot' | 'hit' | 'damage') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'shoot') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'damage') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(20, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  };

  const spawnExplosion = (position: THREE.Vector3) => {
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!particlesData.current[i].active) {
        const p = particlesData.current[i];
        p.active = true;
        p.pos.copy(position);
        p.life = 1.0;
        p.velocity.set((Math.random() - 0.5) * 10, Math.random() * 10, (Math.random() - 0.5) * 10);
        p.scale = Math.random() * 0.5 + 0.2;
        spawned++;
        if (spawned >= 8) break;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (gameStarted) {
      startTime.current = 0;
      localScore.current = 0;
      lastReportedTime.current = GAME_DURATION + 1;
      shakeIntensity.current = 0;
      gameEndedTriggered.current = false;

      bulletsData.current.forEach((b) => {
        b.active = false;
        b.pos.set(0, -500, 0);
      });
      zombiesData.current.forEach((z) => {
        z.active = false;
        z.pos.set(0, -500, 0);
      });
      particlesData.current.forEach((p) => {
        p.active = false;
        p.pos.set(0, -500, 0);
      });
      zombieRigs.forEach((rig) => {
        rig.root.visible = false;
        if (rig.action) {
          rig.action.reset();
          rig.action.play();
        }
      });
    }
  }, [gameStarted, zombieRigs]);

  useFrame((state) => {
    const now = Date.now();
    const delta = 0.016;
    const time = state.clock.elapsedTime;

    // Camera + shake
    const yaw = headRotation.current.yaw || 0;
    if (shakeIntensity.current > 0) {
      shakeIntensity.current = THREE.MathUtils.lerp(shakeIntensity.current, 0, 0.1);
      const sx = (Math.random() - 0.5) * shakeIntensity.current;
      const sy = (Math.random() - 0.5) * shakeIntensity.current;
      camera.position.set(sx, 0.6 + sy, shakeIntensity.current * 0.5);
    } else {
      camera.position.set(0, 0.6, 0);
    }

    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -yaw, 0.2);

    if (gunGroupRef.current) {
      gunGroupRef.current.rotation.copy(camera.rotation);
      gunGroupRef.current.position.copy(camera.position);
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
      if (startTime.current === 0) startTime.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - startTime.current;
      const remainingTime = Math.max(0, GAME_DURATION - elapsed);

      if (Math.ceil(remainingTime) !== lastReportedTime.current) {
        setTimeLeft(remainingTime);
        lastReportedTime.current = Math.ceil(remainingTime);
      }

      if (remainingTime <= 0 && !gameEndedTriggered.current) {
        gameEndedTriggered.current = true;
        onGameOver(localScore.current);
      }

      // Auto fire
      if (now - lastFireTime.current > FIRE_RATE) {
        lastFireTime.current = now;
        playSound('shoot');
        const bullet = bulletsData.current.find((b) => !b.active);
        if (bullet) {
          bullet.active = true;
          camera.getWorldDirection(tempLookDir);
          bullet.dir.copy(tempLookDir.normalize());
          bullet.pos.copy(camera.position).add(tempLookDir.multiplyScalar(1.5));
          bullet.pos.y -= 0.3;
        }
      }

      // Zombie spawn
      const progress = elapsed / GAME_DURATION;
      const currentSpawnInterval = THREE.MathUtils.lerp(INITIAL_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, progress);

      if (now - lastSpawnTime.current > currentSpawnInterval) {
        lastSpawnTime.current = now;
        const zombie = zombiesData.current.find((z) => !z.active);
        if (zombie) {
          zombie.active = true;
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2 * SPAWN_HALF_ANGLE_RAD;
          zombie.pos.set(Math.cos(angle) * SPAWN_RADIUS, FLOOR_LEVEL, Math.sin(angle) * SPAWN_RADIUS);
          zombie.speed = ZOMBIE_BASE_SPEED + progress * 15;
          zombie.scale = ZOMBIE_UNIFORM_SCALE;
        }
      }

      // Bullet simulation
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = bulletsData.current[i];
        if (b.active) {
          b.pos.addScaledVector(b.dir, BULLET_SPEED * delta);
          if (b.pos.length() > SPAWN_RADIUS * 2) b.active = false;
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
      const playerPos = new THREE.Vector2(0, 0);
      const zombiePos = new THREE.Vector2();

      for (let i = 0; i < MAX_ZOMBIES; i++) {
        const z = zombiesData.current[i];
        if (z.active) {
          tempZombieTarget.set(0, FLOOR_LEVEL, 0).sub(z.pos);
          tempZombieTarget.y = 0;
          tempZombieTarget.normalize();
          z.pos.addScaledVector(tempZombieTarget, z.speed * delta);

          // Player collision
          zombiePos.set(z.pos.x, z.pos.z);
          if (zombiePos.distanceTo(playerPos) < 2.2) {
            z.active = false;
            spawnExplosion(z.pos);
            playSound('damage');
            shakeIntensity.current = 1.0;
            onPlayerHit();
            continue;
          }

          // Bullet collision
          for (let j = 0; j < MAX_BULLETS; j++) {
            const b = bulletsData.current[j];
            if (!b.active) continue;

            const distanceScale = getZombieDistanceScale(z.pos.x, z.pos.z);
            const collisionScale = z.scale * distanceScale;
            tempZombieBodyTarget.set(z.pos.x, z.pos.y + 1.1 * collisionScale, z.pos.z);
            const hitDist = b.pos.distanceTo(tempZombieBodyTarget);
            if (hitDist < 1.35 * collisionScale) {
              b.active = false;
              z.active = false;
              spawnExplosion(z.pos);
              localScore.current += 10;
              setScore((s) => s + 10);
              playSound('hit');
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
        const dx = z.pos.x;
        const dz = z.pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > RADAR_DETECT_RANGE) continue;
        const angle = Math.atan2(dx, -dz);
        nearby.push({ angle, distance: dist });
      }
      if (onNearbyZombies) onNearbyZombies(nearby);
    } else if (onNearbyZombies) {
      onNearbyZombies([]);
    }

    // Bullet render updates
    if (bulletMeshRef.current) {
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = bulletsData.current[i];
        if (b.active) {
          dummy.position.copy(b.pos);
          dummy.scale.set(1, 1, 1);
        } else {
          dummy.position.set(0, -500, 0);
          dummy.scale.set(0, 0, 0);
        }
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        bulletMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      bulletMeshRef.current.instanceMatrix.needsUpdate = true;
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

    // Zombie model render updates + embedded animation playback
    for (let i = 0; i < MAX_ZOMBIES; i++) {
      const z = zombiesData.current[i];
      const rig = zombieRigs[i];

      if (!z.active) {
        rig.root.visible = false;
        continue;
      }

      if (!rig.root.visible && rig.action) {
        rig.action.reset();
        rig.action.play();
      }
      rig.root.visible = true;
      rig.mixer?.update(delta);

      const distanceScale = getZombieDistanceScale(z.pos.x, z.pos.z);
      const finalScale = zombieBaseScale * z.scale * distanceScale;

      const yawToPlayer = Math.atan2(-z.pos.x, -z.pos.z);

      rig.root.position.set(
        z.pos.x,
        FLOOR_LEVEL - zombieTemplateMinY * finalScale,
        z.pos.z
      );
      rig.root.rotation.set(0, yawToPlayer + ZOMBIE_MODEL_FORWARD_OFFSET_RAD, 0);
      rig.root.scale.setScalar(finalScale);
    }
  });

  return (
    <>
      {zombieRigs.map((rig, idx) => (
        <primitive key={idx} object={rig.root} />
      ))}

      <Group ref={gunGroupRef}>
        <Mesh position={[0.2, -0.3, -0.2]}>
          <BoxGeometry args={[0.1, 0.1, 0.5]} />
          <MeshStandardMaterial color="#444" />
        </Mesh>
        <Mesh position={[0.2, -0.25, -0.5]}>
          <BoxGeometry args={[0.02, 0.05, 0.02]} />
          <MeshBasicMaterial color="#0f0" />
        </Mesh>
      </Group>

      <InstancedMesh ref={bulletMeshRef} args={[undefined, undefined, MAX_BULLETS]} frustumCulled={false}>
        <SphereGeometry args={[0.08, 6, 6]} />
        <MeshBasicMaterial color={COLOR_BULLET} toneMapped={false} />
      </InstancedMesh>

      <InstancedMesh ref={particleMeshRef} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
        <BoxGeometry args={[0.1, 0.1, 0.1]} />
        <MeshBasicMaterial color={COLOR_PARTICLE} transparent opacity={0.8} />
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
        <PerspectiveCamera makeDefault position={[0, 0.6, 0]} fov={90} />
        <Suspense fallback={null}>
          <RetroBackground />
          <GameController {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
};
