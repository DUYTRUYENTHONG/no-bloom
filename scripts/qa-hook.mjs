import { readFile, mkdir, open, unlink } from "node:fs/promises";
import { join } from "node:path";
import { root, fingerprint } from "./qa-utils.mjs";

// No command execution, payload interpolation, transcript reads, or network calls.
const timer = setTimeout(() => process.exit(0), 2500);
let payload = "";
for await (const chunk of process.stdin) { payload += chunk; if (payload.length > 65536) { clearTimeout(timer); process.exit(0); } }
let input;
try { input = JSON.parse(payload); } catch { clearTimeout(timer); process.exit(0); }
if (!["SessionStart", "PostToolUse", "Stop"].includes(input.hook_event_name)) { clearTimeout(timer); process.exit(0); }
await mkdir(join(root, ".qa-cache"), { recursive: true });
const lockPath = join(root, ".qa-cache/hook.lock");
let lock;
try { lock = await open(lockPath, "wx"); } catch { clearTimeout(timer); process.exit(0); }
try {
  const report = JSON.parse(await readFile(join(root, "docs/quality-review/summary.json"), "utf8").catch(() => "{}"));
  if (report.sourceFingerprint !== await fingerprint()) console.log(JSON.stringify({ systemMessage: "NỞ quality evidence is stale or missing. Run the affected qa:* checks; report unresolved gates honestly. This hook does not restart the turn." }));
} finally { await lock.close(); await unlink(lockPath); clearTimeout(timer); }
