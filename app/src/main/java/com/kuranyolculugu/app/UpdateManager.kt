package com.kuranyolculugu.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.os.Build
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

/**
 * Kendini güncelleme: GitHub Releases'teki update.json günde bir kez denetlenir,
 * yeni sürüm varsa APK indirilir, SHA-256 ile doğrulanır ve PackageInstaller ile kurulur.
 * Android 12+ cihazlarda, uygulama kendi kurucusu olduktan sonra (ilk onaylı güncellemeden
 * sonra) güncellemeler kullanıcı onayı gerekmeden kurulur.
 */
object UpdateManager {
    const val REPO = "abdurrahmancosk/kuran-yolculugum"
    /** Güncelleme kaynakları: depodaki "guncelleme" dalı (birincil) ve GitHub Releases (yedek). En yüksek sürüm seçilir. */
    val UPDATE_SOURCES = listOf(
        "https://raw.githubusercontent.com/$REPO/guncelleme/update.json",
        "https://github.com/$REPO/releases/latest/download/update.json",
    )
    const val JOB_ID = 7101
    const val ACTION_INSTALL_STATUS = "com.kuranyolculugu.app.INSTALL_STATUS"
    private const val CHANNEL = "updates"
    private const val PREFS = "updater"

    @Volatile var appInForeground = false
    @Volatile private var busy = false

    data class Info(val versionCode: Long, val versionName: String, val apk: String, val sha256: String, val notes: String)

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun installedVersionCode(ctx: Context): Long {
        val pi = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
        @Suppress("DEPRECATION")
        return if (Build.VERSION.SDK_INT >= 28) pi.longVersionCode else pi.versionCode.toLong()
    }

    fun installedVersionName(ctx: Context): String =
        try { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName ?: "" } catch (e: Exception) { "" }

    fun autoEnabled(ctx: Context) = prefs(ctx).getBoolean("auto", true)

    fun setAuto(ctx: Context, on: Boolean) {
        prefs(ctx).edit().putBoolean("auto", on).apply()
        if (on) schedule(ctx, true) else cancel(ctx)
    }

    /** Günlük denetim işini planlar (zaten planlıysa dokunmaz). */
    fun schedule(ctx: Context, force: Boolean = false) {
        if (!autoEnabled(ctx)) return
        val js = ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
        if (!force && js.getPendingJob(JOB_ID) != null) return
        val job = JobInfo.Builder(JOB_ID, ComponentName(ctx, UpdateJobService::class.java))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
            .setPeriodic(TimeUnit.HOURS.toMillis(24), TimeUnit.HOURS.toMillis(6))
            .setPersisted(true)
            .build()
        try { js.schedule(job) } catch (_: Exception) {}
    }

    fun cancel(ctx: Context) {
        val js = ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
        js.cancel(JOB_ID)
    }

    private fun httpGet(url: String, dest: File? = null): String? {
        var u = URL(url)
        var redirects = 0
        while (true) {
            val c = (u.openConnection() as HttpURLConnection).apply {
                connectTimeout = 15000; readTimeout = 30000
                instanceFollowRedirects = false
                setRequestProperty("User-Agent", "KuranYolculugu-Updater")
                setRequestProperty("Cache-Control", "no-cache")
            }
            try {
                val code = c.responseCode
                if (code in 300..399 && redirects < 8) {
                    val loc = c.getHeaderField("Location") ?: return null
                    u = URL(u, loc); redirects++; continue
                }
                if (code != 200) return null
                return if (dest != null) {
                    dest.parentFile?.mkdirs()
                    val tmp = File(dest.path + ".part")
                    c.inputStream.use { i -> FileOutputStream(tmp).use { o -> i.copyTo(o) } }
                    if (!tmp.renameTo(dest)) { tmp.delete(); null } else "ok"
                } else c.inputStream.bufferedReader().use { it.readText() }
            } finally { c.disconnect() }
        }
    }

    private fun sha256(f: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        f.inputStream().use { i ->
            val buf = ByteArray(64 * 1024)
            while (true) { val n = i.read(buf); if (n <= 0) break; md.update(buf, 0, n) }
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }

    fun fetchInfo(): Info? {
        var best: Info? = null
        for (src in UPDATE_SOURCES) {
            val txt = try { httpGet(src + "?t=" + System.currentTimeMillis()) } catch (e: Exception) { null } ?: continue
            val info = try {
                val o = JSONObject(txt)
                Info(o.getLong("versionCode"), o.optString("versionName"), o.getString("apk"), o.optString("sha256"), o.optString("notes"))
            } catch (e: Exception) { null } ?: continue
            if (best == null || info.versionCode > best.versionCode) best = info
        }
        return best
    }

    private fun updateDir(ctx: Context) = File(ctx.filesDir, "update")

    /** Denetler, gerekirse indirir; uygulama ön planda değilse kurar. Döner: durum metni. */
    @Synchronized
    fun check(ctx: Context, manual: Boolean): String {
        if (busy) return "busy"
        busy = true
        try {
            val p = prefs(ctx)
            p.edit().putLong("lastCheck", System.currentTimeMillis()).apply()
            val info = fetchInfo() ?: return result(ctx, "error:Sürüm bilgisi alınamadı (internet bağlantısı?)")
            p.edit().putLong("latestCode", info.versionCode).putString("latestName", info.versionName).putString("notes", info.notes).apply()
            if (info.versionCode <= installedVersionCode(ctx)) {
                cleanup(ctx)
                return result(ctx, "uptodate")
            }
            val apk = File(updateDir(ctx), "update-${info.versionCode}.apk")
            if (!apk.exists() || (info.sha256.isNotEmpty() && !sha256(apk).equals(info.sha256, true))) {
                apk.delete()
                if (httpGet(info.apk, apk) == null) return result(ctx, "error:APK indirilemedi")
                if (info.sha256.isNotEmpty() && !sha256(apk).equals(info.sha256, true)) {
                    apk.delete(); return result(ctx, "error:İndirilen dosya doğrulanamadı")
                }
            }
            // Paket adı ve sürüm kontrolü
            val arch = ctx.packageManager.getPackageArchiveInfo(apk.path, 0)
            if (arch == null || arch.packageName != ctx.packageName) { apk.delete(); return result(ctx, "error:Geçersiz güncelleme dosyası") }
            p.edit().putString("pending", apk.path).putLong("pendingCode", info.versionCode).apply()
            if (!appInForeground || manual) {
                return if (install(ctx)) result(ctx, "installing") else result(ctx, "ready")
            }
            return result(ctx, "ready")
        } catch (e: Exception) {
            return result(ctx, "error:" + (e.message ?: "bilinmeyen hata"))
        } finally { busy = false }
    }

    private fun result(ctx: Context, r: String): String { prefs(ctx).edit().putString("lastResult", r).apply(); return r }

    fun hasPending(ctx: Context): Boolean {
        val p = prefs(ctx)
        val path = p.getString("pending", null) ?: return false
        return File(path).exists() && p.getLong("pendingCode", 0) > installedVersionCode(ctx)
    }

    fun canInstall(ctx: Context): Boolean =
        Build.VERSION.SDK_INT < 26 || ctx.packageManager.canRequestPackageInstalls()

    /** Bekleyen güncellemeyi kurar (PackageInstaller oturumu). */
    fun install(ctx: Context): Boolean {
        val p = prefs(ctx)
        val path = p.getString("pending", null) ?: return false
        val apk = File(path)
        if (!apk.exists()) return false
        if (!canInstall(ctx)) {
            notify(ctx, "Güncelleme hazır", "Kurmak için \"bilinmeyen uygulamaları yükleme\" izni gerekiyor. Dokunun.",
                Intent(ctx, MainActivity::class.java).putExtra("openUpdate", true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            return false
        }
        val pi = ctx.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        params.setAppPackageName(ctx.packageName)
        if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        if (Build.VERSION.SDK_INT >= 26) params.setInstallReason(PackageManager.INSTALL_REASON_USER)
        val id = pi.createSession(params)
        pi.openSession(id).use { s ->
            s.openWrite("base.apk", 0, apk.length()).use { out ->
                apk.inputStream().use { it.copyTo(out) }
                s.fsync(out)
            }
            val intent = Intent(ctx, UpdateReceiver::class.java).setAction(ACTION_INSTALL_STATUS)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
            val pending = PendingIntent.getBroadcast(ctx, id, intent, flags)
            s.commit(pending.intentSender)
        }
        return true
    }

    fun cleanup(ctx: Context) {
        updateDir(ctx).listFiles()?.forEach { it.delete() }
        prefs(ctx).edit().remove("pending").remove("pendingCode").apply()
    }

    fun statusJson(ctx: Context): String {
        val p = prefs(ctx)
        val o = JSONObject()
        o.put("installedCode", installedVersionCode(ctx))
        o.put("installedName", installedVersionName(ctx))
        o.put("latestCode", p.getLong("latestCode", 0))
        o.put("latestName", p.getString("latestName", ""))
        o.put("notes", p.getString("notes", ""))
        o.put("lastCheck", p.getLong("lastCheck", 0))
        o.put("lastResult", p.getString("lastResult", ""))
        o.put("pending", hasPending(ctx))
        o.put("canInstall", canInstall(ctx))
        o.put("auto", autoEnabled(ctx))
        o.put("silentCapable", Build.VERSION.SDK_INT >= 31)
        o.put("installer", try {
            if (Build.VERSION.SDK_INT >= 30) ctx.packageManager.getInstallSourceInfo(ctx.packageName).installingPackageName ?: ""
            else @Suppress("DEPRECATION") ctx.packageManager.getInstallerPackageName(ctx.packageName) ?: ""
        } catch (e: Exception) { "" })
        o.put("notifOk", Build.VERSION.SDK_INT < 33 || ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
        return o.toString()
    }

    fun shouldCheckNow(ctx: Context): Boolean =
        autoEnabled(ctx) && System.currentTimeMillis() - prefs(ctx).getLong("lastCheck", 0) > TimeUnit.HOURS.toMillis(20)

    fun notify(ctx: Context, title: String, text: String, intent: Intent) {
        try {
            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= 26) {
                nm.createNotificationChannel(NotificationChannel(CHANNEL, "Güncellemeler", NotificationManager.IMPORTANCE_DEFAULT))
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            val pi = PendingIntent.getActivity(ctx, 42, intent, flags)
            @Suppress("DEPRECATION")
            val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(ctx, CHANNEL) else Notification.Builder(ctx)
            val n = b.setSmallIcon(R.drawable.ic_stat_update).setContentTitle(title).setContentText(text)
                .setStyle(Notification.BigTextStyle().bigText(text))
                .setContentIntent(pi).setAutoCancel(true).build()
            nm.notify(4242, n)
        } catch (_: Exception) {}
    }
}
