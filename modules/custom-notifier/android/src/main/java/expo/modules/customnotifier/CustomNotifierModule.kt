package expo.modules.customnotifier

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.BitmapFactory
import android.os.Build
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.URL
import kotlin.concurrent.thread

class CustomNotifierModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CustomNotifier")

    AsyncFunction("displayCustomNotification") { title: String, body: String, imageUrl: String ->
      val context = appContext.reactContext ?: return@AsyncFunction

      // Run on a background thread so we don't freeze the app while downloading the image
      thread {
        try {
          // 1. Download or load the AI image (supports http/https and local file:// URIs)
          val bitmap = if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
            val url = URL(imageUrl)
            val connection = url.openConnection()
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            BitmapFactory.decodeStream(connection.getInputStream())
          } else if (imageUrl.startsWith("file://")) {
            BitmapFactory.decodeFile(imageUrl.removePrefix("file://"))
          } else {
            val file = File(imageUrl)
            if (file.exists()) BitmapFactory.decodeFile(file.absolutePath) else null
          }

          val packageName = context.packageName

          // 2. Connect to our custom_notification.xml
          val layoutId = context.resources.getIdentifier("custom_notification", "layout", packageName)
          val remoteViews = RemoteViews(packageName, layoutId)

          // 3. Inject text and image into the XML layout
          val titleId = context.resources.getIdentifier("notif_title", "id", packageName)
          val bodyId = context.resources.getIdentifier("notif_body", "id", packageName)
          val imageId = context.resources.getIdentifier("notif_image", "id", packageName)

          remoteViews.setTextViewText(titleId, title)
          remoteViews.setTextViewText(bodyId, body)
          if (bitmap != null) {
            remoteViews.setImageViewBitmap(imageId, bitmap)
          }

          val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
          val channelId = "love-channel-custom"

          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Love Notifications", NotificationManager.IMPORTANCE_HIGH)
            manager.createNotificationChannel(channel)
          }

          val iconId = context.resources.getIdentifier("ic_launcher", "mipmap", packageName)

          // 4. Build and display the notification
          val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(if (iconId != 0) iconId else android.R.drawable.ic_dialog_info)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle()) // Blends smoothly with Android UI
            .setCustomContentView(remoteViews) // Overrides default notification UI with Pinterest layout
            .setAutoCancel(true)

          manager.notify(System.currentTimeMillis().toInt(), builder.build())
        } catch (e: Exception) {
          e.printStackTrace() // Fails gracefully if image URL is unreachable
        }
      }
    }
  }
}
