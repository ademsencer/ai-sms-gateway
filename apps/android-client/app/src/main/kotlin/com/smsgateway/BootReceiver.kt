package com.smsgateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.smsgateway.data.AppPreferences

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val prefs = AppPreferences(context)
        if (!prefs.serviceEnabled || !prefs.isConfigured) {
            Log.d("BootReceiver", "Service not enabled or not configured, skipping auto-start")
            return
        }

        Log.d("BootReceiver", "Boot completed, starting SMS forwarding service")
        val serviceIntent = Intent(context, SmsForwardService::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
