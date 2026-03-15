package com.smsgateway

import android.content.Context
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.provider.Telephony
import android.util.Log
import com.smsgateway.api.GatewayApi
import com.smsgateway.api.SmsPayload
import com.smsgateway.data.AppPreferences
import com.smsgateway.data.SmsQueue
import kotlinx.coroutines.*

/**
 * ContentObserver fallback for SMS detection.
 *
 * Some devices (TECNO, Xiaomi, Huawei, OPPO) may not deliver
 * SMS_RECEIVED broadcasts to non-default SMS apps. This observer
 * watches the SMS content provider directly as a fallback.
 */
class SmsObserver(
    handler: Handler,
    private val context: Context
) : ContentObserver(handler) {

    private val tag = "SmsObserver"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var changeCount = 0

    override fun onChange(selfChange: Boolean, uri: Uri?) {
        super.onChange(selfChange, uri)
        changeCount++

        Log.d(tag, "onChange triggered #$changeCount — selfChange=$selfChange, uri=$uri")

        if (uri == null) {
            Log.d(tag, "URI is null, skipping")
            return
        }

        val prefs = AppPreferences(context)
        if (!prefs.isConfigured) {
            Log.w(tag, "App not configured, skipping SMS processing")
            return
        }
        if (!prefs.serviceEnabled) {
            Log.w(tag, "Service disabled, skipping SMS processing")
            return
        }

        Log.d(tag, "Processing SMS change — deviceId=${prefs.deviceId}, apiUrl=${prefs.apiUrl}")

        scope.launch {
            try {
                processNewSms(prefs)
            } catch (e: Exception) {
                Log.e(tag, "Error processing SMS from ContentObserver: ${e.message}", e)
            }
        }
    }

    private suspend fun processNewSms(prefs: AppPreferences) {
        val lastId = SmsDedup.getLastSmsId(context)
        Log.d(tag, "processNewSms — lastId=$lastId")

        val cursor = context.contentResolver.query(
            Telephony.Sms.Inbox.CONTENT_URI,
            arrayOf(
                Telephony.Sms._ID,
                Telephony.Sms.ADDRESS,
                Telephony.Sms.BODY,
                Telephony.Sms.DATE
            ),
            if (lastId > 0) "${Telephony.Sms._ID} > ?" else null,
            if (lastId > 0) arrayOf(lastId.toString()) else null,
            "${Telephony.Sms._ID} DESC LIMIT 5"
        ) ?: run {
            Log.w(tag, "SMS query returned null cursor — SMS READ permission may be missing!")
            return
        }

        Log.d(tag, "SMS query returned ${cursor.count} rows")
        var maxId = lastId

        cursor.use {
            while (it.moveToNext()) {
                val id = it.getLong(it.getColumnIndexOrThrow(Telephony.Sms._ID))
                val sender = it.getString(it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)) ?: "unknown"
                val body = it.getString(it.getColumnIndexOrThrow(Telephony.Sms.BODY)) ?: ""
                val date = it.getLong(it.getColumnIndexOrThrow(Telephony.Sms.DATE))

                if (id > maxId) maxId = id

                // Skip if already processed by BroadcastReceiver
                if (SmsDedup.isProcessed(context, sender, body)) {
                    Log.d(tag, "Skipping already-processed SMS from $sender")
                    continue
                }

                Log.d(tag, "ContentObserver detected new SMS from $sender: ${body.take(50)}...")

                // Mark as processed
                SmsDedup.markProcessed(context, sender, body)

                val payload = SmsPayload(
                    deviceId = prefs.deviceId,
                    sender = sender,
                    message = body,
                    timestamp = date / 1000
                )

                try {
                    GatewayApi.initialize(prefs.apiUrl)
                    val response = GatewayApi.getService().sendSms(prefs.apiKey, payload)

                    if (response.isSuccessful) {
                        Log.d(tag, "SMS forwarded via ContentObserver: $sender")
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

        // Update last processed ID
        if (maxId > lastId) {
            SmsDedup.setLastSmsId(context, maxId)
        }
    }

    fun destroy() {
        scope.cancel()
    }
}
