import { requireOptionalNativeModule } from "expo";

export interface LocalServerEndpoint {
  readonly httpBaseUrl: string;
  /** Exchanged once for a bearer session, like a pairing code. */
  readonly bootstrapToken: string;
}

interface T3LocalServerModule {
  isBundled(): boolean;
  start(): Promise<LocalServerEndpoint>;
}

const nativeModule = requireOptionalNativeModule<T3LocalServerModule>("T3LocalServer");

/**
 * The server embedded in the Android app (modules/t3-local-server). Null on iOS,
 * and on Android builds made without the bundled runtime.
 */
export const localServer = nativeModule?.isBundled() ? nativeModule : null;
