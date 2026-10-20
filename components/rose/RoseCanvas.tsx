"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import { BloomTimeline } from "@/lib/BloomTimeline";
import { bloomConfig, type BloomQuality } from "@/lib/bloom.config";
import { RoseRig } from "./RoseRig";
import { BlossomRig } from "./BlossomRig";
import { smooth } from "@/lib/bloom-pose";
import type { FlowerKind } from "@/lib/flower-catalog";

export type DebugCommand = { kind: "seek" | "play" | "pause" | "replay" | "skip"; value?: number; nonce: number };
type Stage = "invitation" | "personalization" | "blooming" | "greeting" | "withering";
type Props = {
  kind: FlowerKind;
  staticPose: boolean;
  paused: boolean;
  stage: Stage; quality: BloomQuality; wireframe: boolean; showPrimary: boolean; showSecondary: boolean;
  debugCommand?: DebugCommand; onReady: () => void; onComplete: () => void; onClosed: () => void; onFailure: () => void;
  onDebugProgress?: (value: number) => void;
};

function BloomController({ stage, staticPose, paused, onComplete, onClosed, debugCommand, onDebugProgress, progress }: Pick<Props, "stage" | "staticPose" | "paused" | "onComplete" | "onClosed" | "debugCommand" | "onDebugProgress"> & { progress: RefObject<number> }) {
  const { invalidate } = useThree();
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const closedRef = useRef(onClosed);
  closedRef.current = onClosed;
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const timeline = useRef<BloomTimeline | null>(null);
  if (!timeline.current) timeline.current = new BloomTimeline(() => { if (stageRef.current === "blooming") completeRef.current(); });
  const lastTime = useRef<number | null>(null);
  const hidden = useRef(false);
  const closing = useRef({ start: 1, elapsed: 0, notified: false });

  useEffect(() => {
    const visibility = () => { hidden.current = document.hidden; lastTime.current = null; if (!hidden.current) invalidate(); };
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [invalidate]);

  useEffect(() => {
    if (staticPose) timeline.current!.seek(1);
    else if (stage === "blooming") timeline.current!.replay();
    else if (stage === "greeting") timeline.current!.seek(1);
    else if (stage === "withering") { timeline.current!.pause(); closing.current = { start: progress.current, elapsed: 0, notified: false }; }
    else timeline.current!.seek(0);
    if (stage !== "withering") progress.current = timeline.current!.progress;
    lastTime.current = null;
    invalidate();
  }, [stage, staticPose, progress, invalidate]);

  useEffect(() => {
    if (stage !== "blooming") return;
    if (paused) timeline.current!.pause(); else timeline.current!.play();
    lastTime.current = null;
    invalidate();
  }, [paused, stage, invalidate]);

  useEffect(() => {
    if (!debugCommand) return;
    const t = timeline.current!;
    if (debugCommand.kind === "seek") t.seek(debugCommand.value ?? 0);
    else if (debugCommand.kind === "play") t.play();
    else if (debugCommand.kind === "pause") t.pause();
    else if (debugCommand.kind === "replay") t.replay();
    else t.skip();
    progress.current = t.progress;
    lastTime.current = null;
    invalidate();
  }, [debugCommand, progress, invalidate]);

  useFrame(() => {
    const now = performance.now();
    if (hidden.current) { lastTime.current = null; return; }
    const delta = lastTime.current === null ? 0 : now - lastTime.current;
    lastTime.current = now;
    const t = timeline.current!;
    if (stageRef.current === "withering") {
      closing.current.elapsed += delta;
      progress.current = closing.current.start * (1 - smooth(closing.current.elapsed / 450));
      onDebugProgress?.(progress.current);
      if (closing.current.elapsed < 450) invalidate();
      else if (!closing.current.notified) { closing.current.notified = true; closedRef.current(); }
      return;
    }
    if (t.playing) {
      progress.current = t.tick(delta);
      onDebugProgress?.(progress.current);
      invalidate();
    }
  });
  return null;
}

function Scene(props: Props) {
  const progress = useRef(props.staticPose || props.stage === "greeting" ? 1 : 0);
  const { invalidate } = useThree();
  useEffect(() => { invalidate(); }, [props.kind, props.quality, props.wireframe, props.showPrimary, props.showSecondary, invalidate]);
  return <>
    <color attach="background" args={[bloomConfig.colors.stage]} />
    <ambientLight intensity={0.75} />
    <hemisphereLight args={["#fff0df", "#24430e", 0.9]} />
    <directionalLight position={[-3, 5, 7]} intensity={2.45} color="#fff1e8" />
    <directionalLight position={[3, 2, -4]} intensity={0.7} color="#f391bc" />
    <BloomController stage={props.stage} staticPose={props.staticPose} paused={props.paused} onComplete={props.onComplete} onClosed={props.onClosed} progress={progress} debugCommand={props.debugCommand} onDebugProgress={props.onDebugProgress} />
    {props.kind === "rose" || props.kind === "peach-rose" ? <>
      <RoseRig kind={props.kind} primary progress={progress} quality={props.quality} wireframe={props.wireframe} visible={props.showPrimary} />
      <RoseRig kind={props.kind} primary={false} progress={progress} quality={props.quality} wireframe={props.wireframe} visible={props.showSecondary} />
    </> : <>
      <BlossomRig kind={props.kind} primary progress={progress} quality={props.quality} wireframe={props.wireframe} visible={props.showPrimary} />
      <BlossomRig kind={props.kind} primary={false} progress={progress} quality={props.quality} wireframe={props.wireframe} visible={props.showSecondary} />
    </>}
  </>;
}

export function RoseCanvas(props: Props) {
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  return <Canvas
    className="rose-canvas"
    frameloop="demand"
    dpr={[1, bloomConfig.quality[props.quality].dpr]}
    gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    camera={{ position: [0, 3.1, 7.2], zoom: 1.18, near: 0.1, far: 30, fov: 41 }}
    onCreated={({ gl, camera }) => {
      gl.toneMapping = ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.05;
      camera.lookAt(0, 0.05, 0);
      if (process.env.NODE_ENV === "development") {
        const target = window as typeof window & { __noBloomStats?: () => { calls: number; triangles: number; frame: number; geometries: number; textures: number } };
        const stats = () => ({
          calls: gl.info.render.calls, triangles: gl.info.render.triangles, frame: gl.info.render.frame,
          geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
        });
        target.__noBloomStats = stats;
        cleanup.current = () => { if (target.__noBloomStats === stats) delete target.__noBloomStats; gl.domElement.removeEventListener("webglcontextlost", props.onFailure); };
      } else {
        cleanup.current = () => gl.domElement.removeEventListener("webglcontextlost", props.onFailure);
      }
      gl.domElement.addEventListener("webglcontextlost", props.onFailure, { once: true });
      props.onReady();
    }}
  ><Scene {...props} /></Canvas>;
}
