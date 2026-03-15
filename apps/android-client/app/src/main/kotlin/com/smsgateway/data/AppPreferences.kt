package com.smsgateway.data

import android.content.Context
import android.content.SharedPreferences
import com.smsgateway.BuildConfig
import java.util.UUID

class AppPreferences(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("sms_gateway_prefs", Context.MODE_PRIVATE)

    val apiUrl: String
        get() = BuildConfig.API_URL

    var deviceId: String
        get() {
            val stored = prefs.getString("device_id", null)
            if (!stored.isNullOrBlank()) return stored
            val generated = UUID.randomUUID().toString()
            prefs.edit().putString("device_id", generated).apply()
            return generated
        }
        set(value) = prefs.edit().putString("device_id", value).apply()

    var apiKey: String
        get() = prefs.getString("api_key", "") ?: ""
        set(value) = prefs.edit().putString("api_key", value).apply()

    var serviceEnabled: Boolean
        get() = prefs.getBoolean("service_enabled", false)
        set(value) = prefs.edit().putBoolean("service_enabled", value).apply()

    var ownerName: String
        get() = prefs.getString("owner_name", "") ?: ""
        set(value) = prefs.edit().putString("owner_name", value).apply()

    var iban: String
        get() = prefs.getString("iban", "") ?: ""
        set(value) = prefs.edit().putString("iban", value).apply()

    val isConfigured: Boolean
        get() = apiUrl.isNotBlank() && deviceId.isNotBlank() && apiKey.isNotBlank()
}
