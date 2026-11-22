import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.kuranyolculugu.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.kuranyolculugu.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 5
        versionName = "1.4.0"
    }

    // İmza anahtarı depoda DEĞİLDİR. Yerelde keystore/ klasöründe, GitHub Actions'ta Secrets'tan gelir.
    // Güncellemelerin telefona kurulabilmesi için her sürüm AYNI anahtarla imzalanmalıdır.
    val ksFile = rootProject.file("keystore/kuranyolculugu.jks")
    val ksProps = Properties().apply {
        val f = rootProject.file("keystore/signing.properties")
        if (f.exists()) f.inputStream().use { load(it) }
    }
    fun secret(name: String): String? = System.getenv(name) ?: ksProps.getProperty(name)

    signingConfigs {
        create("release") {
            if (ksFile.exists()) {
                storeFile = ksFile
                storePassword = secret("KEYSTORE_PASSWORD")
                keyAlias = secret("KEY_ALIAS") ?: "kuranyolculugu"
                keyPassword = secret("KEY_PASSWORD") ?: secret("KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (ksFile.exists()) signingConfigs.getByName("release") else null
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
    androidResources {
        noCompress += listOf("woff2", "mp3", "png", "webp")
    }
}
