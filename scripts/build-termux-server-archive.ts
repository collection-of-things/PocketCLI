// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - Release packaging runs as a plain Node script in CI.
/**
 * Stage the server for phones: `release/pocketcli-server.tar.gz`.
 *
 * Phones cannot build this repo (the toolchain's native binaries have no
 * Android builds), so CI produces one platform-independent archive and the
 * Termux installer downloads it. The archive holds the bundled server, the
 * web client it serves, the Termux launcher, and a package.json that lists
 * only the runtime-external native packages. `npm install` on the device then
 * compiles node-pty locally and skips the platform packages it cannot use.
 *
 * Run after `vp run --filter @t3tools/web build` and `vp run --filter t3 build:bundle`.
 */
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import { requireFile, stageServerPackage } from "./lib/stage-server-package.ts";

const repoRoot = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const webDist = NodePath.join(repoRoot, "apps/web/dist");
const releaseDir = NodePath.join(repoRoot, "release");
const stageDir = NodePath.join(releaseDir, "pocketcli-server");
const archivePath = NodePath.join(releaseDir, "pocketcli-server.tar.gz");

requireFile(
  NodePath.join(webDist, "index.html"),
  "Run `vp run --filter @t3tools/web build` first.",
);

const { version, dependencies } = stageServerPackage({
  repoRoot,
  stageDir,
  description: "PocketCLI server bundle for Termux. Run `pocketcli start`.",
});
NodeFS.cpSync(webDist, NodePath.join(stageDir, "client"), { recursive: true });
NodeFS.cpSync(
  NodePath.join(repoRoot, "scripts/termux/pocketcli"),
  NodePath.join(stageDir, "pocketcli"),
);
NodeFS.chmodSync(NodePath.join(stageDir, "pocketcli"), 0o755);

NodeFS.rmSync(archivePath, { force: true });
NodeChildProcess.execFileSync("tar", ["-czf", archivePath, "-C", releaseDir, "pocketcli-server"], {
  stdio: "inherit",
});

console.log(`Wrote ${archivePath} (server ${version})`);
console.log(`Runtime dependencies installed on device: ${Object.keys(dependencies).join(", ")}`);
