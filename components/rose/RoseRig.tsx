"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, DoubleSide, Group, Mesh, MeshStandardMaterial, TubeGeometry, Vector3 } from "three";
import { bloomConfig, type BloomQuality } from "@/lib/bloom.config";
import { petalPose, smooth } from "@/lib/bloom-pose";
import { createLeafGeometry, createPetalGeometry } from "./PetalGeometry";

type Petal = { layer: number; index: number; pivot: Group | null; mesh: Mesh | null };
type Props = { primary: boolean; progress: RefObject<number>; quality: BloomQuality; wireframe?: boolean; visible?: boolean };

export function RoseRig({ primary, progress, quality, wireframe = false, visible = true }: Props) {
  const seed = bloomConfig.seed + (primary ? 0 : 734);
  const counts = primary ? [11, 10, 8, 6] : [9, 8, 7, 5];
  const petals = useMemo(() => counts.flatMap((count, layer) => Array.from({ length: count }, (_, index) => {
    const random = Math.abs(Math.sin((seed + layer * 43 + index * 79) * 4.234));
    const shape = {
      length: [0.95, 0.88, 0.78, 0.68][layer] * (0.96 + random * 0.08),
      width: [0.49, 0.40, 0.31, 0.24][layer] * (0.92 + random * 0.16),
      curl: [0.39, 0.31, 0.23, 0.14][layer], variation: random,
    };
    return { layer, index, count, random, geometry: createPetalGeometry(shape, quality) };
  })), [primary, quality, seed]);
  const petalMaterial = useMemo(() => new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.78, metalness: 0, wireframe }), [wireframe]);
  const leafMaterial = useMemo(() => new MeshStandardMaterial({ color: bloomConfig.colors.leaf, side: DoubleSide, roughness: 0.81, metalness: 0, wireframe }), [wireframe]);
  const stemMaterial = useMemo(() => new MeshStandardMaterial({ color: "#426628", roughness: 0.84, metalness: 0 }), []);
  const leafGeometry = useMemo(() => createLeafGeometry(0.72, 0.28, quality), [quality]);
  const sepalGeometry = useMemo(() => createLeafGeometry(0.36, 0.115, quality), [quality]);
  const stemGeometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3([
    new Vector3(0, -0.02, 0), new Vector3(-0.06, -0.6, 0),
    new Vector3(primary ? -0.17 : 0.1, -1.35, 0.02),
    new Vector3(primary ? -0.24 : 0.22, -2.8, 0.04),
  ]), 22, 0.029, 7, false), [primary]);
  const refs = useRef<Petal[]>([]);
  const sepalRefs = useRef<(Group | null)[]>([]);

  useEffect(() => () => {
    petals.forEach((petal) => petal.geometry.dispose());
    petalMaterial.dispose(); leafMaterial.dispose(); stemMaterial.dispose();
    leafGeometry.dispose(); sepalGeometry.dispose(); stemGeometry.dispose();
  }, [petals, petalMaterial, leafMaterial, stemMaterial, leafGeometry, sepalGeometry, stemGeometry]);

  useFrame(() => {
    const value = progress.current;
    for (let n = 0; n < petals.length; n++) {
      const petal = petals[n];
      const record = refs.current[n];
      if (!record?.pivot || !record.mesh) continue;
      const pose = petalPose(value, petal.layer, petal.index, seed, !primary);
      record.pivot.rotation.x = -pose.angle;
      if (record.mesh.morphTargetInfluences) {
        record.mesh.morphTargetInfluences[0] = pose.middleWeight;
        record.mesh.morphTargetInfluences[1] = pose.openWeight;
      }
    }
    const relax = smooth(value * 5);
    sepalRefs.current.forEach((sepal) => { if (sepal) sepal.rotation.x = -0.28 - relax * 0.32; });
  });

  const scale = primary ? 1.16 : 0.91;
  return <group visible={visible} position={primary ? [0.61, 0.94, -0.05] : [-0.76, -0.18, 0.32]} scale={scale} rotation={[0.14, primary ? -0.18 : 0.25, primary ? -0.07 : 0.1]}>
    <mesh geometry={stemGeometry} material={stemMaterial} />
    {[
      { position: [-0.08, -0.79, 0.02] as [number,number,number], angle: 1.04, twist: 0.12 },
      { position: [-0.12, -1.24, 0.03] as [number,number,number], angle: -1.07, twist: -0.2 },
      { position: [-0.20, -1.84, 0.04] as [number,number,number], angle: 1.1, twist: 0.28 },
    ].map((leaf, index) => <group key={index} position={leaf.position} rotation={[leaf.twist, 0, leaf.angle]}>
      <mesh geometry={leafGeometry} material={leafMaterial} />
    </group>)}
    <mesh position={[0, -0.035, 0]} scale={[0.13, 0.13, 0.13]}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color="#31501f" roughness={0.9} /></mesh>
    {Array.from({ length: 5 }, (_, index) => <group key={`sepal-${index}`} rotation={[0, index * Math.PI * 2 / 5, 0]}>
      <group ref={(node) => { sepalRefs.current[index] = node; }} rotation={[-0.28, 0, 0]}>
        <mesh geometry={sepalGeometry} material={leafMaterial} />
      </group>
    </group>)}
    {petals.map((petal, n) => {
      const stagger = petal.layer % 2 ? 0.34 : 0;
      const around = (petal.index + stagger) / petal.count * Math.PI * 2 + petal.random * 0.06;
      const radial = [0.115, 0.09, 0.065, 0.04][petal.layer];
      const lower = [0, 0.11, 0.22, 0.33][petal.layer];
      return <group key={`${petal.layer}-${petal.index}`} rotation={[0, around, 0]} position={[0, lower, radial]}>
        <group ref={(node) => { refs.current[n] = { layer: petal.layer, index: petal.index, pivot: node, mesh: refs.current[n]?.mesh ?? null }; }}>
          <mesh ref={(node) => { if (node) node.updateMorphTargets(); refs.current[n] = { layer: petal.layer, index: petal.index, pivot: refs.current[n]?.pivot ?? null, mesh: node }; }} geometry={petal.geometry} material={petalMaterial} frustumCulled={false} />
        </group>
      </group>;
    })}
  </group>;
}
