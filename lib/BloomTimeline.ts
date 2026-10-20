import { bloomConfig } from "./bloom.config";
import { clamp01 } from "./bloom-pose";

// Elapsed time is supplied by the renderer; this class never starts its own RAF.
export class BloomTimeline {
  progress = 0;
  playing = false;
  private completed = false;

  constructor(private onComplete: () => void, private durationMs = bloomConfig.durationMs) {}

  play() { if (this.progress < 1) this.playing = true; }
  pause() { this.playing = false; }
  replay() { this.progress = 0; this.playing = true; this.completed = false; }
  seek(progress: number) { this.progress = clamp01(progress); this.playing = false; this.notify(); }
  skip() { this.seek(1); }
  tick(deltaMs: number) {
    if (!this.playing || deltaMs <= 0) return this.progress;
    this.progress = clamp01(this.progress + deltaMs / this.durationMs);
    if (this.progress === 1) { this.playing = false; this.notify(); }
    return this.progress;
  }
  private notify() {
    if (this.progress === 1 && !this.completed) { this.completed = true; this.onComplete(); }
  }
}
