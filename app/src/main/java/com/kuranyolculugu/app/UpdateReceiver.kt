package com.kuranyolculugu.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build

/** PackageInstaller kurulum sonucu. */
class UpdateReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != UpdateManager.ACTION_INSTALL_STATUS) return
        val prefs = ctx.getSharedPreferences("updater", Context.MODE_PRIVATE)
        when (val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                @Suppress("DEPRECATION")
                val confirm: Intent? = if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                else intent.getParcelableExtra(Intent.EXTRA_INTENT)
                if (confirm != null) {
                    confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    prefs.edit().putString("lastResult", "confirm").apply()
                    if (UpdateManager.appInForeground) {
                        try { ctx.startActivity(confirm); return } catch (_: Exception) {}
                    }
                    UpdateManager.notify(ctx, "Kur'an Yolculuğum güncellemesi hazır", "Yeni sürümü kurmak için dokunun.", confirm)
                }
            }
            PackageInstaller.STATUS_SUCCESS -> prefs.edit().putString("lastResult", "installed").apply()
            else -> {
                val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "kod $status"
                prefs.edit().putString("lastResult", "error:Kurulum başarısız ($msg)").apply()
            }
        }
    }
}

/** Telefon açıldığında ve uygulama güncellendiğinde çalışır. */
class SystemReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED -> UpdateManager.schedule(ctx)
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                UpdateManager.cleanup(ctx)
                UpdateManager.schedule(ctx, true)
                ctx.getSharedPreferences("updater", Context.MODE_PRIVATE).edit().putString("lastResult", "installed").apply()
            }
        }
    }
}
