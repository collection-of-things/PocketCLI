# Run PocketCLI on your phone with Termux

This is the default PocketCLI setup: the server, Node, and Codex CLI run inside
[Termux](https://termux.dev) on your Android phone, and the PocketCLI app connects to them over
`localhost`. Nothing leaves the phone except the agent's own API traffic.

Codex CLI is the first supported provider for this setup. Other provider CLIs work when they run
under Termux, but they are not verified yet.

> This path is still being validated. If a step fails, open an issue at
> [screen-gd/PocketCLI](https://github.com/screen-gd/PocketCLI/issues) with the command and its output.

## Requirements

- Android 10 or newer with Termux from [F-Droid](https://f-droid.org/packages/com.termux/) or
  GitHub. The Google Play build is outdated and does not work.
- The PocketCLI app installed on the same phone.
- A ChatGPT account or OpenAI API key for Codex.
- About 500 MB of free storage.

## Install

In the PocketCLI app, open **Add environment** and tap **Copy command**, or copy this:

```bash
curl -fsSL https://raw.githubusercontent.com/screen-gd/PocketCLI/main/scripts/termux/install.sh | bash
```

Paste it into Termux. The installer:

1. installs Node, git, and the compiler toolchain with `pkg`;
2. downloads the prebuilt PocketCLI server and compiles its native terminal support;
3. installs Codex CLI, using the [codex-termux](https://github.com/DioNanos/codex-termux) build
   (`@mmmbuto/codex-cli-termux`), which is Codex rebuilt to run on Android;
4. registers start-on-boot (see below);
5. starts the server on `127.0.0.1:13773` and opens the PocketCLI app with a pairing link.

When the app opens, the host and pairing code are already filled in. Tap **Add environment**.
The pairing code is single use; the app keeps its own credential afterwards and reconnects on
its own while the server runs.

Then sign Codex in yourself, in Termux:

```bash
codex login
```

PocketCLI uses the credentials Codex stores in `~/.codex`, the same as on a computer. There is
nothing to restart afterwards.

Then open **Settings > Providers**, confirm Codex is enabled, and add a project folder from
Termux's home directory (for example `/data/data/com.termux/files/home/myproject`).

## Day to day

All commands run in Termux.

| Task                                     | Command            |
| ---------------------------------------- | ------------------ |
| Start the server (and re-pair if needed) | `pocketcli start`  |
| Get a fresh pairing link for the app     | `pocketcli pair`   |
| Stop the server                          | `pocketcli stop`   |
| Check whether it is running              | `pocketcli status` |
| Follow the server log                    | `pocketcli logs`   |
| Sign Codex in again                      | `codex login`      |
| Update to the latest server build        | `pocketcli update` |

`pocketcli start` takes a wake lock so Android does not suspend the server while the screen is
off. Also exclude Termux from battery optimization in Android settings.

### Start on boot

Install the [Termux:Boot](https://f-droid.org/packages/com.termux.boot/) app and open it once.
The installer already wrote `~/.termux/boot/pocketcli.sh`, so the server starts after every
reboot. The app reconnects automatically; no new pairing is needed.

## Where things live

- Server and launcher: `~/.pocketcli/server`
- Server log: `~/.pocketcli/server.log`
- Server data (threads, projects, pairing credentials): `~/.t3`
- Codex CLI credentials: `~/.codex`

## Known rough edges

- `pocketcli update` downloads the `server-latest` build from GitHub Releases, which follows the
  `main` branch. There are no stable releases yet.
- Workspace file search is unavailable on Android; the native file indexer has no Android build.
  Everything else is expected to work; report what does not.
- Agents run under Termux's Linux userland. Tools that expect `/usr/bin` paths or glibc may need
  Termux equivalents from `pkg`.
- Battery and thermal limits apply. Long agent runs are slower than on a laptop.

## Connecting from a computer too

The Termux server listens on loopback only. To also reach it from another device, start it by
hand on a reachable interface instead of using `pocketcli start`:

```bash
node ~/.pocketcli/server/bin.mjs serve --host 0.0.0.0 --port 13773
```

Then follow [Remote access](./remote-access.md) to pair the other device.
