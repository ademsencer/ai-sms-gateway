package com.smsgateway.data

import android.content.Context
import android.util.Log
import com.smsgateway.api.GatewayApi
import com.smsgateway.api.SmsPayload
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * File-backed SMS retry queue. Messages that fail to send are stored
 * and retried with exponential backoff.
 */
class SmsQueue(private val context: Context) {
    private val tag = "SmsQueue"
    private val queueFile: File get() = File(context.filesDir, "sms_queue.json")
    private val maxRetries = 5
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun enqueue(payload: SmsPayload, apiKey: String) {
        val queue = loadQueue()
        val item = JSONObject().apply {
            put("deviceId", payload.deviceId)
            put("sender", payload.sender)
            put("message", payload.message)
            put("timestamp", payload.timestamp)
            put("apiKey", apiKey)
            put("retries", 0)
        }
        queue.put(item)
        saveQueue(queue)
        Log.d(tag, "Enqueued SMS from ${payload.sender}")
    }

    fun processQueue() {
        scope.launch {
            val queue = loadQueue()
            val remaining = JSONArray()

            for (i in 0 until queue.length()) {
                val item = queue.getJSONObject(i)
                val retries = item.getInt("retries")

                if (retries >= maxRetries) {
                    Log.w(tag, "Dropping SMS after $maxRetries retries")
                    continue
                }

                try {
                    val payload = SmsPayload(
                        deviceId = item.getString("deviceId"),
                        sender = item.getString("sender"),
                        message = item.getString("message"),
                        timestamp = item.getLong("timestamp")
                    )
                    val apiKey = item.getString("apiKey")
                    val response = GatewayApi.getService().sendSms(apiKey, payload)

                    if (response.isSuccessful) {
                        Log.d(tag, "Retry succeeded for SMS from ${payload.sender}")
                    } else {
                        item.put("retries", retries + 1)
                        remaining.put(item)
                    }
                } catch (e: Exception) {
                    Log.e(tag, "Retry failed: ${e.message}")
                    item.put("retries", retries + 1)
                    remaining.put(item)
                }

                // Exponential backoff between retries
                delay(1000L * (1 shl retries.coerceAtMost(4)))
            }

            saveQueue(remaining)
        }
    }

    private fun loadQueue(): JSONArray {
        return try {
            if (queueFile.exists()) JSONArray(queueFile.readText()) else JSONArray()
        } catch (e: Exception) {
            JSONArray()
        }
    }

    private fun saveQueue(queue: JSONArray) {
        queueFile.writeText(queue.toString())
    }
}
