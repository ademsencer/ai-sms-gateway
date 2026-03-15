package com.smsgateway

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.provider.Telephony
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

    private var wakeLock: PowerManager.WakeLock? = null
    private var smsObserver: SmsObserver? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        // Acquire partial WakeLock to keep CPU alive in background
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "SmsGateway::ForegroundService"
        ).apply { acquire() }

        // Register ContentObserver as fallback for SMS detection
        val handler = Handler(Looper.getMainLooper())
        smsObserver = SmsObserver(handler, this).also { observer ->
            contentResolver.registerContentObserver(
                Telephony.Sms.CONTENT_URI,
                true,
                observer
            )
        }

        // Initialize last SMS ID so observer only picks up new messages
        initializeLastSmsId()

        Log.d(tag, "Service created — WakeLock acquired, ContentObserver registered")
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

        // Heartbeat loop — keeps device "online" on the server (TTL is 120s)
        scope.launch {
            while (isActive) {
                delay(90_000) // Every 90 seconds
                try {
                    reportEvent("heartbeat", null)
                } catch (e: Exception) {
                    Log.e(tag, "Heartbeat failed: ${e.message}")
                }
            }
        }

        // Process any queued messages periodically
        scope.launch {
            while (isActive) {
                try {
                    SmsQueue(this@SmsForwardService).processQueue()
                } catch (e: Exception) {
                    Log.e(tag, "Queue processing error: ${e.message}")
                }
                delay(60_000)
            }
        }

        Log.d(tag, "Service started — heartbeat and queue processor active")
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        reportEvent("disconnected", "Service stopped")

        // Unregister ContentObserver
        smsObserver?.let {
            contentResolver.unregisterContentObserver(it)
            it.destroy()
        }
        smsObserver = null

        // Release WakeLock
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null

        scope.cancel()
        Log.d(tag, "Service destroyed — WakeLock released, ContentObserver unregistered")
        super.onDestroy()
    }

    /**
     * Called when user swipes app from recent tasks.
     * Schedule service restart via AlarmManager to keep it alive.
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.d(tag, "Task removed — scheduling restart")

        val restartIntent = Intent(applicationContext, SmsForwardService::class.java)
        val pendingIntent = PendingIntent.getService(
            applicationContext,
            1,
            restartIntent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val alarmManager = getSystemService(ALARM_SERVICE) as AlarmManager
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + 5000,
            pendingIntent
        )

        super.onTaskRemoved(rootIntent)
    }

    private fun initializeLastSmsId() {
        if (SmsDedup.getLastSmsId(this) < 0) {
            try {
                val cursor = contentResolver.query(
                    Telephony.Sms.CONTENT_URI,
                    arrayOf(Telephony.Sms._ID),
                    null, null,
                    "${Telephony.Sms._ID} DESC LIMIT 1"
                )
                cursor?.use {
                    if (it.moveToFirst()) {
                        val maxId = it.getLong(0)
                        SmsDedup.setLastSmsId(this, maxId)
                        Log.d(tag, "Initialized last SMS ID: $maxId")
                    }
                }
            } catch (e: Exception) {
                Log.e(tag, "Failed to initialize last SMS ID: ${e.message}")
            }
        }
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
            .setContentText("Forwarding SMS — ${prefs.ownerName}")
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
}
