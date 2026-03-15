package com.smsgateway

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.util.Log
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.LinearLayout
import androidx.core.content.FileProvider
import com.smsgateway.api.GatewayApi
import kotlinx.coroutines.*
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

object AppUpdater {
    private const val TAG = "AppUpdater"

    fun checkForUpdate(activity: Activity, apiUrl: String, currentVersion: String) {
        CoroutineScope(Dispatchers.Main + SupervisorJob()).launch {
            try {
                GatewayApi.initialize(apiUrl)
                val response = withContext(Dispatchers.IO) {
                    GatewayApi.getService().checkHealth()
                }

                if (!response.isSuccessful) {
                    Log.w(TAG, "Health check failed: ${response.code()}")
                    return@launch
                }

                val health = response.body() ?: return@launch
                val serverVersion = health.version
                val apkUrl = health.apkUrl
                Log.i(TAG, "Current: $currentVersion, Server: $serverVersion, APK: $apkUrl")

                if (isNewerVersion(serverVersion, currentVersion)) {
                    withContext(Dispatchers.Main) {
                        showUpdateDialog(activity, apkUrl, serverVersion)
                    }
                } else {
                    Log.i(TAG, "App is up to date")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Update check failed: ${e.message}")
            }
        }
    }

    private fun isNewerVersion(server: String, current: String): Boolean {
        try {
            val serverParts = server.split(".").map { it.toInt() }
            val currentParts = current.split(".").map { it.toInt() }

            for (i in 0 until maxOf(serverParts.size, currentParts.size)) {
                val s = serverParts.getOrElse(i) { 0 }
                val c = currentParts.getOrElse(i) { 0 }
                if (s > c) return true
                if (s < c) return false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Version parse error: ${e.message}")
        }
        return false
    }

    private fun showUpdateDialog(activity: Activity, apkUrl: String?, newVersion: String) {
        AlertDialog.Builder(activity)
            .setTitle("Güncelleme Mevcut")
            .setMessage("Yeni sürüm v$newVersion yüklenmeye hazır.\n\nMevcut sürüm: v${BuildConfig.VERSION_NAME}\n\nGüncellemek ister misiniz?")
            .setPositiveButton("Güncelle") { _, _ ->
                downloadAndInstall(activity, apkUrl, newVersion)
            }
            .setNegativeButton("Sonra") { dialog, _ ->
                dialog.dismiss()
            }
            .setCancelable(true)
            .show()
    }

    private fun downloadAndInstall(activity: Activity, apkUrl: String?, version: String) {
        val progressLayout = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 32)
        }

        val tvProgress = TextView(activity).apply {
            text = "İndiriliyor... %0"
            textSize = 14f
        }

        val progressBar = ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progress = 0
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = 16 }
        }

        progressLayout.addView(tvProgress)
        progressLayout.addView(progressBar)

        val dialog = AlertDialog.Builder(activity)
            .setTitle("Güncelleme İndiriliyor")
            .setView(progressLayout)
            .setCancelable(false)
            .show()

        CoroutineScope(Dispatchers.IO + SupervisorJob()).launch {
            try {
                val downloadUrl = apkUrl ?: throw Exception("APK URL not available from server")

                Log.i(TAG, "Downloading APK from: $downloadUrl")

                val client = OkHttpClient.Builder()
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(120, TimeUnit.SECONDS)
                    .build()

                val request = Request.Builder().url(downloadUrl).build()
                val response = client.newCall(request).execute()

                if (!response.isSuccessful) {
                    throw Exception("HTTP ${response.code}")
                }

                val body = response.body ?: throw Exception("Empty response body")
                val totalSize = body.contentLength()
                val updateDir = File(activity.getExternalFilesDir(null), "updates")
                updateDir.mkdirs()
                val apkFile = File(updateDir, "sms-gateway-v$version.apk")

                body.byteStream().use { input ->
                    FileOutputStream(apkFile).use { output ->
                        val buffer = ByteArray(8192)
                        var downloaded = 0L
                        var bytesRead: Int

                        while (input.read(buffer).also { bytesRead = it } != -1) {
                            output.write(buffer, 0, bytesRead)
                            downloaded += bytesRead

                            if (totalSize > 0) {
                                val percent = (downloaded * 100 / totalSize).toInt()
                                withContext(Dispatchers.Main) {
                                    progressBar.progress = percent
                                    tvProgress.text = "İndiriliyor... %$percent"
                                }
                            }
                        }
                    }
                }

                Log.i(TAG, "APK downloaded: ${apkFile.absolutePath} (${apkFile.length()} bytes)")

                withContext(Dispatchers.Main) {
                    dialog.dismiss()
                    installApk(activity, apkFile)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Download failed: ${e.message}", e)
                withContext(Dispatchers.Main) {
                    dialog.dismiss()
                    AlertDialog.Builder(activity)
                        .setTitle("İndirme Hatası")
                        .setMessage("APK indirilemedi: ${e.message}")
                        .setPositiveButton("Tamam") { d, _ -> d.dismiss() }
                        .show()
                }
            }
        }
    }

    private fun installApk(activity: Activity, apkFile: File) {
        try {
            val uri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                apkFile
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            activity.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Install failed: ${e.message}", e)
            AlertDialog.Builder(activity)
                .setTitle("Kurulum Hatası")
                .setMessage("APK kurulamadı: ${e.message}")
                .setPositiveButton("Tamam") { d, _ -> d.dismiss() }
                .show()
        }
    }
}
