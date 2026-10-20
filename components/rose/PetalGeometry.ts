import { BufferAttribute, BufferGeometry, Color } from "three";
import { bloomConfig, type BloomQuality } from "@/lib/bloom.config";

export type PetalShape = {
  length: number;
  width: number;
  curl: number;
  variation: number;
};

// Local coordinates: root at (0,0,0), tip toward +Y, cup toward +Z.
// The parent opening pivot rotates about the root, while this surface morphs.
function pose(shape: PetalShape, rows: number, columns: number, openness: number) {
  const positions = new Float32Array((rows + 1) * (columns + 1) * 3);
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let column = 0; column <= columns; column++) {
      const u = column / columns * 2 - 1;
      const at = (row * (columns + 1) + column) * 3;
      const body = Math.pow(Math.sin(Math.PI * t * 0.5), 0.82) * (1 - 0.13 * t);
      const root = 0.035 + body * 0.965;
      const width = shape.width * (0.38 + 0.62 * openness) * root;
      const asymmetry = 1 + shape.variation * (u * 0.16 + t * 0.08);
      positions[at] = u * width * asymmetry;
      positions[at + 1] = shape.length * t - 0.12 * Math.pow(Math.abs(u), 2.4) * Math.pow(t, 8)
        + (t > 0.77 ? Math.sin((u + shape.variation) * Math.PI * 1.5) * 0.014 * (t - 0.77) / 0.23 : 0);
      positions[at + 2] = -Math.pow(Math.abs(u), 2) * (0.04 + 0.18 * openness) * body
        + shape.curl * openness * Math.pow(t, 3) * (0.2 + 0.8 * Math.abs(u))
        + 0.045 * Math.sin(Math.PI * t) * (1 - Math.abs(u));
    }
  }
  return positions;
}

export function createPetalGeometry(shape: PetalShape, quality: BloomQuality) {
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
  const light = new Color(bloomConfig.colors.petalLight);
  const main = new Color(bloomConfig.colors.petal);
  const shade = new Color(bloomConfig.colors.petalShade);
  for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
    const t = row / rows;
    const u = Math.abs(column / columns * 2 - 1);
    const c = shade.clone().lerp(main, Math.min(1, 0.35 + t * 0.58)).lerp(light, Math.max(0, t - 0.46) * 0.42 + u * 0.06);
    const at = (row * (columns + 1) + column) * 3;
    color[at] = c.r; color[at + 1] = c.g; color[at + 2] = c.b;
  }
  geometry.setAttribute("color", new BufferAttribute(color, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createLeafGeometry(length: number, width: number, quality: BloomQuality) {
  const shape = { length, width, curl: -0.12, variation: 0.5 };
  const geometry = createPetalGeometry(shape, quality);
  // A leaf is a still surface: remove petal morphs and color attribute.
  delete geometry.morphAttributes.position;
  delete geometry.morphAttributes.normal;
  geometry.deleteAttribute("color");
  return geometry;
}
