import { setPairingTokenOnUrl } from "@t3tools/shared/remote";
import { useEffect, useRef, useState } from "react";

import { connectPairingUrl } from "../../connection/onboarding";
import { type LocalServerEndpoint, localServer } from "../../native/localServer";
import { useEnvironments } from "../../state/environments";
import { useAtomCommand } from "../../state/use-atom-command";

function sameOrigin(left: string, right: string): boolean {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

/**
 * Starts the server embedded in the Android app on launch and pairs with it the
 * first time, so this phone is an environment without any setup. Later launches
 * reuse the saved session.
 */
export function LocalServerCoordinator() {
  const { isReady, environments } = useEnvironments();
  const connect = useAtomCommand(connectPairingUrl, "on-device server pairing");
  const [endpoint, setEndpoint] = useState<LocalServerEndpoint | null>(null);
  const pairingChecked = useRef(false);

  useEffect(() => {
    if (localServer === null) return;
    let cancelled = false;
    localServer.start().then(
      (started) => {
        if (!cancelled) setEndpoint(started);
      },
      (error: unknown) => {
        console.warn("[local-server] failed to start", error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady || endpoint === null || pairingChecked.current) return;
    pairingChecked.current = true;
    const paired = environments.some(
      (environment) =>
        environment.displayUrl !== null && sameOrigin(environment.displayUrl, endpoint.httpBaseUrl),
    );
    if (paired) return;
    void connect(
      setPairingTokenOnUrl(new URL(endpoint.httpBaseUrl), endpoint.bootstrapToken).toString(),
    );
  }, [connect, endpoint, environments, isReady]);

  return null;
}
