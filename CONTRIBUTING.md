# Contributing

PocketCLI is a fork of T3 Code. All work on this fork happens at
[collection-of-things/PocketCLI](https://github.com/collection-of-things/PocketCLI). Open issues and pull requests there,
never against `pingdotgg/t3code`. If you cloned this repo and `gh pr create` offers the upstream
repository, run `gh repo set-default collection-of-things/PocketCLI` once in your checkout.

## Developer setup

See the [development runbook](docs/operations/development.md#first-checkout) for the initial checkout,
development commands, and tests. Mobile native builds are covered in
[apps/mobile/README.md](apps/mobile/README.md).

## What to work on

The focus is the mobile app and the server it talks to, with the server running on the phone in
Termux as the primary target and Codex CLI as the first supported provider. Fixes, reliability work,
and anything that makes the on-device path work better are welcome. Changes to the web UI in
`apps/web` are low priority; it exists as a fallback the server can serve, not as a product surface.

Report bugs in issues. Discuss larger ideas in
[Discussions](https://github.com/collection-of-things/PocketCLI/discussions) before building them, so the
direction is agreed before you spend time on it.

## Pull requests

- Solve one problem per PR. Split unrelated fixes.
- Use a conventional commit title in plain language, such as
  `fix(mobile): thread list no longer flickers`.
- Explain the problem, the fix, and how you verified it. Include before/after screenshots for UI
  changes and a short recording for motion or timing changes. Upload evidence to GitHub; never
  commit PR-only assets.
- Run the focused checks for what you changed: `vp test run <files>`, `vp lint <files>`,
  `vp run --filter <package> typecheck`. CI runs the full suite.
- If an agent did the work, say which model and harness at the end of the description.

## Code of conduct

Be kind and direct. Assume good faith.
