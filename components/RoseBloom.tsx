"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import type { BloomQuality } from "@/lib/bloom.config";
import type { DebugCommand } from "./rose/RoseCanvas";

const RoseCanvas = dynamic(() => import("./rose/RoseCanvas").then((module) => module.RoseCanvas), { ssr: false });
type Stage = "invitation" | "personalization" | "blooming" | "greeting" | "withering";
type Props = { stage: Stage; motionEnabled: boolean; onComplete: () => void };

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function RoseBloom({ stage, motionEnabled, onComplete }: Props) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [checked, setChecked] = useState(false);
  const [debug, setDebug] = useState(false);
  const [quality, setQuality] = useState<BloomQuality>("balanced");
  const [wireframe, setWireframe] = useState(false);
  const [showPrimary, setShowPrimary] = useState(true);
  const [showSecondary, setShowSecondary] = useState(true);
  const [debugCommand, setDebugCommand] = useState<DebugCommand>();
  const [debugProgress, setDebugProgress] = useState(0);
  useEffect(() => {
    setSupported(Boolean(document.createElement("canvas").getContext("webgl2")));
    setChecked(true);
    if (process.env.NODE_ENV === "development") setDebug(new URLSearchParams(window.location.search).has("bloomDebug"));
  }, []);
  useEffect(() => { if (stage === "blooming" && (!motionEnabled || (checked && (!supported || failed)))) onComplete(); }, [motionEnabled, stage, onComplete, checked, supported, failed]);
  useEffect(() => {
    if (!motionEnabled || !supported || ready || failed || stage !== "blooming") return;
    const timeout = window.setTimeout(() => setFailed(true), 12000);
    return () => window.clearTimeout(timeout);
  }, [motionEnabled, supported, ready, failed, stage]);
  function command(kind: DebugCommand["kind"], value?: number) {
    setDebugCommand((prior) => ({ kind, value, nonce: (prior?.nonce ?? 0) + 1 }));
    if (value !== undefined) setDebugProgress(value);
  }
  const staticVisible = !motionEnabled || !supported || !ready || failed;
  const finalPose = stage === "greeting" || !motionEnabled || failed || (checked && !supported);
  return <div className="rose-bloom" data-rose-renderer={staticVisible ? "static" : "webgl"}>
    {staticVisible && <div className="static-rose-fallback" aria-hidden="true"><img src={finalPose ? "rose-bloom.webp" : "rose-bud.webp"} alt="" /></div>}
    {motionEnabled && supported && !failed && <SceneBoundary onFailure={() => setFailed(true)}>
      <RoseCanvas stage={stage} quality={quality} wireframe={wireframe} showPrimary={showPrimary} showSecondary={showSecondary}
        debugCommand={debugCommand} onReady={() => setReady(true)} onComplete={onComplete} onFailure={() => setFailed(true)}
        onDebugProgress={debug ? setDebugProgress : undefined} />
    </SceneBoundary>}
    {debug && <div className="rose-inspector">
      <label>Pose {debugProgress.toFixed(2)}<input type="range" min="0" max="1" step="0.01" value={debugProgress} onChange={(event) => command("seek", Number(event.target.value))} /></label>
      <div><button onClick={() => command("play")}>Play</button><button onClick={() => command("pause")}>Pause</button><button onClick={() => command("replay")}>Replay</button><button onClick={() => command("skip")}>Skip</button></div>
      <label>Quality <select value={quality} onChange={(event) => setQuality(event.target.value as BloomQuality)}><option value="balanced">Balanced</option><option value="high">High</option></select></label>
      <label><input type="checkbox" checked={wireframe} onChange={(event) => setWireframe(event.target.checked)} />Wireframe</label>
      <label><input type="checkbox" checked={showPrimary} onChange={(event) => setShowPrimary(event.target.checked)} />Primary</label>
      <label><input type="checkbox" checked={showSecondary} onChange={(event) => setShowSecondary(event.target.checked)} />Secondary</label>
    </div>}
  </div>;
}
