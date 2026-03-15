package com.smsgateway

import android.content.Context
import android.content.SharedPreferences

/**
 * SMS deduplication to prevent ContentObserver and BroadcastReceiver
 * from processing the same SMS twice.
 */
object SmsDedup {
    private const val PREFS_NAME = "sms_dedup"
    private const val MAX_ENTRIES = 100
    private const val KEY_PROCESSED_IDS = "processed_ids"
    private const val KEY_LAST_SMS_ID = "last_sms_id"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Generate a hash key for sender+message combo
     */
    private fun hashKey(sender: String, message: String): String {
        val combined = "$sender|$message|${System.currentTimeMillis() / 10_000}" // 10-second window
        return combined.hashCode().toString()
    }

    /**
     * Mark an SMS as processed by BroadcastReceiver
     */
    fun markProcessed(context: Context, sender: String, message: String) {
        val prefs = getPrefs(context)
        val key = hashKey(sender, message)
        val existing = prefs.getStringSet(KEY_PROCESSED_IDS, mutableSetOf()) ?: mutableSetOf()
        val updated = existing.toMutableSet()

        // Keep set size bounded
        if (updated.size >= MAX_ENTRIES) {
            val iter = updated.iterator()
            repeat(MAX_ENTRIES / 2) {
                if (iter.hasNext()) {
                    iter.next()
                    iter.remove()
                }
            }
        }

        updated.add(key)
        prefs.edit().putStringSet(KEY_PROCESSED_IDS, updated).apply()
    }

    /**
     * Check if an SMS was already processed (by BroadcastReceiver)
     */
    fun isProcessed(context: Context, sender: String, message: String): Boolean {
        val prefs = getPrefs(context)
        val key = hashKey(sender, message)
        val existing = prefs.getStringSet(KEY_PROCESSED_IDS, emptySet()) ?: emptySet()
        return existing.contains(key)
    }

    /**
     * Track the last SMS content provider ID to detect new messages
     */
    fun getLastSmsId(context: Context): Long {
        return getPrefs(context).getLong(KEY_LAST_SMS_ID, -1L)
    }

    fun setLastSmsId(context: Context, id: Long) {
        getPrefs(context).edit().putLong(KEY_LAST_SMS_ID, id).apply()
    }
}
