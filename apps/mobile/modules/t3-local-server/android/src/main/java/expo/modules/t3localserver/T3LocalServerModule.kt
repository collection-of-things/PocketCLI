package expo.modules.t3localserver

import android.os.Build
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class T3LocalServerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("T3LocalServer")

    Function("isBundled") {
      val context = appContext.reactContext ?: return@Function false
      LocalServer.isBundled(context)
    }

    // Runs on a background queue; blocks until the server accepts connections.
    AsyncFunction("start") {
      val context = appContext.reactContext
        ?: throw CodedException("ERR_NO_CONTEXT", "No Android context.", null)
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        throw CodedException(
          "ERR_LOCAL_SERVER_UNSUPPORTED",
          "The on-device server needs Android 10 or newer.",
          null
        )
      }
      LocalServerService.start(context)
      val endpoint = try {
        LocalServer.ensureStarted(context)
      } catch (error: Exception) {
        throw CodedException(
          "ERR_LOCAL_SERVER_START",
          error.message ?: "The server failed to start.",
          error
        )
      }
      mapOf("httpBaseUrl" to endpoint.httpBaseUrl, "bootstrapToken" to endpoint.bootstrapToken)
    }
  }
}
