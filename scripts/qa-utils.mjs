import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, join, relative, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function fingerprint() {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(join(root, directory), { withFileTypes: true }).catch(() => [])) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  for (const directory of ["app", "components", "lib", "public", "scripts", "tests", "supabase", ".github", ".codex"]) await walk(directory);
  files.push("package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "playwright.config.ts");
  const hash = createHash("sha256");
  for (const file of files.sort()) { hash.update(file.replaceAll(sep, "/")); hash.update(await readFile(join(root, file))); }
  return hash.digest("hex");
}
export async function jsonFile(path, data) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), `${JSON.stringify(data, null, 2)}\n`); }
export async function receipt(name, details) { await jsonFile(`.qa-cache/${name}.json`, { checkedAt: new Date().toISOString(), sourceFingerprint: await fingerprint(), ...details }); }
export async function requireCurrentExport(label) {
  if (label === "baseline") return;
  const build = JSON.parse(await readFile(join(root, ".qa-cache/build.json"), "utf8"));
  if (build.status !== "PASS" || build.sourceFingerprint !== await fingerprint()) throw new Error("Static export is stale; run npm run qa:build first.");
}
export async function staticSite() {
  const directory = join(root, "out");
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const path = decodeURIComponent(pathname.replace(/^\/no-bloom\/?/, "")) || "index.html";
    const file = resolve(directory, path.endsWith("/") ? `${path}index.html` : path);
    if (relative(directory, file).startsWith("..") || !file.startsWith(directory + sep)) { response.writeHead(403).end(); return; }
    try { const contents = await readFile(file); response.setHeader("content-type", mime[extname(file)] ?? "application/octet-stream"); response.writeHead(200).end(contents); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return { url: `http://127.0.0.1:${server.address().port}/no-bloom/`, close: () => new Promise((done) => server.close(done)) };
}
