package com.smsgateway

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.smsgateway.api.GatewayApi
import com.smsgateway.data.AppPreferences

class MainActivity : AppCompatActivity() {
    private lateinit var prefs: AppPreferences
    private val permissionRequestCode = 1001

    private lateinit var tvApiUrl: TextView
    private lateinit var tvDeviceId: TextView
    private lateinit var etApiKey: EditText
    private lateinit var tvStatus: TextView
    private lateinit var btnStart: Button
    private lateinit var btnStop: Button
    private lateinit var btnSave: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = AppPreferences(this)

        tvApiUrl = findViewById(R.id.tvApiUrl)
        tvDeviceId = findViewById(R.id.tvDeviceId)
        etApiKey = findViewById(R.id.etApiKey)
        tvStatus = findViewById(R.id.tvStatus)
        btnStart = findViewById(R.id.btnStart)
        btnStop = findViewById(R.id.btnStop)
        btnSave = findViewById(R.id.btnSave)

        // Display auto-generated values (read-only)
        tvApiUrl.text = prefs.apiUrl
        tvDeviceId.text = prefs.deviceId

        // Load saved API key
        etApiKey.setText(prefs.apiKey)

        updateStatusDisplay()

        btnSave.setOnClickListener { saveConfig() }
        btnStart.setOnClickListener { startService() }
        btnStop.setOnClickListener { stopService() }

        requestPermissions()
    }

    private fun saveConfig() {
        prefs.apiKey = etApiKey.text.toString().trim()

        if (prefs.isConfigured) {
            GatewayApi.initialize(prefs.apiUrl)
            Toast.makeText(this, "Configuration saved", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "Please enter the API key", Toast.LENGTH_SHORT).show()
        }

        updateStatusDisplay()
    }

    private fun startService() {
        if (!prefs.isConfigured) {
            Toast.makeText(this, "Please configure the API key first", Toast.LENGTH_SHORT).show()
            return
        }

        GatewayApi.initialize(prefs.apiUrl)
        prefs.serviceEnabled = true

        val intent = Intent(this, SmsForwardService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }

        updateStatusDisplay()
        Toast.makeText(this, "SMS forwarding started", Toast.LENGTH_SHORT).show()
    }

    private fun stopService() {
        prefs.serviceEnabled = false
        stopService(Intent(this, SmsForwardService::class.java))
        updateStatusDisplay()
        Toast.makeText(this, "SMS forwarding stopped", Toast.LENGTH_SHORT).show()
    }

    private fun updateStatusDisplay() {
        val status = if (prefs.serviceEnabled && prefs.isConfigured) {
            "ACTIVE - Forwarding SMS"
        } else if (!prefs.isConfigured) {
            "NOT CONFIGURED"
        } else {
            "STOPPED"
        }

        tvStatus.text = status
        btnStart.isEnabled = !prefs.serviceEnabled
        btnStop.isEnabled = prefs.serviceEnabled
    }

    private fun requestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS,
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), permissionRequestCode)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == permissionRequestCode) {
            val denied = permissions.zip(grantResults.toTypedArray())
                .filter { it.second != PackageManager.PERMISSION_GRANTED }
                .map { it.first }

            if (denied.isNotEmpty()) {
                Toast.makeText(this, "SMS permissions required for the gateway to work", Toast.LENGTH_LONG).show()
            }
        }
    }
}
