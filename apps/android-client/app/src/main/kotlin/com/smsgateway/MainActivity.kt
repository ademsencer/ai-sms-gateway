package com.smsgateway

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.smsgateway.api.GatewayApi
import com.smsgateway.api.RegisterDevicePayload
import com.smsgateway.data.AppPreferences
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {
    private lateinit var prefs: AppPreferences
    private val permissionRequestCode = 1001
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private lateinit var tvStatus: TextView
    private lateinit var etOwnerName: EditText
    private lateinit var etIban: EditText
    private lateinit var btnRegister: Button
    private lateinit var btnStart: Button
    private lateinit var btnStop: Button
    private lateinit var cardRegister: CardView
    private lateinit var layoutControls: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = AppPreferences(this)

        tvStatus = findViewById(R.id.tvStatus)
        etOwnerName = findViewById(R.id.etOwnerName)
        etIban = findViewById(R.id.etIban)
        btnRegister = findViewById(R.id.btnRegister)
        btnStart = findViewById(R.id.btnStart)
        btnStop = findViewById(R.id.btnStop)
        cardRegister = findViewById(R.id.cardRegister)
        layoutControls = findViewById(R.id.layoutControls)

        btnRegister.setOnClickListener { registerDevice() }
        btnStart.setOnClickListener { startGatewayService() }
        btnStop.setOnClickListener { stopGatewayService() }

        requestPermissions()
        updateUI()

        // Auto-start service if previously enabled and configured
        if (prefs.serviceEnabled && prefs.isConfigured) {
            startGatewayService()
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun registerDevice() {
        val ownerName = etOwnerName.text.toString().trim()
        val iban = etIban.text.toString().trim().uppercase()

        if (ownerName.length < 2) {
            Toast.makeText(this, "Ad Soyad en az 2 karakter olmali", Toast.LENGTH_SHORT).show()
            return
        }
        if (iban.length < 15) {
            Toast.makeText(this, "Gecerli bir IBAN giriniz", Toast.LENGTH_SHORT).show()
            return
        }

        btnRegister.isEnabled = false
        btnRegister.text = "Registering..."

        GatewayApi.initialize(prefs.apiUrl)

        scope.launch {
            try {
                val payload = RegisterDevicePayload(
                    deviceId = prefs.deviceId,
                    ownerName = ownerName,
                    iban = iban,
                    androidVersion = Build.VERSION.RELEASE,
                    model = "${Build.MANUFACTURER} ${Build.MODEL}",
                    serialNumber = Build.SERIAL.takeIf { it != Build.UNKNOWN } ?: Build.FINGERPRINT.takeLast(32)
                )

                val response = withContext(Dispatchers.IO) {
                    GatewayApi.getService().registerDevice(payload)
                }

                if (response.isSuccessful && response.body()?.success == true) {
                    val apiKey = response.body()?.data?.apiKey ?: ""
                    prefs.apiKey = apiKey
                    prefs.ownerName = ownerName
                    prefs.iban = iban
                    Toast.makeText(this@MainActivity, "Device registered!", Toast.LENGTH_SHORT).show()
                    updateUI()
                } else {
                    val msg = response.body()?.message ?: "Registration failed (${response.code()})"
                    Toast.makeText(this@MainActivity, msg, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Connection error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                btnRegister.isEnabled = true
                btnRegister.text = "Register"
            }
        }
    }

    private fun startGatewayService() {
        if (!prefs.isConfigured) {
            Toast.makeText(this, "Please register the device first", Toast.LENGTH_SHORT).show()
            return
        }

        // Request battery optimization exemption (critical for TECNO, Xiaomi, etc.)
        requestBatteryOptimizationExemption()

        GatewayApi.initialize(prefs.apiUrl)
        prefs.serviceEnabled = true

        val intent = Intent(this, SmsForwardService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }

        updateUI()
        Toast.makeText(this, "SMS forwarding started", Toast.LENGTH_SHORT).show()
    }

    /**
     * Request exemption from battery optimization.
     * Critical for devices with aggressive battery management
     * (TECNO HiOS, Xiaomi MIUI, Huawei EMUI, OPPO ColorOS, etc.)
     */
    private fun requestBatteryOptimizationExemption() {
        try {
            val pm = getSystemService(POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            }
        } catch (e: Exception) {
            // Some devices may not support this intent
            Toast.makeText(
                this,
                "Please disable battery optimization for this app manually in Settings",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun stopGatewayService() {
        prefs.serviceEnabled = false
        stopService(Intent(this, SmsForwardService::class.java))
        updateUI()
        Toast.makeText(this, "SMS forwarding stopped", Toast.LENGTH_SHORT).show()
    }

    private fun updateUI() {
        val isRegistered = prefs.isConfigured

        if (isRegistered) {
            cardRegister.visibility = View.GONE
            layoutControls.visibility = View.VISIBLE

            val status = if (prefs.serviceEnabled) {
                "ACTIVE - Forwarding SMS"
            } else {
                "STOPPED"
            }
            tvStatus.text = status
            btnStart.isEnabled = !prefs.serviceEnabled
            btnStop.isEnabled = prefs.serviceEnabled
        } else {
            cardRegister.visibility = View.VISIBLE
            layoutControls.visibility = View.GONE
            tvStatus.text = "NOT REGISTERED"
        }
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
