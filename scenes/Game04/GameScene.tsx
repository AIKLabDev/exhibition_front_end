/**
 * Game04 (Zombie Defender) Three.js 3D 씬
 * - RetroBackground: 레트로 네온 배경 (그리드, 산, 별)
 * - GameController: 총알 발사, 좀비 스폰/물리, 충돌 판정
 * - GameCanvas: <Canvas> 래퍼
 *
 * headRotation ref 로 외부에서 yaw/pitch를 넣으면 카메라가 따라 돌아감.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import {
  SPAWN_RADIUS,
  BULLET_SPEED,
  ZOMBIE_BASE_SPEED,
  FIRE_RATE,
  GAME_DURATION,
  INITIAL_SPAWN_INTERVAL,
  MIN_SPAWN_INTERVAL,
} from './constants';

// --- 내부 상수 ---
const MAX_BULLETS = 600;
const MAX_ZOMBIES = 500;
const MAX_PARTICLES = 800;
const MAX_SPAWN_ANGLE = 60 * (Math.PI / 180);
const FLOOR_LEVEL = -1.5;

// 네온 컬러
const COLOR_BG = '#020008';
const COLOR_GRID_1 = '#00ffff';
const COLOR_GRID_2 = '#ff00ff';
const COLOR_ZOMBIE_SKIN = '#39ff14';
const COLOR_ZOMBIE_SHIRT = '#2a0a3b';
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
const DirectionalLight = 'directionalLight' as any;

export interface GameSceneProps {
  headRotation: React.MutableRefObject<{ yaw: number; pitch: number }>;
  onGameOver: (score: number) => void;
  onPlayerHit: () => void;
  gameStarted: boolean;
  setScore: (cb: (prev: number) => number) => void;
  setTimeLeft: (time: number) => void;
}

// ---------- 레트로 배경 ----------
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

// ---------- 게임 로직 ----------
const GameController = ({ headRotation, onGameOver, onPlayerHit, gameStarted, setScore, setTimeLeft }: GameSceneProps) => {
  const { camera } = useThree();

  const bulletsData = useRef(
    Array.from({ length: MAX_BULLETS }).map((_, i) => ({
      active: false, pos: new THREE.Vector3(0, -500, 0), dir: new THREE.Vector3(0, 0, -1), id: i,
    }))
  );
  const zombiesData = useRef(
    Array.from({ length: MAX_ZOMBIES }).map((_, i) => ({
      active: false, pos: new THREE.Vector3(0, -500, 0), speed: 0, id: i, wobbleOffset: Math.random() * 100, scale: 1,  // 스폰 시 랜덤으로 덮어씀
    }))
  );
  const particlesData = useRef(
    Array.from({ length: MAX_PARTICLES }).map((_, i) => ({
      active: false, pos: new THREE.Vector3(0, -500, 0), velocity: new THREE.Vector3(), life: 0, scale: 1, id: i,
    }))
  );

  const bulletMeshRef = useRef<THREE.InstancedMesh>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);

  const zombieBodyRef = useRef<THREE.InstancedMesh>(null);
  const zombieHeadRef = useRef<THREE.InstancedMesh>(null);
  const zombieArmsRef = useRef<THREE.InstancedMesh>(null);

  const gunGroupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const shakeIntensity = useRef(0);
  const gameEndedTriggered = useRef(false);

  const lastFireTime = useRef(0);
  const lastSpawnTime = useRef(0);
  const startTime = useRef(0);
  const localScore = useRef(0);
  const lastReportedTime = useRef(GAME_DURATION + 1);

  const audioCtxRef = useRef<AudioContext | null>(null);

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
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'damage') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(20, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
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
    if (gameStarted) {
      startTime.current = 0;
      localScore.current = 0;
      lastReportedTime.current = GAME_DURATION + 1;
      shakeIntensity.current = 0;
      gameEndedTriggered.current = false;

      bulletsData.current.forEach((b) => { b.active = false; b.pos.set(0, -500, 0); });
      zombiesData.current.forEach((z) => { z.active = false; z.pos.set(0, -500, 0); });
      particlesData.current.forEach((p) => { p.active = false; p.pos.set(0, -500, 0); });
    }
  }, [gameStarted]);

  useFrame((state) => {
    const now = Date.now();
    const delta = 0.016;
    const time = state.clock.elapsedTime;

    // 카메라 제어 + 흔들림
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

    // 게임 로직
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

      // 발사
      if (now - lastFireTime.current > FIRE_RATE) {
        lastFireTime.current = now;
        playSound('shoot');
        const bullet = bulletsData.current.find((b) => !b.active);
        if (bullet) {
          bullet.active = true;
          const dir = new THREE.Vector3();
          camera.getWorldDirection(dir);
          bullet.dir.copy(dir.normalize());
          bullet.pos.copy(camera.position).add(dir.multiplyScalar(1.5));
          bullet.pos.y -= 0.3;
        }
      }

      // 좀비 스폰
      const progress = elapsed / GAME_DURATION;
      const currentSpawnInterval = THREE.MathUtils.lerp(INITIAL_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, progress);

      if (now - lastSpawnTime.current > currentSpawnInterval) {
        lastSpawnTime.current = now;
        const zombie = zombiesData.current.find((z) => !z.active);
        if (zombie) {
          zombie.active = true;
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * MAX_SPAWN_ANGLE * 2;
          zombie.pos.set(Math.cos(angle) * SPAWN_RADIUS, FLOOR_LEVEL, Math.sin(angle) * SPAWN_RADIUS);
          zombie.speed = ZOMBIE_BASE_SPEED + progress * 15;

          const LOW_SCALE_WEIGHT = 0.75;  // 75% 확률로 1~2 구간
          const LOW_SCALE_MIN = 1.0;
          const LOW_SCALE_MAX = 5.0;
          const HIGH_SCALE_MIN = 5.0;
          const HIGH_SCALE_MAX = 10.0;

          zombie.scale =
            Math.random() < LOW_SCALE_WEIGHT
              ? LOW_SCALE_MIN + Math.random() * (LOW_SCALE_MAX - LOW_SCALE_MIN)
              : HIGH_SCALE_MIN + Math.random() * (HIGH_SCALE_MAX - HIGH_SCALE_MIN);
        }
      }

      // 총알 물리
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = bulletsData.current[i];
        if (b.active) {
          b.pos.addScaledVector(b.dir, BULLET_SPEED * delta);
          if (b.pos.length() > SPAWN_RADIUS * 2) b.active = false;
        }
      }

      // 파티클 물리
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particlesData.current[i];
        if (p.active) {
          p.pos.addScaledVector(p.velocity, delta);
          p.velocity.y -= 20 * delta;
          p.life -= delta * 2;
          if (p.life <= 0 || p.pos.y < FLOOR_LEVEL) p.active = false;
        }
      }

      // 좀비 물리 + 충돌
      const playerPos = new THREE.Vector2(0, 0);
      const zombiePos = new THREE.Vector2();

      for (let i = 0; i < MAX_ZOMBIES; i++) {
        const z = zombiesData.current[i];
        if (z.active) {
          const dir = new THREE.Vector3(0, FLOOR_LEVEL, 0).sub(z.pos);
          dir.y = 0;
          dir.normalize();
          z.pos.addScaledVector(dir, z.speed * delta);

          // 1. Check Collision with Player (Damage)
          zombiePos.set(z.pos.x, z.pos.z);
          if (zombiePos.distanceTo(playerPos) < 5.0) {
            z.active = false;
            spawnExplosion(z.pos);
            playSound('damage');
            shakeIntensity.current = 1.0;
            onPlayerHit();
            continue;
          }

          // 2. Check Collision with Bullets
          for (let j = 0; j < MAX_BULLETS; j++) {
            const b = bulletsData.current[j];
            if (!b.active) continue;

            const hitDist = b.pos.distanceTo(new THREE.Vector3(z.pos.x, z.pos.y + 1, z.pos.z));
            if (hitDist < 2.5) {
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
    }

    // 렌더 행렬 업데이트
    if (bulletMeshRef.current) {
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = bulletsData.current[i];
        if (b.active) {
          dummy.position.copy(b.pos);
          dummy.scale.set(1, 1, 1);
        }
        else {
          dummy.position.set(0, -500, 0);
          dummy.scale.set(0, 0, 0);
        }
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        bulletMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      bulletMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (particleMeshRef.current) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particlesData.current[i];
        if (p.active) {
          dummy.position.copy(p.pos);
          dummy.scale.set(p.scale * p.life, p.scale * p.life, p.scale * p.life);
          dummy.rotation.set(Math.random(), Math.random(), Math.random());
        }
        else {
          dummy.position.set(0, -500, 0);
          dummy.scale.set(0, 0, 0);
        }
        dummy.updateMatrix();
        particleMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      particleMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (zombieBodyRef.current && zombieHeadRef.current && zombieArmsRef.current) {
      const lookTarget = new THREE.Vector3(camera.position.x, FLOOR_LEVEL, camera.position.z);

      for (let i = 0; i < MAX_ZOMBIES; i++) {
        const z = zombiesData.current[i];
        if (z.active) {
          const runWobble = Math.sin(time * 15 + z.wobbleOffset) * 0.15;
          const runBob = Math.abs(Math.sin(time * 15 + z.wobbleOffset)) * 0.2;

          dummy.position.copy(z.pos);
          dummy.lookAt(lookTarget);
          const baseRotation = dummy.rotation.clone();

          const feetY = 0.4;
          const bodyY = 0.35;
          const headY = 1.05;
          const armsY = 0.7;
          const zombieScale = z.scale;

          // Body
          dummy.position.y = z.pos.y + feetY + bodyY * zombieScale + runBob;
          dummy.rotation.set(baseRotation.x, baseRotation.y, baseRotation.z + runWobble);
          dummy.rotateX(-0.4);
          dummy.scale.set(zombieScale, zombieScale, zombieScale);
          dummy.updateMatrix();
          zombieBodyRef.current.setMatrixAt(i, dummy.matrix);

          // Head
          dummy.position.y = z.pos.y + feetY + headY * zombieScale + runBob;
          dummy.rotation.set(baseRotation.x, baseRotation.y, baseRotation.z + runWobble * 0.5);
          dummy.rotateX(-0.2);
          dummy.scale.set(zombieScale, zombieScale, zombieScale);
          dummy.updateMatrix();
          zombieHeadRef.current.setMatrixAt(i, dummy.matrix);

          // Arms
          dummy.position.y = z.pos.y + feetY + armsY * zombieScale + runBob;
          dummy.rotation.set(baseRotation.x, baseRotation.y, baseRotation.z + runWobble);
          dummy.rotateX(-0.4);
          dummy.scale.set(zombieScale, zombieScale, zombieScale);
          dummy.updateMatrix();
          zombieArmsRef.current.setMatrixAt(i, dummy.matrix);
        } else {
          dummy.position.set(0, -500, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          zombieBodyRef.current.setMatrixAt(i, dummy.matrix);
          zombieHeadRef.current.setMatrixAt(i, dummy.matrix);
          zombieArmsRef.current.setMatrixAt(i, dummy.matrix);
        }
      }
      zombieBodyRef.current.instanceMatrix.needsUpdate = true;
      zombieHeadRef.current.instanceMatrix.needsUpdate = true;
      zombieArmsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <Group ref={gunGroupRef}>
        {/* Simple Gun Model Visualization */}
        <Mesh position={[0.2, -0.3, -0.2]}>
          <BoxGeometry args={[0.1, 0.1, 0.5]} />
          <MeshStandardMaterial color="#444" />
        </Mesh>
        <Mesh position={[0.2, -0.25, -0.5]}>
          <BoxGeometry args={[0.02, 0.05, 0.02]} />
          <MeshBasicMaterial color="#0f0" />
        </Mesh>
      </Group>

      {/* Bullets - Glow Effect */}
      <InstancedMesh ref={bulletMeshRef} args={[undefined, undefined, MAX_BULLETS]} frustumCulled={false}>
        <SphereGeometry args={[0.08, 6, 6]} />
        <MeshBasicMaterial color={COLOR_BULLET} toneMapped={false} />
      </InstancedMesh>

      {/* Particles - Transparent */}
      <InstancedMesh ref={particleMeshRef} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
        <BoxGeometry args={[0.1, 0.1, 0.1]} />
        <MeshBasicMaterial color={COLOR_PARTICLE} transparent opacity={0.8} />
      </InstancedMesh>

      {/* Zombie Parts */}
      <InstancedMesh ref={zombieBodyRef} args={[undefined, undefined, MAX_ZOMBIES]} frustumCulled={false}>
        <BoxGeometry args={[0.5, 0.7, 0.3]} />
        <MeshStandardMaterial color={COLOR_ZOMBIE_SHIRT} />
      </InstancedMesh>
      <InstancedMesh ref={zombieHeadRef} args={[undefined, undefined, MAX_ZOMBIES]} frustumCulled={false}>
        <BoxGeometry args={[0.3, 0.3, 0.3]} />
        <MeshStandardMaterial color={COLOR_ZOMBIE_SKIN} emissive={COLOR_ZOMBIE_SKIN} emissiveIntensity={0.5} />
      </InstancedMesh>
      <InstancedMesh ref={zombieArmsRef} args={[undefined, undefined, MAX_ZOMBIES]} frustumCulled={false}>
        <BoxGeometry args={[0.8, 0.12, 0.12]} />
        <MeshStandardMaterial color={COLOR_ZOMBIE_SKIN} emissive={COLOR_ZOMBIE_SKIN} emissiveIntensity={0.5} />
      </InstancedMesh>

      <AmbientLight intensity={0.4} />
      <DirectionalLight position={[0, 20, 0]} intensity={1.5} />
    </>
  );
};

// ---------- Canvas 래퍼 ----------
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
        <RetroBackground />
        <GameController {...props} />
      </Canvas>
    </div>
  );
};
