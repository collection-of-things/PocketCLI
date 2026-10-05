# Install the host server on a computer

PocketCLI's primary setup runs everything on the phone; see
[Run PocketCLI on your phone with Termux](./termux.md). This page covers the other option: a
PocketCLI server on a computer you own, controlled from the phone over your LAN, Tailscale, or a
tunnel.

## Requirements

- Node.js 24 or newer and `vp` ([Install vp](../../README.md#install-vp)).
- At least one installed, authenticated provider CLI (see [Providers](#providers)). You can start
  the server first and configure providers afterwards.

## Build and run the server

There is no published installer for the fork yet. Build from source:

```bash
git clone https://github.com/screen-gd/PocketCLI
cd PocketCLI
vp i
vp run --filter @t3tools/web build
vp run --filter t3 build:bundle
node apps/server/dist/bin.mjs serve --host <private-ip>
```

Replace `<private-ip>` with the computer's LAN or tailnet address so the phone can reach it. The
server prints a pairing URL; see [Remote access](./remote-access.md) for pairing and connection
options. Run `node apps/server/dist/bin.mjs --help` for the full command reference.

Update with `git pull` and a rebuild. To keep the server running on Linux or macOS, see
[Running in the background](./background-service.md).

## Mobile app

The PocketCLI app is not on the app stores yet. Build it from source following
[apps/mobile/README.md](../../apps/mobile/README.md), or use an EAS build if you have configured
your own EAS project.

If the app crashes during launch, open **Settings > Diagnostics** on the next launch that
succeeds. It lists startup crashes from the last 7 days with the error and component stack. Copy
the report and paste it into a GitHub issue. Error messages can quote values from the app, so read
it over before sharing.

## Providers

Open **Settings > Providers** in the app, select the environment, and enable the provider you
want. Installation, login, and configuration belong to that environment's machine.

| Provider    | Install and authenticate                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex       | [Connect with ChatGPT](./providers-codex.md#connect-with-chatgpt), or install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`. |
| Claude      | Install [Claude Code](https://claude.com/product/claude-code), then run `claude auth login`.                                                              |
| Cursor      | Install [Cursor CLI](https://cursor.com/cli), then run `agent login`.                                                                                     |
| Grok Build  | Install [Grok Build CLI](https://x.ai/cli), then run `grok login`.                                                                                        |
| OpenCode    | Install [OpenCode](https://opencode.ai), then run `opencode auth login`.                                                                                  |
| Antigravity | Install and sign in with Google from the provider settings.                                                                                               |
| Pi          | Install [Pi](https://pi.dev), then run `pi` once to finish its login or API-key setup.                                                                    |

Provider CLIs must be on the server's `PATH`. If the server cannot find one, set its
**Binary path** in provider settings, especially when using a version manager. Cursor's
executable is `cursor-agent`, although its login command is `agent login`. Codex connected
through ChatGPT and Antigravity can use their managed runtimes without a `PATH` entry.

When a provider CLI is behind its latest release, its provider card shows the available version.
**Update now** runs the installer that owns the CLI (Homebrew, or a global npm, pnpm, Yarn, Bun,
Volta, or Vite+ install), or the CLI's own update command when the server cannot tell.

Add another provider instance for a separate account or configuration. Each instance can have its
own environment variables, such as API keys or a custom base URL. Mark secret values as sensitive;
after saving, the server does not display their original values.

For provider-specific setup and accounts, see [Codex](./providers-codex.md),
[Claude](./providers-claude.md), [OpenCode](./providers-opencode.md),
[Antigravity](./providers-antigravity.md), and [Pi](./providers-pi.md).

## Next steps

- [Working with threads](./thread-sidebar.md): start tasks and organize parallel work.
- [Permission modes](./permission-modes.md): choose when agents ask before acting.
- [Remote access](./remote-access.md): connect from another device.
- [Running in the background](./background-service.md): keep a Linux or macOS host available.
- [Updating](./updating.md): keep the app and connected servers in sync.
