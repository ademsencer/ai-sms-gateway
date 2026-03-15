plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// CI passes -PVERSION_NAME with the bumped version; prefer that over the local file
val appVersionName: String = (project.findProperty("VERSION_NAME") as? String)
    ?: try {
        rootProject.file("../../VERSION").readText().trim()
    } catch (_: Exception) {
        "1.0.0"
    }
val appVersionCode: Int = try {
    val parts = appVersionName.split(".")
    parts[0].toInt() * 10000 + parts[1].toInt() * 100 + parts[2].toInt()
} catch (_: Exception) {
    1
}

android {
    namespace = "com.smsgateway"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.smsgateway"
        minSdk = 26
        targetSdk = 35
        versionCode = appVersionCode
        versionName = appVersionName

        val apiUrl = project.findProperty("API_URL") as? String ?: "http://213.32.89.237:3005"
        buildConfigField("String", "API_URL", "\"$apiUrl\"")
    }

    signingConfigs {
        create("release") {
            val keystorePath = project.findProperty("KEYSTORE_FILE") as? String
            if (keystorePath != null) {
                storeFile = file(keystorePath)
                storePassword = project.findProperty("KEYSTORE_PASSWORD") as? String ?: ""
                keyAlias = project.findProperty("KEY_ALIAS") as? String ?: "smsgateway"
                keyPassword = project.findProperty("KEY_PASSWORD") as? String ?: ""
            }
        }
    }

    buildTypes {
        debug {
            val apiUrl = project.findProperty("API_URL") as? String ?: "http://213.32.89.237:3005"
            buildConfigField("String", "API_URL", "\"$apiUrl\"")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")

            val keystorePath = project.findProperty("KEYSTORE_FILE") as? String
            if (keystorePath != null) {
                signingConfig = signingConfigs.getByName("release")
            }

            val apiUrl = project.findProperty("API_URL") as? String ?: "https://your-server.com"
            buildConfigField("String", "API_URL", "\"$apiUrl\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")

    // HTTP client
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Room for local queue
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    annotationProcessor("androidx.room:room-compiler:2.6.1")

    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
}
