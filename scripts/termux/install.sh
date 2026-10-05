#!/usr/bin/env bash
# PocketCLI bootstrap for Termux (Android).
#
#   curl -fsSL https://raw.githubusercontent.com/collection-of-things/PocketCLI/main/scripts/termux/install.sh | bash
#
# Installs the toolchain, fetches the `pocketcli` launcher, and hands over to
# `pocketcli install`, which downloads the prebuilt server, installs Codex CLI,
# registers start-on-boot, starts the server, and opens the app to pair.
set -euo pipefail

LAUNCHER_URL="${POCKETCLI_LAUNCHER_URL:-https://raw.githubusercontent.com/collection-of-things/PocketCLI/main/scripts/termux/pocketcli}"
MIN_NODE_MAJOR=22

if [ -z "${PREFIX:-}" ] || [ ! -d "/data/data/com.termux/files/usr" ]; then
  echo "This installer only runs inside Termux on Android." >&2
  echo "Install Termux from F-Droid or GitHub (not Google Play), then run this again." >&2
  exit 1
fi

echo "Installing packages ..."
pkg update -y >/dev/null
pkg install -y nodejs git python clang make curl >/dev/null

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt "$MIN_NODE_MAJOR" ]; then
  echo "Node $node_major is too old; PocketCLI needs Node $MIN_NODE_MAJOR or newer." >&2
  exit 1
fi

echo "Fetching the pocketcli launcher ..."
curl -fsSL "$LAUNCHER_URL" -o "$PREFIX/bin/pocketcli"
chmod 755 "$PREFIX/bin/pocketcli"

# stdin is the curl pipe under `curl | bash`; give the installer the terminal back
# so `codex login` can prompt.
exec pocketcli install </dev/tty
