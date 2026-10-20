import { bloomConfig } from "./bloom.config";

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

// Pure pose evaluation: same seed and master progress produce the same frame.
// The last start + window is <= 1, so every petal completes at progress 1.
export function petalProgress(master: number, layer: number, index: number, seed: number, secondary = false) {
  const hash = Math.abs(Math.sin((seed + layer * 131 + index * 67) * 12.9898)) % 1;
  const starts = [0.09, 0.20, 0.34, 0.48];
  const windows = [0.47, 0.43, 0.38, 0.34];
  const start = starts[layer] + (secondary ? bloomConfig.secondaryDelay : 0) + hash * 0.035;
  return smooth((clamp01(master) - start) / windows[layer]);
}

export function petalPose(master: number, layer: number, index: number, seed: number, secondary = false) {
  const progress = petalProgress(master, layer, index, seed, secondary);
  const maxAngle = [0.68, 0.48, 0.27, 0.1][layer];
  return {
    progress,
    // Two absolute morph poses: closed→intermediate→open.
    middleWeight: progress < 0.5 ? progress * 2 : (1 - progress) * 2,
    openWeight: progress < 0.5 ? 0 : progress * 2 - 1,
    angle: progress * maxAngle,
  };
}
