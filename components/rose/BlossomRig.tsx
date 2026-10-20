"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, DoubleSide, Group, Mesh, MeshStandardMaterial, TubeGeometry, Vector3 } from "three";
import { bloomConfig, type BloomQuality } from "@/lib/bloom.config";
import { flowerCatalog, type FlowerKind } from "@/lib/flower-catalog";
import { petalProgress, smooth } from "@/lib/bloom-pose";
import { createLeafGeometry, createPetalGeometry, type PetalShape } from "./PetalGeometry";

type OtherFlower = Exclude<FlowerKind, "rose" | "peach-rose">;
type Props = { kind: OtherFlower; primary: boolean; progress: RefObject<number>; quality: BloomQuality; wireframe?: boolean; visible?: boolean };
type Ref = { pivot: Group | null; mesh: Mesh | null };

// Each species has its own petal silhouette and layer structure. All use the
// same root-anchored closed / half-open / open geometry topology.
const forms: Record<OtherFlower, { counts: number[]; lengths: number[]; widths: number[]; angles: number[]; profile: PetalShape["profile"]; closedWidth: number; leaf: [number, number]; center: boolean }> = {
  peony: { counts: [12, 11, 9, 7], lengths: [0.92, 0.83, 0.71, 0.58], widths: [0.61, 0.52, 0.39, 0.3], angles: [1.23, 0.98, 0.68, 0.35], profile: "ruffled", closedWidth: 0.76, leaf: [0.75, 0.28], center: true },
  cherry: { counts: [5], lengths: [0.83], widths: [0.51], angles: [1.44], profile: "rounded", closedWidth: 0.49, leaf: [0.65, 0.23], center: true },
  lily: { counts: [6], lengths: [1.15], widths: [0.45], angles: [1.3], profile: "pointed", closedWidth: 0.31, leaf: [1.0, 0.15], center: true },
  alstroemeria: { counts: [6], lengths: [0.87], widths: [0.44], angles: [1.38], profile: "pointed", closedWidth: 0.42, leaf: [0.8, 0.17], center: true },
  orchid: { counts: [5, 2], lengths: [0.94, 0.45], widths: [0.54, 0.29], angles: [1.33, 0.86], profile: "rounded", closedWidth: 0.72, leaf: [0.67, 0.24], center: true },
};

export function BlossomRig({ kind, primary, progress, quality, wireframe = false, visible = true }: Props) {
  const form = forms[kind];
  const palette = flowerCatalog[kind];
  const seed = bloomConfig.seed + (primary ? 121 : 757);
  const petals = useMemo(() => form.counts.flatMap((count, layer) => Array.from({ length: count }, (_, index) => {
    const random = Math.abs(Math.sin((seed + layer * 43 + index * 79) * 4.234));
    const shape: PetalShape = {
      length: form.lengths[layer] * (0.96 + random * 0.08),
      width: form.widths[layer] * (0.94 + random * 0.12),
      curl: kind === "peony" ? 0.36 : kind === "lily" ? 0.22 : 0.16,
      variation: random, profile: form.profile, closedWidth: form.closedWidth,
      pattern: kind === "lily" || kind === "alstroemeria" ? kind : undefined,
    };
    const colors = kind === "orchid" && layer === 1 ? { petal: "#d34892", light: "#f49fc2", shade: "#81316a" } : palette;
    return { count, layer, index, random, geometry: createPetalGeometry(shape, quality, colors) };
  })), [form, kind, palette, quality, seed]);
  const petalMaterial = useMemo(() => new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.77, metalness: 0, wireframe }), [wireframe]);
  const leafMaterial = useMemo(() => new MeshStandardMaterial({ color: kind === "lily" ? "#486c37" : "#38652a", side: DoubleSide, roughness: 0.83, metalness: 0, wireframe }), [kind, wireframe]);
  const stemMaterial = useMemo(() => new MeshStandardMaterial({ color: kind === "cherry" ? "#66503b" : "#426628", roughness: 0.86 }), [kind]);
  const centerMaterial = useMemo(() => new MeshStandardMaterial({ color: palette.center, roughness: 0.82 }), [palette]);
  const leafGeometry = useMemo(() => createLeafGeometry(...form.leaf, quality), [form, quality]);
  const sepalGeometry = useMemo(() => createLeafGeometry(kind === "orchid" ? 0.35 : 0.52, kind === "lily" ? 0.11 : 0.17, quality), [kind, quality]);
  const stemGeometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3([
    new Vector3(0, -0.02, 0), new Vector3(-0.05, -0.65, 0),
    new Vector3(primary ? -0.16 : 0.12, -1.35, 0.02),
    new Vector3(primary ? -0.24 : 0.24, -2.7, 0.04),
  ]), 22, kind === "cherry" ? 0.043 : 0.027, 7, false), [kind, primary]);
  const refs = useRef<Ref[]>([]);
  const sepalRefs = useRef<(Group | null)[]>([]);
  const centerRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);

  useEffect(() => () => {
    petals.forEach((petal) => petal.geometry.dispose());
    petalMaterial.dispose(); leafMaterial.dispose(); stemMaterial.dispose(); centerMaterial.dispose();
    leafGeometry.dispose(); sepalGeometry.dispose(); stemGeometry.dispose();
  }, [petals, petalMaterial, leafMaterial, stemMaterial, centerMaterial, leafGeometry, sepalGeometry, stemGeometry]);

  useFrame(() => {
    const master = progress.current;
    for (let n = 0; n < petals.length; n++) {
      const petal = petals[n];
      const record = refs.current[n];
      if (!record?.pivot || !record.mesh) continue;
      const local = petalProgress(master, petal.layer, petal.index, seed, !primary);
      record.pivot.rotation.x = -local * form.angles[petal.layer];
      const morph = record.mesh.morphTargetInfluences;
      if (kind === "orchid" && petal.layer === 1) record.mesh.scale.setScalar(0.04 + 0.96 * local);
      if (morph) {
        morph[0] = local < 0.5 ? local * 2 : (1 - local) * 2;
        morph[1] = local < 0.5 ? 0 : local * 2 - 1;
      }
    }
    const relax = smooth(master * 5);
    sepalRefs.current.forEach((sepal) => { if (sepal) sepal.rotation.x = -0.17 - relax * 0.34; });
    if (centerRef.current) centerRef.current.scale.setScalar(0.25 + 0.75 * smooth((master - (primary ? 0.43 : 0.52)) * 3));
    if (headRef.current) headRef.current.rotation.x = 0.62 * smooth((master - (primary ? 0.18 : 0.26)) * 1.5);
  });

  const scale = primary ? 1.13 : 0.85;
  return <group visible={visible} position={primary ? [0.6, 0.9, -0.05] : [-0.76, -0.22, 0.32]} scale={scale} rotation={[0.12, primary ? -0.2 : 0.24, primary ? -0.07 : 0.1]}>
    <mesh geometry={stemGeometry} material={stemMaterial} />
    {[-0.8, -1.35, -1.86].map((y, index) => <group key={index} position={[primary ? -0.07 - index * 0.06 : 0.05 + index * 0.06, y, 0.03]} rotation={[0.1, 0, index % 2 ? -1.05 : 1.05]}><mesh geometry={leafGeometry} material={leafMaterial} /></group>)}
    <group ref={headRef}>
    <mesh position={[0, -0.01, 0]} scale={[0.11, 0.16, 0.11]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#31501f" roughness={0.9} /></mesh>
    {Array.from({ length: kind === "lily" ? 3 : 5 }, (_, index) => <group key={`sepal-${index}`} rotation={[0, index * Math.PI * 2 / (kind === "lily" ? 3 : 5), 0]}><group ref={(node) => { sepalRefs.current[index] = node; }}><mesh geometry={sepalGeometry} material={leafMaterial} /></group></group>)}
    {petals.map((petal, n) => {
      const lip = kind === "orchid" && petal.layer === 1;
      const around = lip ? (petal.index ? 0.19 : -0.19) : (petal.index + (petal.layer % 2) * 0.37) / petal.count * Math.PI * 2 + petal.random * 0.04;
      const radial = kind === "peony" ? [0.12, 0.09, 0.06, 0.035][petal.layer] : kind === "orchid" ? [0.07, 0.38][petal.layer] : 0.055;
      const lower = kind === "peony" ? [0, 0.1, 0.2, 0.3][petal.layer] : lip ? 0.08 : petal.layer * 0.14;
      return <group key={`${petal.layer}-${petal.index}`} rotation={[0, around, lip ? Math.PI + (petal.index ? 0.32 : -0.32) : 0]} position={[0, lower, radial]}><group ref={(node) => { refs.current[n] = { pivot: node, mesh: refs.current[n]?.mesh ?? null }; }}><mesh ref={(node) => { if (node) node.updateMorphTargets(); refs.current[n] = { pivot: refs.current[n]?.pivot ?? null, mesh: node }; }} geometry={petal.geometry} material={petalMaterial} frustumCulled={false} /></group></group>;
    })}
    {form.center && <group ref={centerRef} position={[0, kind === "peony" ? 0.35 : 0.15, 0]}>
      {Array.from({ length: kind === "lily" || kind === "alstroemeria" ? 6 : kind === "orchid" ? 3 : 10 }, (_, index) => <group key={index} rotation={[0, index * Math.PI * 2 / (kind === "lily" || kind === "alstroemeria" ? 6 : kind === "orchid" ? 3 : 10), 0]}>
        <mesh position={[0, 0.15, 0.09]} material={centerMaterial}><cylinderGeometry args={[0.009, 0.009, 0.3, 4]} /></mesh>
        <mesh position={[0, 0.31, 0.13]} material={centerMaterial}><sphereGeometry args={[0.035, 6, 5]} /></mesh>
      </group>)}
    </group>}
    </group>
  </group>;
}
