package com.smsgateway

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.smsgateway.api.DeviceEventPayload
import com.smsgateway.api.GatewayApi
import com.smsgateway.data.AppPreferences
import com.smsgateway.data.SmsQueue
import kotlinx.coroutines.*

class SmsForwardService : Service() {
    private val tag = "SmsForwardService"
    private val channelId = "sms_gateway_service"
    private val notificationId = 1001
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        Log.d(tag, "Service created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceCompat.startForeground(
                this, notificationId, notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(notificationId, notification)
        }

        // Report connected event
        reportEvent("connected", "Service started")

        // Process any queued messages periodically
        scope.launch {
            while (isActive) {
                try {
                    SmsQueue(this@SmsForwardService).processQueue()
                } catch (e: Exception) {
                    Log.e(tag, "Queue processing error: ${e.message}")
                    reportEvent("error", "Queue processing error: ${e.message}")
                }
                delay(60_000)
            }
        }

        Log.d(tag, "Service started")
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        reportEvent("disconnected", "Service stopped")
        scope.cancel()
        Log.d(tag, "Service destroyed")
        super.onDestroy()
    }

    private fun reportEvent(eventType: String, message: String? = null) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = AppPreferences(this@SmsForwardService)
                if (!prefs.isConfigured) return@launch

                GatewayApi.initialize(prefs.apiUrl)
                val payload = DeviceEventPayload(
                    deviceId = prefs.deviceId,
                    eventType = eventType,
                    message = message
                )
                val response = GatewayApi.getService().reportDeviceEvent(prefs.apiKey, payload)
                if (response.isSuccessful) {
                    Log.d(tag, "Device event reported: $eventType")
                } else {
                    Log.w(tag, "Device event report failed: ${response.code()}")
                }
            } catch (e: Exception) {
                Log.e(tag, "Failed to report device event: ${e.message}")
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "SMS Gateway Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the SMS forwarding service running"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val prefs = AppPreferences(this)
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("SMS Gateway Active")
            .setContentText("Device: ${prefs.deviceId}")
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
}
