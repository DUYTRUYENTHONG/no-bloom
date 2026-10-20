"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type PetalProps = { angle: number; layer: number; progress: number; color: string; size: number };

function petalGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const rows = 12;
  const columns = 8;
  const base = new THREE.Color("#941047");
  const tip = new THREE.Color("#ff7bad");
  for (let y = 0; y <= rows; y++) {
    const t = y / rows;
    const width = (Math.sin(Math.PI * Math.pow(t, 0.83)) * 0.47 + 0.025) * (0.72 + 0.28 * t);
    for (let x = 0; x <= columns; x++) {
      const u = x / columns * 2 - 1;
      vertices.push(u * width, t * 1.24, 0.19 * (1 - u * u) * Math.sin(Math.PI * t) + 0.07 * t * t);
      const color = base.clone().lerp(tip, 0.2 + t * 0.72 + (1 - Math.abs(u)) * 0.06);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const a = y * (columns + 1) + x;
    indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2);
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const sharedPetal = petalGeometry();

function Petal({ angle, layer, progress, color, size }: PetalProps) {
  const pivot = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!pivot.current) return;
    const open = THREE.MathUtils.smoothstep(progress, 0.08 + layer * 0.12, 0.75 + layer * 0.08);
    pivot.current.rotation.x = 1.16 - open * (0.95 + layer * 0.11);
  });
  return (
    <group rotation={[0, 0, angle]} position={[0, 0, -layer * 0.035]}>
      <group ref={pivot}>
        <mesh geometry={sharedPetal} scale={[size, size, size]} rotation={[0, 0, layer % 2 ? 0.09 : -0.04]}>
          <meshStandardMaterial color={color} vertexColors side={THREE.DoubleSide} roughness={0.83} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}

function Flower({ position, scale, progress, color }: { position: [number, number, number]; scale: number; progress: number; color: string }) {
  const petals = useMemo(() => [
    ...Array.from({ length: 9 }, (_, i) => ({ angle: i * Math.PI * 2 / 9, layer: 0, size: 1 })),
    ...Array.from({ length: 7 }, (_, i) => ({ angle: (i + 0.35) * Math.PI * 2 / 7, layer: 1, size: 0.77 })),
    ...Array.from({ length: 5 }, (_, i) => ({ angle: (i + 0.12) * Math.PI * 2 / 5, layer: 2, size: 0.51 })),
  ], []);
  return <group position={position} scale={scale}>
    {petals.map((petal, i) => <Petal key={i} {...petal} progress={progress} color={color} />)}
    <mesh position={[0, 0, 0.17]}><sphereGeometry args={[0.14, 12, 8]} /><meshStandardMaterial color="#d7a56b" roughness={1} /></mesh>
  </group>;
}

function Bouquet({ animating, contracting, sprouting, opened, durationMs, replayKey, onSettled }: { animating: boolean; contracting: boolean; sprouting: boolean; opened: boolean; durationMs: number; replayKey: number; onSettled: () => void }) {
  const progress = useRef(0.02);
  const [visibleProgress, setVisibleProgress] = useState(0.02);
  const reported = useRef(false);
  const priorKey = useRef(replayKey);
  useEffect(() => {
    if (opened && !animating && progress.current < 1) {
      progress.current = 1;
      setVisibleProgress(1);
    } else if (sprouting && !opened) {
      progress.current = 0.2;
      setVisibleProgress(0.2);
    }
  }, [opened, animating, sprouting]);
  useFrame((_, delta) => {
    if (priorKey.current !== replayKey) {
      progress.current = 0;
      setVisibleProgress(0);
      reported.current = false;
      priorKey.current = replayKey;
    }
    if (contracting && progress.current > 0) {
      progress.current = Math.max(0, progress.current - Math.min(delta, 0.06) / 0.45);
      setVisibleProgress(progress.current);
    } else if (animating && progress.current < 1) {
      progress.current = Math.min(1, progress.current + Math.min(delta, 0.06) / (durationMs / 1000));
      setVisibleProgress(progress.current);
      if (progress.current === 1 && !reported.current) {
        reported.current = true;
        onSettled();
      }
    }
  });
  return <>
    <ambientLight intensity={1.25} />
    <directionalLight position={[2, 4, 5]} intensity={2.4} color="#f8e0b8" />
    <directionalLight position={[-4, -2, 2]} intensity={0.68} color="#dd3d85" />
    <group position={[0, -0.5, 0]}>
      <mesh position={[0, -1.26, -0.2]} rotation={[0, 0, -0.08]}><cylinderGeometry args={[0.035, 0.075, 2.7, 8]} /><meshStandardMaterial color="#627b2c" /></mesh>
      <mesh position={[-0.46, -1.36, -0.16]} rotation={[0, 0, -0.78]}><sphereGeometry args={[0.19, 12, 8]} /><meshStandardMaterial color="#668a32" /></mesh>
      <mesh position={[0.45, -1.6, -0.16]} rotation={[0, 0, 0.78]}><sphereGeometry args={[0.18, 12, 8]} /><meshStandardMaterial color="#7e963b" /></mesh>
      <Flower position={[0, 0.2, 0.18]} scale={1.28} progress={visibleProgress} color="#f12682" />
      {opened && <>
        <Flower position={[-1.18, -0.53, -0.65]} scale={0.47} progress={Math.max(0, visibleProgress - 0.15) * 1.2} color="#df3884" />
        <Flower position={[1.12, -0.6, -0.75]} scale={0.42} progress={Math.max(0, visibleProgress - 0.22) * 1.25} color="#e73478" />
      </>}
    </group>
  </>;
}

export function FlowerScene({ animating, contracting, sprouting, opened, durationMs, replayKey, onSettled, onFailure }: { animating: boolean; contracting: boolean; sprouting: boolean; opened: boolean; durationMs: number; replayKey: number; onSettled: () => void; onFailure: () => void }) {
  return <Canvas
    aria-hidden="true"
    frameloop={animating || contracting ? "always" : "demand"}
    dpr={[1, 1.7]}
    camera={{ position: [0, 0, 7.2], fov: 42 }}
    gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    onCreated={({ gl }) => gl.domElement.addEventListener("webglcontextlost", onFailure, { once: true })}
    onError={onFailure}
  ><Bouquet animating={animating} contracting={contracting} sprouting={sprouting} opened={opened} durationMs={durationMs} replayKey={replayKey} onSettled={onSettled} /></Canvas>;
}
