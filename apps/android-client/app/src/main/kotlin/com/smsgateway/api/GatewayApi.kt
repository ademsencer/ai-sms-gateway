package com.smsgateway.api

import com.google.gson.annotations.SerializedName
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import java.util.concurrent.TimeUnit

data class SmsPayload(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("sender") val sender: String,
    @SerializedName("message") val message: String,
    @SerializedName("timestamp") val timestamp: Long
)

data class DeviceEventPayload(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("eventType") val eventType: String,
    @SerializedName("message") val message: String? = null
)

data class RegisterDevicePayload(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("ownerName") val ownerName: String,
    @SerializedName("iban") val iban: String,
    @SerializedName("androidVersion") val androidVersion: String?,
    @SerializedName("model") val model: String?,
    @SerializedName("serialNumber") val serialNumber: String?
)

data class RegisterDeviceData(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("apiKey") val apiKey: String
)

data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: T?,
    @SerializedName("message") val message: String?,
    @SerializedName("timestamp") val timestamp: String
)

data class QueuedResult(
    @SerializedName("queued") val queued: Boolean
)

data class EventResult(
    @SerializedName("accepted") val accepted: Boolean
)

interface GatewayApiService {
    @POST("api/sms")
    suspend fun sendSms(
        @Header("x-device-key") apiKey: String,
        @Body payload: SmsPayload
    ): Response<ApiResponse<QueuedResult>>

    @POST("api/device/event")
    suspend fun reportDeviceEvent(
        @Header("x-device-key") apiKey: String,
        @Body payload: DeviceEventPayload
    ): Response<ApiResponse<EventResult>>

    @POST("api/device/register")
    suspend fun registerDevice(
        @Body payload: RegisterDevicePayload
    ): Response<ApiResponse<RegisterDeviceData>>
}

object GatewayApi {
    private var retrofit: Retrofit? = null
    private var service: GatewayApiService? = null

    fun initialize(baseUrl: String) {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        val url = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"

        retrofit = Retrofit.Builder()
            .baseUrl(url)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        service = retrofit?.create(GatewayApiService::class.java)
    }

    fun getService(): GatewayApiService {
        return service ?: throw IllegalStateException("GatewayApi not initialized. Call initialize() first.")
    }
}
