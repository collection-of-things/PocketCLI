# PocketCLI

PocketCLI puts coding agents in your pocket. It is an open source mobile app (iOS and Android) for
driving Codex CLI, Claude Code, Grok Build, Cursor, OpenCode, and Antigravity from your phone, using
the subscriptions you already have.

PocketCLI is a fork of [T3 Code](https://github.com/pingdotgg/t3code), trimmed down to the mobile app
and the Node server it talks to. It is not affiliated with T3 Tools. Development happens at
[collection-of-things/PocketCLI](https://github.com/collection-of-things/PocketCLI); issues and pull requests belong there,
not upstream.

## How it works

Two parts:

- **The app** (`apps/mobile`): a React Native client for chatting with agents, reviewing diffs,
  running terminals, and approving actions.
- **The server** (`apps/server`): a small Node WebSocket server that wraps the provider CLIs
  installed on a machine and streams their work to the app.

The server can run in two places:

1. **On the phone itself, inside [Termux](https://termux.dev)** (Android). Node, the server, and
   Codex CLI all run on-device; the app connects to `localhost`. This is the primary target.
   See [Run PocketCLI on your phone with Termux](./docs/user/termux.md).
2. **On a computer** you own, reached over your LAN, Tailscale, or a tunnel. See
   [Install the host server](./docs/user/install.md) and [Remote access](./docs/user/remote-access.md).

Provider support: Codex CLI is the first supported provider for on-device use. Claude Code, Cursor,
Grok Build, OpenCode, and Antigravity work when their CLIs are installed next to the server.

## Status

Early. Expect rough edges. The mobile app and server are inherited from T3 Code and work today; the
Termux on-device path is being validated.

## Documentation

- [Termux guide](./docs/user/termux.md)
- [Host server install](./docs/user/install.md)
- [Permission modes](./docs/user/permission-modes.md)
- [Remote access](./docs/user/remote-access.md)
- [Source control](./docs/user/source-control.md)
- Providers: [Codex](./docs/user/providers-codex.md) · [Claude](./docs/user/providers-claude.md) · [OpenCode](./docs/user/providers-opencode.md)
- [Full docs index](./docs/README.md)

Building from source? Start at [docs/internals/overview.md](./docs/internals/overview.md) and the
[development runbook](./docs/operations/development.md).

## Contributing

### Install `vp`

The repo uses Vite+, so install the global `vp` command-line tool.

macOS / Linux:

```bash
curl -fsSL https://vite.plus | bash
```

Windows:

```powershell
irm https://vite.plus/ps1 | iex
```

### Install dependencies

```bash
vp i
```

Then read [CONTRIBUTING.md](./CONTRIBUTING.md). Mobile build instructions live in
[apps/mobile/README.md](./apps/mobile/README.md).

## License

MIT, same as upstream. See [LICENSE](./LICENSE).
