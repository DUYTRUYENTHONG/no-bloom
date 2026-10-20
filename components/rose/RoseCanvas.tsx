"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import { BloomTimeline } from "@/lib/BloomTimeline";
import { bloomConfig, type BloomQuality } from "@/lib/bloom.config";
import { RoseRig } from "./RoseRig";

export type DebugCommand = { kind: "seek" | "play" | "pause" | "replay" | "skip"; value?: number; nonce: number };
type Stage = "invitation" | "personalization" | "blooming" | "greeting" | "withering";
type Props = {
  stage: Stage; quality: BloomQuality; wireframe: boolean; showPrimary: boolean; showSecondary: boolean;
  debugCommand?: DebugCommand; onReady: () => void; onComplete: () => void; onFailure: () => void;
  onDebugProgress?: (value: number) => void;
};

function BloomController({ stage, onComplete, debugCommand, onDebugProgress, progress }: Pick<Props, "stage" | "onComplete" | "debugCommand" | "onDebugProgress"> & { progress: RefObject<number> }) {
  const { invalidate } = useThree();
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const timeline = useRef<BloomTimeline | null>(null);
  if (!timeline.current) timeline.current = new BloomTimeline(() => { if (stageRef.current === "blooming") completeRef.current(); });
  const lastTime = useRef<number | null>(null);
  const hidden = useRef(false);

  useEffect(() => {
    const visibility = () => { hidden.current = document.hidden; lastTime.current = null; if (!hidden.current) invalidate(); };
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [invalidate]);

  useEffect(() => {
    if (stage === "blooming") timeline.current!.replay();
    else if (stage === "greeting") timeline.current!.seek(1);
    else timeline.current!.seek(0);
    progress.current = timeline.current!.progress;
    lastTime.current = null;
    invalidate();
  }, [stage, progress, invalidate]);

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
    if (t.playing) {
      progress.current = t.tick(delta);
      onDebugProgress?.(progress.current);
      invalidate();
    }
  });
  return null;
}

function Scene(props: Props) {
  const progress = useRef(props.stage === "greeting" ? 1 : 0);
  const { invalidate } = useThree();
  useEffect(() => { invalidate(); }, [props.quality, props.wireframe, props.showPrimary, props.showSecondary, invalidate]);
  return <>
    <color attach="background" args={[bloomConfig.colors.stage]} />
    <ambientLight intensity={0.75} />
    <hemisphereLight args={["#fff0df", "#24430e", 0.9]} />
    <directionalLight position={[-3, 5, 7]} intensity={2.45} color="#fff1e8" />
    <directionalLight position={[3, 2, -4]} intensity={0.7} color="#f391bc" />
    <BloomController stage={props.stage} onComplete={props.onComplete} progress={progress} debugCommand={props.debugCommand} onDebugProgress={props.onDebugProgress} />
    <RoseRig primary progress={progress} quality={props.quality} wireframe={props.wireframe} visible={props.showPrimary} />
    <RoseRig primary={false} progress={progress} quality={props.quality} wireframe={props.wireframe} visible={props.showSecondary} />
  </>;
}

export function RoseCanvas(props: Props) {
  return <Canvas
    className="rose-canvas"
    frameloop="demand"
    dpr={[1, bloomConfig.quality[props.quality].dpr]}
    gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    camera={{ position: [0, 3.6, 8.5], zoom: 1.15, near: 0.1, far: 30, fov: 41 }}
    onCreated={({ gl, camera }) => {
      gl.toneMapping = ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.05;
      camera.lookAt(0, -0.25, 0);
      if (process.env.NODE_ENV === "development") {
        (window as typeof window & { __noBloomStats?: () => { calls: number; triangles: number } }).__noBloomStats = () => ({
          calls: gl.info.render.calls, triangles: gl.info.render.triangles,
        });
      }
      gl.domElement.addEventListener("webglcontextlost", props.onFailure, { once: true });
      props.onReady();
    }}
  ><Scene {...props} /></Canvas>;
}
