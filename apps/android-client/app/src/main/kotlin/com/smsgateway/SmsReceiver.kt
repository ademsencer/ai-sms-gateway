package com.smsgateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
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
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val prefs = AppPreferences(context)
        if (!prefs.isConfigured || !prefs.serviceEnabled) {
            Log.d(tag, "Service not configured or disabled, ignoring SMS")
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        // Group message parts by sender
        val grouped = mutableMapOf<String, StringBuilder>()
        for (msg in messages) {
            val sender = msg.displayOriginatingAddress ?: "unknown"
            grouped.getOrPut(sender) { StringBuilder() }.append(msg.displayMessageBody ?: "")
        }

        for ((sender, body) in grouped) {
            val payload = SmsPayload(
                deviceId = prefs.deviceId,
                sender = sender,
                message = body.toString(),
                timestamp = System.currentTimeMillis() / 1000
            )

            Log.d(tag, "SMS received from $sender: ${body.toString().take(50)}...")

            scope.launch {
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
        }
    }
}
