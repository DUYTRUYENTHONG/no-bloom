import sharp from "sharp";
import { stat } from "node:fs/promises";

// Fixed source assets; compression/resizing only, no artwork or likeness edits.
for (const [source, target, width] of [
  ["public/rose-bud-reference.png", "public/rose-bud-reference.webp", 900],
  ["public/guide-avatar.png", "public/guide-avatar.webp", 256],
  ["public/guide-avatar-wave.png", "public/guide-avatar-wave.webp", 256],
  ["public/guide-avatar-thinking.png", "public/guide-avatar-thinking.webp", 256],
]) {
  await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 90 }).toFile(target);
  console.log(`${source}: ${(await stat(source)).size} → ${(await stat(target)).size} bytes`);
}
