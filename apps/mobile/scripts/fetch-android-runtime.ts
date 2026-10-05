// Downloads the on-device server runtime (Node, node-pty, and the server bundle
// built by .github/workflows/android-runtime.yml) into the t3-local-server
// module, where Gradle packages it into the APK. Without it the app still builds;
// it just has no on-device server and falls back to Termux or a remote server.
//
//   node scripts/fetch-android-runtime.ts
//
// POCKETCLI_ANDROID_RUNTIME_URL overrides the source; a local path works too, and
// `none` builds without the on-device server.
// Runs automatically on EAS Android builds (eas-build-post-install).
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

const DEFAULT_URL =
  "https://github.com/screen-gd/PocketCLI/releases/download/android-runtime-latest/pocketcli-android-runtime.tar.gz";

if (process.env.EAS_BUILD_PLATFORM && process.env.EAS_BUILD_PLATFORM !== "android") {
  process.exit(0);
}

const source = process.env.POCKETCLI_ANDROID_RUNTIME_URL ?? DEFAULT_URL;
if (source === "none") {
  console.log("Skipping the Android runtime; the app will have no on-device server.");
  process.exit(0);
}
const mobileRoot = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const runtimeDir = NodePath.join(mobileRoot, "modules/t3-local-server/android/runtime");
const archive = NodePath.join(runtimeDir, "..", "runtime.tar.gz");

NodeFS.rmSync(runtimeDir, { recursive: true, force: true });
NodeFS.mkdirSync(runtimeDir, { recursive: true });

if (/^https?:\/\//.test(source)) {
  console.log(`Downloading ${source}`);
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  NodeFS.writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
  NodeChildProcess.execFileSync("tar", ["-xzf", archive, "-C", runtimeDir], { stdio: "inherit" });
  NodeFS.rmSync(archive, { force: true });
} else {
  NodeChildProcess.execFileSync("tar", ["-xzf", NodePath.resolve(source), "-C", runtimeDir], {
    stdio: "inherit",
  });
}

console.log(`Android runtime ready in ${runtimeDir}`);
