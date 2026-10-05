package expo.modules.t3localserver

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import kotlin.concurrent.thread

/**
 * Keeps the on-device server alive while the app is in the background. Android
 * kills background processes freely; a foreground service with a visible
 * notification is the supported way to keep long agent turns running.
 */
class LocalServerService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP || !LocalServer.isSupported) {
      LocalServer.stop()
      ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }
    ServiceCompat.startForeground(
      this,
      NOTIFICATION_ID,
      notification(),
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
      } else {
        0
      }
    )
    // A null intent means Android restarted the service after killing the app.
    thread(name = "pocketcli-server-watch") {
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) LocalServer.ensureStarted(this)
        LocalServer.awaitExit()
      } catch (error: Exception) {
        Log.e(TAG, "PocketCLI server failed", error)
      }
      // The server is gone; the notification would be lying.
      stopSelf()
    }
    return START_STICKY
  }

  override fun onDestroy() {
    LocalServer.stop()
    super.onDestroy()
  }

  private fun notification() = run {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      getSystemService(NotificationManager::class.java).createNotificationChannel(
        NotificationChannel(CHANNEL, "On-device server", NotificationManager.IMPORTANCE_LOW)
      )
    }
    val icon = resources.getIdentifier("notification_icon", "drawable", packageName)
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
    }
    val stop = PendingIntent.getService(
      this,
      0,
      Intent(this, LocalServerService::class.java).setAction(ACTION_STOP),
      PendingIntent.FLAG_IMMUTABLE
    )
    NotificationCompat.Builder(this, CHANNEL)
      .setContentTitle("PocketCLI server is running")
      .setContentText("Agents keep working while the app is closed.")
      .setSmallIcon(if (icon != 0) icon else android.R.drawable.ic_dialog_info)
      .setOngoing(true)
      .setShowWhen(false)
      .setContentIntent(open)
      .addAction(0, "Stop", stop)
      .build()
  }

  companion object {
    private const val TAG = "PocketCLIServer"
    private const val CHANNEL = "pocketcli-server"
    private const val NOTIFICATION_ID = 13780
    private const val ACTION_STOP = "expo.modules.t3localserver.STOP"

    fun start(context: Context) {
      ContextCompat.startForegroundService(context, Intent(context, LocalServerService::class.java))
    }
  }
}
