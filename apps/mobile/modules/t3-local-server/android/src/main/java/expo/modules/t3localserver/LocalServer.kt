package expo.modules.t3localserver

import android.content.Context
import android.os.Build
import android.system.Os
import android.system.OsConstants
import androidx.annotation.RequiresApi
import java.io.File
import java.net.InetSocketAddress
import java.net.Socket
import java.security.SecureRandom
import java.util.zip.ZipInputStream

/**
 * The PocketCLI server running on this phone.
 *
 * Android only lets an app execute files that shipped in its APK's native library
 * directory, so Node ships as `libnode.so` (and node-pty's addon as
 * `libnodepty.so`). The server's JavaScript is plain data: it ships zipped in the
 * APK assets and is unpacked into app storage on first launch after each install.
 *
 * The server starts in the same "desktop" mode the T3 desktop app used: loopback
 * only, with a bootstrap token handed over on stdin that the client exchanges for
 * its own session. No pairing screen is involved.
 */
object LocalServer {
  const val PORT = 13780
  private const val ARCHIVE_ASSET = "pocketcli-server.zip"
  private const val READY_TIMEOUT_MS = 90_000L
  private const val MAX_LOG_BYTES = 5L * 1024 * 1024

  data class Endpoint(val httpBaseUrl: String, val bootstrapToken: String)

  private val lock = Any()
  @Volatile private var process: Process? = null
  @Volatile private var endpoint: Endpoint? = null

  /** Android 10 is the floor: the bundled Node and the codex-termux build both target API 29. */
  val isSupported: Boolean get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q

  fun isBundled(context: Context): Boolean =
    isSupported &&
      nodeBinary(context).exists() &&
      runCatching { context.assets.open(ARCHIVE_ASSET).close() }.isSuccess

  fun currentEndpoint(): Endpoint? = endpoint?.takeIf { process?.isAlive == true }

  /** Starts the server if it is not running and blocks until it accepts connections. Never call on the main thread. */
  @RequiresApi(Build.VERSION_CODES.Q)
  fun ensureStarted(context: Context): Endpoint = synchronized(lock) {
    currentEndpoint()?.let { return it }
    val app = context.applicationContext
    val dirs = Dirs(app)
    val serverDir = unpackServer(app, dirs)
    stopStale(dirs)
    val token = randomToken()
    val started = spawn(app, dirs, serverDir, token)
    try {
      waitUntilListening(started, dirs)
    } catch (error: Exception) {
      started.destroy()
      throw error
    }
    process = started
    Endpoint("http://127.0.0.1:$PORT", token).also { endpoint = it }
  }

  /** Blocks until the running server exits. Returns immediately when none is running. */
  fun awaitExit() {
    process?.waitFor()
  }

  fun stop() = synchronized(lock) {
    process?.destroy()
    process = null
    endpoint = null
  }

  private class Dirs(context: Context) {
    val root = File(context.filesDir, "pocketcli")
    val server = File(root, "server")
    val bin = File(root, "bin")
    val home = File(root, "home")
    val t3Home = File(root, "t3")
    val log = File(root, "server.log")
    val pid = File(root, "server.pid")
  }

  private fun nodeBinary(context: Context) = File(context.applicationInfo.nativeLibraryDir, "libnode.so")

  private fun unpackServer(context: Context, dirs: Dirs): File {
    @Suppress("DEPRECATION")
    val installStamp = context.packageManager.getPackageInfo(context.packageName, 0).lastUpdateTime.toString()
    val stampFile = File(dirs.server, ".install-stamp")
    if (stampFile.exists() && stampFile.readText() == installStamp) return dirs.server

    dirs.server.deleteRecursively()
    dirs.server.mkdirs()
    val root = dirs.server.canonicalPath + File.separator
    ZipInputStream(context.assets.open(ARCHIVE_ASSET).buffered()).use { zip ->
      generateSequence { zip.nextEntry }.forEach { entry ->
        val target = File(dirs.server, entry.name)
        require(target.canonicalPath.startsWith(root)) { "Unsafe path in server archive: ${entry.name}" }
        if (entry.isDirectory) {
          target.mkdirs()
        } else {
          target.parentFile?.mkdirs()
          target.outputStream().use { zip.copyTo(it) }
        }
      }
    }

    // node-pty loads build/Release/pty.node. Point it at the copy in the native
    // library directory so the addon is mapped from the APK, not app storage.
    val nativeDir = context.applicationInfo.nativeLibraryDir
    val ptyAddon = File(dirs.server, "node_modules/node-pty/build/Release/pty.node")
    ptyAddon.parentFile?.mkdirs()
    ptyAddon.delete()
    Os.symlink("$nativeDir/libnodepty.so", ptyAddon.path)

    // Subprocesses look tools up on PATH by their usual names.
    dirs.bin.deleteRecursively()
    dirs.bin.mkdirs()
    Os.symlink("$nativeDir/libnode.so", File(dirs.bin, "node").path)

    stampFile.writeText(installStamp)
    return dirs.server
  }

  /** Stops a server left behind when Android killed the app process but not its child. */
  private fun stopStale(dirs: Dirs) {
    val pid = dirs.pid.takeIf { it.exists() }?.readText()?.trim()?.toIntOrNull() ?: return
    dirs.pid.delete()
    val cmdline = runCatching { File("/proc/$pid/cmdline").readText() }.getOrNull() ?: return
    if (!cmdline.contains("libnode.so")) return
    runCatching { Os.kill(pid, OsConstants.SIGTERM) }
    repeat(50) {
      if (!File("/proc/$pid").exists()) return
      Thread.sleep(100)
    }
    runCatching { Os.kill(pid, OsConstants.SIGKILL) }
  }

  @RequiresApi(Build.VERSION_CODES.Q)
  private fun spawn(context: Context, dirs: Dirs, serverDir: File, token: String): Process {
    dirs.home.mkdirs()
    dirs.t3Home.mkdirs()
    if (dirs.log.length() > MAX_LOG_BYTES) dirs.log.delete()

    // The shell records the server's pid before exec-ing it, so a later launch can
    // stop a server that outlived its app process.
    val command = "echo \$\$ > \"\$POCKETCLI_PID_FILE\" && exec \"\$POCKETCLI_NODE\" \"\$POCKETCLI_ENTRY\" --bootstrap-fd 0"
    val builder = ProcessBuilder("/system/bin/sh", "-c", command)
      .directory(dirs.home)
      .redirectOutput(ProcessBuilder.Redirect.appendTo(dirs.log))
      .redirectErrorStream(true)
    builder.environment().apply {
      put("POCKETCLI_PID_FILE", dirs.pid.path)
      put("POCKETCLI_NODE", nodeBinary(context).path)
      put("POCKETCLI_ENTRY", File(serverDir, "bin.mjs").path)
      put("HOME", dirs.home.path)
      put("TMPDIR", context.cacheDir.path)
      put("PATH", "${dirs.bin.path}:/system/bin")
      put("SHELL", "/system/bin/sh")
      put("LANG", "en_US.UTF-8")
    }
    val started = builder.start()
    // The server reads one JSON line from fd 0 at startup (DesktopBackendBootstrap).
    started.outputStream.bufferedWriter().use { it.write(bootstrapEnvelope(dirs, token)); it.newLine() }
    return started
  }

  private fun bootstrapEnvelope(dirs: Dirs, token: String): String =
    org.json.JSONObject()
      .put("mode", "desktop")
      .put("noBrowser", true)
      .put("port", PORT)
      .put("host", "127.0.0.1")
      .put("t3Home", dirs.t3Home.path)
      .put("desktopBootstrapToken", token)
      .put("tailscaleServeEnabled", false)
      // Unused while tailscaleServeEnabled is false, but the schema requires a port.
      .put("tailscaleServePort", 443)
      .toString()

  private fun waitUntilListening(started: Process, dirs: Dirs) {
    val deadline = System.currentTimeMillis() + READY_TIMEOUT_MS
    while (System.currentTimeMillis() < deadline) {
      if (!started.isAlive) {
        throw IllegalStateException("The server exited during startup.\n${logTail(dirs)}")
      }
      val listening = runCatching {
        Socket().use { it.connect(InetSocketAddress("127.0.0.1", PORT), 250) }
      }.isSuccess
      if (listening) return
      Thread.sleep(250)
    }
    throw IllegalStateException("The server did not start within ${READY_TIMEOUT_MS / 1000}s.\n${logTail(dirs)}")
  }

  private fun logTail(dirs: Dirs): String =
    runCatching { dirs.log.readLines().takeLast(20).joinToString("\n") }.getOrDefault("")

  private fun randomToken(): String {
    val bytes = ByteArray(32)
    SecureRandom().nextBytes(bytes)
    return bytes.joinToString("") { "%02x".format(it) }
  }
}
