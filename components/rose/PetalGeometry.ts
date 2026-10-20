import { BufferAttribute, BufferGeometry, Color } from "three";
import { bloomConfig, type BloomQuality } from "@/lib/bloom.config";

export type PetalShape = {
  length: number;
  width: number;
  curl: number;
  variation: number;
  profile?: "rounded" | "pointed" | "ruffled";
  closedWidth?: number;
  closedLength?: number;
  pattern?: "lily" | "alstroemeria";
};
export type PetalPalette = { petal: string; light: string; shade: string };

// Local coordinates: root at (0,0,0), tip toward +Y, cup toward +Z.
// The parent opening pivot rotates about the root, while this surface morphs.
function pose(shape: PetalShape, rows: number, columns: number, openness: number) {
  const positions = new Float32Array((rows + 1) * (columns + 1) * 3);
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let column = 0; column <= columns; column++) {
      const u = column / columns * 2 - 1;
      const at = (row * (columns + 1) + column) * 3;
      const openBody = shape.profile === "pointed"
        ? Math.pow(Math.sin(Math.PI * t), 0.7)
        : Math.pow(Math.sin(Math.PI * t * 0.5), 0.82) * (1 - 0.13 * t);
      const closedBody = Math.pow(Math.sin(Math.PI * t), 0.65);
      const body = closedBody * (1 - openness) + openBody * openness;
      const root = 0.035 + body * 0.965;
      const width = shape.width * ((shape.closedWidth ?? 0.38) * (1 - openness) + openness) * root;
      const asymmetry = 1 + shape.variation * (u * 0.16 + t * 0.08);
      positions[at] = u * width * asymmetry;
      positions[at + 1] = shape.length * ((shape.closedLength ?? 1) * (1 - openness) + openness) * t - shape.length * 0.32 * Math.pow(Math.abs(u), 2) * Math.pow(t, 6)
        + (t > 0.77 ? Math.sin((u + shape.variation) * Math.PI * 1.5) * (shape.profile === "ruffled" ? 0.075 : 0.014) * (t - 0.77) / 0.23 * openness : 0);
      positions[at + 2] = -Math.pow(Math.abs(u), 2) * (0.04 + 0.18 * openness) * body
        + shape.curl * openness * Math.pow(t, 3) * (0.2 + 0.8 * Math.abs(u))
        + (1 - openness) * (0.26 * Math.sin(Math.PI * t) - 0.1 * t * t)
        + 0.045 * Math.sin(Math.PI * t) * (1 - Math.abs(u));
    }
  }
  return positions;
}

export function createPetalGeometry(shape: PetalShape, quality: BloomQuality, palette: PetalPalette = { petal: bloomConfig.colors.petal, light: bloomConfig.colors.petalLight, shade: bloomConfig.colors.petalShade }) {
  const { rows, columns } = bloomConfig.quality[quality];
  const indices: number[] = [];
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column;
    const b = a + columns + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new BufferGeometry();
  geometry.setIndex(indices);
  const base = pose(shape, rows, columns, 0);
  const middle = pose(shape, rows, columns, 0.52);
  const open = pose(shape, rows, columns, 1);
  geometry.setAttribute("position", new BufferAttribute(base, 3));
  geometry.morphAttributes.position = [new BufferAttribute(middle, 3), new BufferAttribute(open, 3)];
  geometry.morphAttributes.normal = [middle, open].map((positions) => {
    const poseGeometry = new BufferGeometry();
    poseGeometry.setIndex(indices);
    poseGeometry.setAttribute("position", new BufferAttribute(positions, 3));
    poseGeometry.computeVertexNormals();
    const normals = new BufferAttribute(new Float32Array(poseGeometry.getAttribute("normal").array), 3);
    poseGeometry.dispose();
    return normals;
  });
  const color = new Float32Array(base.length);
  const light = new Color(palette.light);
  const main = new Color(palette.petal);
  const shade = new Color(palette.shade);
  for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
    const t = row / rows;
    const u = Math.abs(column / columns * 2 - 1);
    const c = shade.clone().lerp(main, Math.min(1, 0.35 + t * 0.58)).lerp(light, Math.max(0, t - 0.46) * 0.42 + u * 0.06);
    if (shape.pattern === "lily") {
      const vein = Math.max(0, 1 - u * 5) * t;
      c.lerp(shade, 0.45 * vein);
      if (t > 0.28 && t < 0.82 && u < 0.77 && Math.sin(row * 61.7 + column * 29.3 + shape.variation * 103) > 0.8) c.lerp(shade, 0.72);
    } else if (shape.pattern === "alstroemeria" && t > 0.27 && t < 0.85 && u < 0.75) {
      const stripe = Math.sin((column / columns * 2 - 1) * 31 + t * 8 + shape.variation * 3);
      if (stripe > 0.45) c.lerp(shade, 0.53);
    }
    const at = (row * (columns + 1) + column) * 3;
    color[at] = c.r; color[at + 1] = c.g; color[at + 2] = c.b;
  }
  geometry.setAttribute("color", new BufferAttribute(color, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createLeafGeometry(length: number, width: number, quality: BloomQuality) {
  const shape: PetalShape = { length, width, curl: -0.12, variation: 0.5, closedWidth: 1, profile: "pointed" };
  const geometry = createPetalGeometry(shape, quality);
  const openPose = geometry.morphAttributes.position?.[1];
  if (!openPose) throw new Error("Leaf open pose was not created");
  geometry.setAttribute("position", openPose.clone());
  // A leaf is a still surface: remove petal morphs and color attribute.
  delete geometry.morphAttributes.position;
  delete geometry.morphAttributes.normal;
  geometry.deleteAttribute("color");
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
