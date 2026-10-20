import { spawn } from "node:child_process";
import { open, unlink, readFile } from "node:fs/promises";
import { root, fingerprint, receipt } from "./qa-utils.mjs";
import { join } from "node:path";

const tasks = {
  fast: [["npm", "run", "typecheck"], ["npm", "test"]],
  build: [["npm", "run", "build"]],
  journeys: [["npm", "run", "test:e2e"]],
  a11y: [["node", "scripts/qa-browser.mjs", "a11y"]],
  visual: [["node", "scripts/qa-browser.mjs", "visual"]],
  motion: [["node", "scripts/qa-motion.mjs"], ["node", "scripts/qa-exported-blooms.mjs"]],
  performance: [["node", "scripts/qa-performance.mjs", "final"]],
};
const target = process.argv[2];
if (target === "status") {
  const report = JSON.parse(await readFile(join(root, "docs/quality-review/summary.json"), "utf8"));
  if (report.sourceFingerprint !== await fingerprint()) { console.error("STALE: source changed since the quality report."); process.exit(1); }
  console.log(`Current report: ${report.overall}. See docs/quality-review/README.md.`);
  process.exit(report.overall === "PASS" ? 0 : 1);
}
if (target !== "full" && !tasks[target]) throw new Error("Unknown quality command");
const lockPath = join(root, ".qa-lock");
let lock;
try { lock = await open(lockPath, "wx"); } catch { throw new Error("Another QA command holds .qa-lock; do not benchmark concurrently. Remove a stale lock only after verifying its process exited."); }
await lock.writeFile(String(process.pid));
async function execute(args) {
  const [executable, ...parameters] = args;
  const env = { ...process.env };
  if (parameters.includes("build")) Object.assign(env, { GITHUB_PAGES: "true", NEXT_PUBLIC_ANALYTICS_ENABLED: "false", NEXT_PUBLIC_COUNTER_ENABLED: "false", NEXT_PUBLIC_GUIDE_ENDPOINT: "", NEXT_PUBLIC_ANALYTICS_TEST_MODE: "false", NEXT_PUBLIC_COUNTER_TEST_MODE: "false" });
  await new Promise((resolve, reject) => {
    // Every command and argument is from the fixed task map above.
    const child = spawn(executable === "node" ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm", parameters, { cwd: root, env, stdio: "inherit", shell: executable === "npm" && process.platform === "win32" });
    const timeout = setTimeout(() => { child.kill(); reject(new Error("QA command exceeded its six-minute budget")); }, 360000);
    child.on("error", (error) => { clearTimeout(timeout); reject(error); });
    child.on("exit", (code) => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error(`QA child exited ${code}`)); });
  });
}
try {
  for (const name of target === "full" ? ["fast", "build", "journeys", "a11y", "visual", "motion", "performance"] : [target]) {
    const before = await fingerprint();
    try {
      for (const command of tasks[name]) await execute(command);
      if (before !== await fingerprint()) throw new Error("Source changed during the check; evidence is stale.");
      await receipt(name, { status: "PASS" });
    } catch (error) { await receipt(name, { status: "FAIL", error: String(error) }); throw error; }
  }
} finally { await lock.close(); await unlink(lockPath); }
