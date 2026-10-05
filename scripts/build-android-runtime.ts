// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - Release packaging runs as a plain Node script in CI.
/**
 * Assemble the runtime the Android app embeds: `release/pocketcli-android-runtime.tar.gz`.
 *
 *   jniLibs/arm64-v8a/libnode.so      Node built with the Android NDK
 *   jniLibs/arm64-v8a/libnodepty.so   node-pty's addon built against it
 *   assets/pocketcli-server.zip       the bundled server and its runtime node_modules
 *
 * apps/mobile/scripts/fetch-android-runtime.ts unpacks it into
 * apps/mobile/modules/t3-local-server/android/runtime. Native code must ship as
 * `lib*.so` because Android only executes files from the APK's native library
 * directory; see LocalServer.kt.
 *
 *   node scripts/build-android-runtime.ts --libnode <path> --libnodepty <path>
 *
 * Run after `vp run --filter t3 build:bundle`.
 */
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import * as NodeUtil from "node:util";

import { requireFile, stageServerPackage } from "./lib/stage-server-package.ts";

const { values } = NodeUtil.parseArgs({
  options: {
    libnode: { type: "string" },
    libnodepty: { type: "string" },
  },
});
if (!values.libnode || !values.libnodepty) {
  throw new Error("Pass --libnode and --libnodepty (outputs of the android-runtime workflow).");
}
requireFile(values.libnode, "Build Node for Android first.");
requireFile(values.libnodepty, "Build node-pty for Android first.");

const repoRoot = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const workDir = NodePath.join(repoRoot, "release/android-runtime");
const stageDir = NodePath.join(workDir, "server");
const runtimeDir = NodePath.join(workDir, "runtime");
const archivePath = NodePath.join(repoRoot, "release/pocketcli-android-runtime.tar.gz");

const run = (command: string, args: ReadonlyArray<string>, cwd: string) =>
  NodeChildProcess.execFileSync(command, args, { cwd, stdio: "inherit" });

const { version } = stageServerPackage({
  repoRoot,
  stageDir,
  description: "PocketCLI server embedded in the Android app.",
});

// No install scripts: node-pty would compile for the CI host. Its Android build
// ships as libnodepty.so and LocalServer.kt links it into place on the device.
// --os/--cpu pick the Android variants of optional platform packages, if any exist.
run(
  "npm",
  [
    "install",
    "--omit=dev",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--no-package-lock",
    "--os=android",
    "--cpu=arm64",
  ],
  stageDir,
);
const nodePtyDir = NodePath.join(stageDir, "node_modules/node-pty");
for (const unused of ["build", "prebuilds", "third_party", "src"]) {
  NodeFS.rmSync(NodePath.join(nodePtyDir, unused), { recursive: true, force: true });
}

NodeFS.rmSync(runtimeDir, { recursive: true, force: true });
const jniDir = NodePath.join(runtimeDir, "jniLibs/arm64-v8a");
const assetsDir = NodePath.join(runtimeDir, "assets");
NodeFS.mkdirSync(jniDir, { recursive: true });
NodeFS.mkdirSync(assetsDir, { recursive: true });
NodeFS.copyFileSync(values.libnode, NodePath.join(jniDir, "libnode.so"));
NodeFS.copyFileSync(values.libnodepty, NodePath.join(jniDir, "libnodepty.so"));
run("zip", ["-qrX", NodePath.join(assetsDir, "pocketcli-server.zip"), "."], stageDir);

NodeFS.rmSync(archivePath, { force: true });
run("tar", ["-czf", archivePath, "-C", runtimeDir, "jniLibs", "assets"], repoRoot);

const sizeMb = (path: string) => (NodeFS.statSync(path).size / 1024 / 1024).toFixed(1);
console.log(`Wrote ${archivePath} (server ${version}, ${sizeMb(archivePath)} MB)`);
console.log(`  libnode.so ${sizeMb(values.libnode)} MB`);
console.log(
  `  pocketcli-server.zip ${sizeMb(NodePath.join(assetsDir, "pocketcli-server.zip"))} MB`,
);
