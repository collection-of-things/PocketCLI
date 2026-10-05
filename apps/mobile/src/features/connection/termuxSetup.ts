import { Platform } from "react-native";

/** One-line bootstrap users paste into Termux. Mirrors scripts/termux/install.sh. */
export const TERMUX_INSTALL_COMMAND =
  "curl -fsSL https://raw.githubusercontent.com/screen-gd/PocketCLI/main/scripts/termux/install.sh | bash";

export const TERMUX_GUIDE_URL =
  "https://github.com/screen-gd/PocketCLI/blob/main/docs/user/termux.md";

/** Termux only exists on Android, so the on-device option is Android only. */
export const TERMUX_SETUP_AVAILABLE = Platform.OS === "android";

/** Empty-state copy shown before any environment exists. */
export const NO_ENVIRONMENTS_DETAIL = TERMUX_SETUP_AVAILABLE
  ? "Run the server in Termux on this phone, or add an environment on another machine."
  : "Add an environment to load projects and start coding sessions.";
