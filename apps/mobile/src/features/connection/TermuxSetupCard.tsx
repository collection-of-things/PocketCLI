import { useCallback, useState } from "react";
import { Linking, View } from "react-native";

import { SymbolView } from "../../components/AppSymbol";
import { AppText as Text } from "../../components/AppText";
import { tryCopyTextWithHaptic } from "../../lib/copyTextWithHaptic";
import { ConnectionSheetButton } from "./ConnectionSheetButton";
import { TERMUX_GUIDE_URL, TERMUX_INSTALL_COMMAND } from "./termuxSetup";

/**
 * The on-device option for Add Environment. Termux cannot be launched from
 * another app without its explicit intent, so the flow is: copy the install
 * command, paste it in Termux, and the installer opens PocketCLI again with a
 * loopback pairing link that lands pre-filled in this same screen.
 */
export function TermuxSetupCard() {
  const [copied, setCopied] = useState(false);

  const copyCommand = useCallback(async () => {
    if (await tryCopyTextWithHaptic(TERMUX_INSTALL_COMMAND, { target: "install command" })) {
      setCopied(true);
    }
  }, []);

  return (
    <View collapsable={false} className="gap-3 rounded-[24px] bg-grouped-card p-4">
      <View className="flex-row items-center gap-2">
        <SymbolView name="terminal" size={16} tintColorClassName="accent-icon" type="monochrome" />
        <Text className="text-base font-t3-bold text-foreground">Run on this phone</Text>
      </View>
      <Text className="text-sm leading-normal text-foreground-muted">
        Run the PocketCLI server and Codex CLI inside Termux. Nothing leaves the phone except the
        agent&apos;s own API traffic. Copy the command, paste it into Termux, and come back here
        when it asks you to pair.
      </Text>
      <Text
        selectable
        className="rounded-[12px] bg-secondary px-3 py-2 text-xs text-foreground ios:font-[family-name:Menlo] android:font-mono"
      >
        {TERMUX_INSTALL_COMMAND}
      </Text>
      <View className="flex-row flex-wrap justify-end gap-2">
        <ConnectionSheetButton
          compact
          icon="arrow.up.right"
          label="Guide"
          tone="secondary"
          onPress={() => {
            void Linking.openURL(TERMUX_GUIDE_URL);
          }}
        />
        <ConnectionSheetButton
          compact
          icon="doc.on.doc"
          label={copied ? "Copied" : "Copy command"}
          tone="primary"
          onPress={() => {
            void copyCommand();
          }}
        />
      </View>
      <Text className="text-xs leading-normal text-foreground-muted">
        Or connect to a computer on your network below.
      </Text>
    </View>
  );
}
