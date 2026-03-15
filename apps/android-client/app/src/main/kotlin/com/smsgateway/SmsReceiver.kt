package com.smsgateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import android.provider.Telephony
import android.util.Log
import com.smsgateway.api.GatewayApi
import com.smsgateway.api.SmsPayload
import com.smsgateway.data.AppPreferences
import com.smsgateway.data.SmsQueue
import kotlinx.coroutines.*

class SmsReceiver : BroadcastReceiver() {
    private val tag = "SmsReceiver"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onReceive(context: Context, intent: Intent) {
        Log.i(tag, "=== BroadcastReceiver triggered === action=${intent.action}")

        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            Log.d(tag, "Not SMS_RECEIVED action, ignoring: ${intent.action}")
            return
        }

        val prefs = AppPreferences(context)
        if (!prefs.isConfigured || !prefs.serviceEnabled) {
            Log.w(tag, "Service not configured (configured=${prefs.isConfigured}) or disabled (enabled=${prefs.serviceEnabled}), ignoring SMS")
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) {
            Log.w(tag, "No messages in intent")
            return
        }
        Log.i(tag, "Received ${messages.size} message parts")

        // Extend broadcast lifecycle (up to 60s instead of default 10s)
        val pendingResult = goAsync()

        // Acquire WakeLock to keep CPU alive during HTTP request
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "SmsGateway::SmsReceiver"
        ).apply { acquire(30_000) } // 30 second timeout

        // Group message parts by sender
        val grouped = mutableMapOf<String, StringBuilder>()
        for (msg in messages) {
            val sender = msg.displayOriginatingAddress ?: "unknown"
            grouped.getOrPut(sender) { StringBuilder() }.append(msg.displayMessageBody ?: "")
        }

        scope.launch {
            try {
                for ((sender, body) in grouped) {
                    val payload = SmsPayload(
                        deviceId = prefs.deviceId,
                        sender = sender,
                        message = body.toString(),
                        timestamp = System.currentTimeMillis() / 1000
                    )

                    Log.d(tag, "SMS received from $sender: ${body.toString().take(50)}...")

                    // Mark as processed for ContentObserver dedup
                    SmsDedup.markProcessed(context, sender, body.toString())

                    try {
                        GatewayApi.initialize(prefs.apiUrl)
                        val response = GatewayApi.getService().sendSms(prefs.apiKey, payload)

                        if (response.isSuccessful) {
                            Log.d(tag, "SMS forwarded successfully")
                        } else {
                            Log.w(tag, "API returned ${response.code()}, queueing for retry")
                            SmsQueue(context).enqueue(payload, prefs.apiKey)
                        }
                    } catch (e: Exception) {
                        Log.e(tag, "Failed to forward SMS: ${e.message}")
                        SmsQueue(context).enqueue(payload, prefs.apiKey)
                    }
                }
            } finally {
                // Release WakeLock
                if (wakeLock.isHeld) wakeLock.release()
                // Finish async broadcast
                pendingResult.finish()
            }
        }
    }
}
