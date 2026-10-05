// @effect-diagnostics nodeBuiltinImport:off - Release packaging runs as a plain Node script in CI.
/**
 * Copy the bundled server (`apps/server/dist`) into `stageDir` with a
 * package.json that lists only the runtime-external native packages, so an
 * `npm install` beside it completes the server. Shared by the Termux archive and
 * the Android app runtime.
 */
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { parse as parseYaml } from "yaml";

import { selectCliRuntimeExternalDependencies } from "./cli-external-packages.ts";
import { resolveCatalogDependencies } from "./resolve-catalog.ts";

function readJson<T>(path: string): T {
  return JSON.parse(NodeFS.readFileSync(path, "utf8")) as T;
}

export function requireFile(path: string, hint: string): void {
  if (!NodeFS.existsSync(path)) {
    throw new Error(`Missing ${path}. ${hint}`);
  }
}

export function stageServerPackage(input: {
  readonly repoRoot: string;
  readonly stageDir: string;
  readonly description: string;
}): { readonly version: string; readonly dependencies: Record<string, string> } {
  const serverDist = NodePath.join(input.repoRoot, "apps/server/dist");
  requireFile(NodePath.join(serverDist, "bin.mjs"), "Run `vp run --filter t3 build:bundle` first.");

  const serverPackage = readJson<{
    readonly version: string;
    readonly dependencies: Record<string, string>;
  }>(NodePath.join(input.repoRoot, "apps/server/package.json"));
  const workspace = parseYaml(
    NodeFS.readFileSync(NodePath.join(input.repoRoot, "pnpm-workspace.yaml"), "utf8"),
  ) as {
    readonly catalog: Record<string, string>;
  };

  const sha = process.env.GITHUB_SHA?.slice(0, 7);
  const version = sha ? `${serverPackage.version}+${sha}` : serverPackage.version;
  const resolved = resolveCatalogDependencies(
    selectCliRuntimeExternalDependencies(serverPackage.dependencies),
    workspace.catalog,
    "apps/server",
  );
  // npm refuses to install a regular dependency whose `os` list leaves out the
  // device's platform, and Termux reports `android`. Packages the server only
  // loads on first use (such as fff-node for file search) become optional, so
  // npm skips them there instead of failing the whole install.
  const dependencies: Record<string, string> = {};
  const optionalDependencies: Record<string, string> = {};
  for (const [name, spec] of Object.entries(resolved)) {
    const { os } = readJson<{ readonly os?: ReadonlyArray<string> }>(
      NodePath.join(input.repoRoot, "apps/server/node_modules", name, "package.json"),
    );
    if (os !== undefined && !os.includes("android")) {
      optionalDependencies[name] = spec;
    } else {
      dependencies[name] = spec;
    }
  }

  NodeFS.rmSync(input.stageDir, { recursive: true, force: true });
  NodeFS.mkdirSync(input.stageDir, { recursive: true });
  // Source maps are most of the bundle's size and useless on a phone.
  NodeFS.cpSync(serverDist, input.stageDir, {
    recursive: true,
    filter: (source) => !source.endsWith(".map"),
  });
  NodeFS.writeFileSync(
    NodePath.join(input.stageDir, "package.json"),
    `${JSON.stringify(
      {
        name: "pocketcli-server",
        version,
        private: true,
        type: "module",
        description: input.description,
        engines: { node: ">=22.16" },
        dependencies,
        optionalDependencies,
      },
      null,
      2,
    )}\n`,
  );
  return { version, dependencies: { ...dependencies, ...optionalDependencies } };
}
