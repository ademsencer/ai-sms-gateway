package com.smsgateway

import android.Manifest
import android.app.AlertDialog
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

        // Show app version
        val tvVersion = findViewById<TextView>(R.id.tvVersion)
        tvVersion.text = "v${BuildConfig.VERSION_NAME}"

        checkAndRequestPermissions()
        updateUI()

        // Auto-start service if previously enabled and configured
        if (prefs.serviceEnabled && prefs.isConfigured) {
            startGatewayService()
        }
    }

    override fun onResume() {
        super.onResume()
        // Re-check permissions when returning from Settings
        updateUI()
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

        // Check SMS permissions before starting
        if (!hasSmsPermissions()) {
            showPermissionRequiredDialog()
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
                "Lütfen pil optimizasyonunu bu uygulama için manuel olarak kapatın",
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

    // ─── Permission Handling ───────────────────────────────────────────

    private fun hasSmsPermissions(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED &&
               ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * On Android 13+ (API 33), sideloaded APKs have "restricted settings" enabled.
     * SMS permissions are blocked until the user manually allows restricted settings
     * from the app info page: Settings → Apps → SMS Gateway → ⋮ → Allow restricted settings
     */
    private fun checkAndRequestPermissions() {
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
            // First try the normal permission request flow
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
            val smsPermissionDenied = permissions.zip(grantResults.toTypedArray())
                .any { (perm, result) ->
                    (perm == Manifest.permission.RECEIVE_SMS || perm == Manifest.permission.READ_SMS) &&
                    result != PackageManager.PERMISSION_GRANTED
                }

            if (smsPermissionDenied) {
                // On Android 13+, sideloaded apps need "Allow restricted settings" first
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    showRestrictedSettingsDialog()
                } else {
                    showManualPermissionDialog()
                }
            }
        }
    }

    /**
     * Android 13+ restricted settings dialog.
     * Guides the user to enable restricted settings for sideloaded apps.
     */
    private fun showRestrictedSettingsDialog() {
        AlertDialog.Builder(this)
            .setTitle("Kısıtlı Ayarlar Gerekli")
            .setMessage(
                "Bu uygulama Play Store dışından yüklendiği için Android, SMS izinlerini kısıtlamıştır.\n\n" +
                "İzin vermek için:\n\n" +
                "1. Açılan sayfada sağ üstteki ⋮ menüsüne dokunun\n" +
                "2. \"Kısıtlı ayarlara izin ver\" seçeneğine dokunun\n" +
                "3. Geri gelip izinleri tekrar verin\n\n" +
                "Bu işlem sadece bir kez gereklidir."
            )
            .setPositiveButton("Ayarlara Git") { _, _ ->
                openAppSettings()
            }
            .setNegativeButton("Sonra") { dialog, _ ->
                dialog.dismiss()
                Toast.makeText(
                    this,
                    "SMS izinleri olmadan uygulama çalışamaz",
                    Toast.LENGTH_LONG
                ).show()
            }
            .setCancelable(false)
            .show()
    }

    /**
     * Fallback dialog for older Android versions where permission was denied.
     */
    private fun showManualPermissionDialog() {
        AlertDialog.Builder(this)
            .setTitle("SMS İzni Gerekli")
            .setMessage(
                "SMS izinleri reddedildi. Uygulama ayarlarından izinleri manuel olarak vermeniz gerekiyor.\n\n" +
                "Ayarlar → İzinler → SMS izinlerini açın."
            )
            .setPositiveButton("Ayarlara Git") { _, _ ->
                openAppSettings()
            }
            .setNegativeButton("İptal") { dialog, _ ->
                dialog.dismiss()
            }
            .setCancelable(false)
            .show()
    }

    /**
     * Dialog shown when user tries to start service without SMS permissions.
     */
    private fun showPermissionRequiredDialog() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            !hasSmsPermissions() &&
            !ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.RECEIVE_SMS)
        ) {
            // On Android 13+, if rationale is not shown, it means restricted settings
            showRestrictedSettingsDialog()
        } else {
            // Try requesting again
            checkAndRequestPermissions()
        }
    }

    /**
     * Opens the app's detail settings page.
     * From here, users can:
     * - Allow restricted settings (⋮ menu on Android 13+)
     * - Manually grant SMS permissions
     * - Disable battery optimization
     */
    private fun openAppSettings() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (e: Exception) {
            // Fallback: open general app settings
            try {
                startActivity(Intent(Settings.ACTION_APPLICATION_SETTINGS))
            } catch (e2: Exception) {
                Toast.makeText(this, "Ayarlar açılamadı, lütfen manuel olarak açın", Toast.LENGTH_LONG).show()
            }
        }
    }
}
