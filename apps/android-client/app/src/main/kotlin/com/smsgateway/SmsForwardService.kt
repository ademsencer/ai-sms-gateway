package com.smsgateway

import android.Manifest
import android.app.*
import android.content.Intent
import android.content.pm.PackageManager
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
import androidx.core.content.ContextCompat
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

        // Log SMS permission status for debugging
        logPermissionStatus()

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

        // SMS polling fallback — checks for new SMS every 15 seconds
        // This is the most reliable method and works on ALL Android devices
        // regardless of BroadcastReceiver or ContentObserver limitations
        scope.launch {
            delay(10_000) // Initial delay to let service settle
            Log.i(tag, "SMS polling fallback started (15s interval)")
            while (isActive) {
                try {
                    pollForNewSms()
                } catch (e: Exception) {
                    Log.e(tag, "SMS polling error: ${e.message}", e)
                }
                delay(15_000)
            }
        }

        Log.d(tag, "Service started — heartbeat, queue processor, and SMS polling active")
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

    private fun logPermissionStatus() {
        val receiveSms = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        val readSms = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        val batteryOptIgnored = pm.isIgnoringBatteryOptimizations(packageName)

        Log.i(tag, "=== PERMISSION STATUS ===")
        Log.i(tag, "RECEIVE_SMS: ${if (receiveSms) "GRANTED" else "DENIED"}")
        Log.i(tag, "READ_SMS: ${if (readSms) "GRANTED" else "DENIED"}")
        Log.i(tag, "Battery Optimization Ignored: $batteryOptIgnored")
        Log.i(tag, "Device: ${Build.MANUFACTURER} ${Build.MODEL}")
        Log.i(tag, "Android: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
        Log.i(tag, "========================")

        if (!receiveSms || !readSms) {
            Log.e(tag, "SMS PERMISSIONS NOT GRANTED! SMS forwarding will NOT work.")
            // Report this to the server so admin can see
            reportEvent("error", "SMS permissions not granted: RECEIVE_SMS=$receiveSms, READ_SMS=$readSms")
        }
    }

    /**
     * Polling-based SMS detection — the most reliable fallback.
     * Reads the SMS inbox directly and forwards any new messages.
     * Works on ALL Android devices regardless of BroadcastReceiver/ContentObserver issues.
     */
    private suspend fun pollForNewSms() {
        val prefs = AppPreferences(this)
        if (!prefs.isConfigured || !prefs.serviceEnabled) return

        val readSms = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
        if (!readSms) {
            Log.w(tag, "SMS polling: READ_SMS permission not granted, skipping")
            return
        }

        val lastId = SmsDedup.getLastSmsId(this)

        val cursor = contentResolver.query(
            Telephony.Sms.Inbox.CONTENT_URI,
            arrayOf(
                Telephony.Sms._ID,
                Telephony.Sms.ADDRESS,
                Telephony.Sms.BODY,
                Telephony.Sms.DATE
            ),
            if (lastId > 0) "${Telephony.Sms._ID} > ?" else null,
            if (lastId > 0) arrayOf(lastId.toString()) else null,
            "${Telephony.Sms._ID} ASC LIMIT 10"
        )

        if (cursor == null) {
            Log.w(tag, "SMS polling: cursor is null — READ_SMS permission issue?")
            return
        }

        var maxId = lastId
        var forwardedCount = 0

        cursor.use {
            while (it.moveToNext()) {
                val id = it.getLong(it.getColumnIndexOrThrow(Telephony.Sms._ID))
                val sender = it.getString(it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)) ?: "unknown"
                val body = it.getString(it.getColumnIndexOrThrow(Telephony.Sms.BODY)) ?: ""
                val date = it.getLong(it.getColumnIndexOrThrow(Telephony.Sms.DATE))

                if (id > maxId) maxId = id

                // Skip if already processed by BroadcastReceiver or ContentObserver
                if (SmsDedup.isProcessed(this@SmsForwardService, sender, body)) continue

                Log.i(tag, "SMS polling: new SMS detected from $sender (id=$id): ${body.take(50)}...")
                SmsDedup.markProcessed(this@SmsForwardService, sender, body)

                val payload = com.smsgateway.api.SmsPayload(
                    deviceId = prefs.deviceId,
                    sender = sender,
                    message = body,
                    timestamp = date / 1000
                )

                try {
                    GatewayApi.initialize(prefs.apiUrl)
                    val response = GatewayApi.getService().sendSms(prefs.apiKey, payload)
                    if (response.isSuccessful) {
                        Log.i(tag, "SMS polling: forwarded SMS from $sender")
                        forwardedCount++
                    } else {
                        Log.w(tag, "SMS polling: API returned ${response.code()}, queueing for retry")
                        SmsQueue(this@SmsForwardService).enqueue(payload, prefs.apiKey)
                    }
                } catch (e: Exception) {
                    Log.e(tag, "SMS polling: failed to forward SMS: ${e.message}")
                    SmsQueue(this@SmsForwardService).enqueue(payload, prefs.apiKey)
                }
            }
        }

        if (maxId > lastId) {
            SmsDedup.setLastSmsId(this, maxId)
            if (forwardedCount > 0) {
                Log.i(tag, "SMS polling: forwarded $forwardedCount new message(s), lastId updated to $maxId")
            }
        }
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
