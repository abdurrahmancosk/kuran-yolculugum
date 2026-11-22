package com.kuranyolculugu.app

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/**
 * JavaScript tarafına açılan yerel köprü (window.AndroidBridge).
 * Olaylar JS'e window.__native(type, id, data) çağrısıyla iletilir.
 */
class NativeBridge(private val activity: MainActivity, private val web: WebView) {

    private val ctx: Context = activity.applicationContext
    private val main = Handler(Looper.getMainLooper())
    private val io = Executors.newFixedThreadPool(2)
    private val prefetchExec = Executors.newSingleThreadExecutor()
    private val prefs = ctx.getSharedPreferences("kuran_yolculugu", Context.MODE_PRIVATE)

    private val audioDir = File(ctx.filesDir, "audio").apply { mkdirs() }
    private val recDir = File(ctx.filesDir, "recordings").apply { mkdirs() }

    // ---------------------------------------------------------------- olaylar
    fun emit(type: String, id: String, data: String) {
        val js = "window.__native&&window.__native(${JSONObject.quote(type)},${JSONObject.quote(id)},${JSONObject.quote(data)})"
        main.post { try { web.evaluateJavascript(js, null) } catch (_: Exception) {} }
    }

    // Yapay ses (TextToSpeech) bilinçli olarak YOK: tüm sesler gömülü insan kayıtlarıdır (assets/www/hv).

    // ---------------------------------------------------------------- ses çalar (önbellekli)
    private var player: MediaPlayer? = null
    private var playingId: String? = null
    private val playToken = AtomicInteger(0)

    private fun sha1(s: String): String {
        val md = MessageDigest.getInstance("SHA-1")
        return md.digest(s.toByteArray()).joinToString("") { "%02x".format(it) }
    }

    private fun cacheFile(urls: List<String>): File = File(audioDir, sha1(urls.first()) + ".mp3")

    private fun parseUrls(json: String): List<String> {
        val out = ArrayList<String>()
        try {
            val a = JSONArray(json)
            for (i in 0 until a.length()) out.add(a.getString(i))
        } catch (e: Exception) {
            if (json.isNotBlank()) out.add(json)
        }
        return out
    }

    private fun download(url: String, dest: File): Boolean {
        var conn: HttpURLConnection? = null
        val tmp = File(dest.parentFile, dest.name + ".part")
        try {
            var u = URL(url)
            var redirects = 0
            while (true) {
                conn = (u.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 12000
                    readTimeout = 20000
                    instanceFollowRedirects = true
                    setRequestProperty("User-Agent", "KuranYolculugu/1.0 (Android)")
                }
                val code = conn.responseCode
                if (code in 300..399 && redirects < 5) {
                    val loc = conn.getHeaderField("Location") ?: return false
                    u = URL(u, loc); redirects++; conn.disconnect(); continue
                }
                if (code != 200) return false
                break
            }
            val c = conn ?: return false
            val type = c.contentType ?: ""
            if (type.startsWith("text/")) return false
            c.inputStream.use { input -> FileOutputStream(tmp).use { out -> input.copyTo(out) } }
            if (tmp.length() < 1024) { tmp.delete(); return false }
            return tmp.renameTo(dest)
        } catch (e: Exception) {
            tmp.delete()
            return false
        } finally {
            conn?.disconnect()
        }
    }

    /** Kaynağı yerel dosyaya çözer: rec:anahtar, asset:yol veya http(s) adresleri (önbellekli). */
    private fun resolve(urls: List<String>): Any? {
        val first = urls.firstOrNull() ?: return null
        if (first.startsWith("rec:")) {
            val f = recFile(first.substring(4)); return if (f.exists()) f else null
        }
        if (first.startsWith("asset:")) return first.substring(6)
        val f = cacheFile(urls)
        if (f.exists() && f.length() > 0) return f
        for (u in urls) if (download(u, f)) return f
        return null
    }

    @JavascriptInterface
    fun audioPlay(id: String, urlsJson: String, speed: Float) {
        // "#t=baş,son" (saniye) parçası: kaydın yalnızca bir bölümünü çal
        val raw = parseUrls(urlsJson)
        var clipStart = 0f; var clipEnd = 0f
        raw.firstOrNull()?.substringAfter("#t=", "")?.takeIf { it.isNotEmpty() }?.let { t ->
            val parts = t.split(",")
            clipStart = parts.getOrNull(0)?.toFloatOrNull() ?: 0f
            clipEnd = parts.getOrNull(1)?.toFloatOrNull() ?: 0f
        }
        val urls = raw.map { it.substringBefore("#") }
        val token = playToken.incrementAndGet()
        main.post { stopPlayerInternal(false) }
        io.execute {
            val needsDownload = urls.firstOrNull()?.startsWith("http") == true && !cacheFile(urls).exists()
            if (needsDownload) emit("audio", id, "loading")
            val src = resolve(urls)
            if (token != playToken.get()) return@execute
            if (src == null) { emit("audio", id, "error"); return@execute }
            main.post {
                if (token != playToken.get()) return@post
                startPlayer(id, src, speed, clipStart, clipEnd)
            }
        }
    }

    private fun startPlayer(id: String, src: Any, speed: Float, clipStart: Float = 0f, clipEnd: Float = 0f) {
        stopPlayerInternal(false)
        try {
            val mp = MediaPlayer()
            mp.setAudioAttributes(AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
            when (src) {
                is File -> mp.setDataSource(src.absolutePath)
                is String -> activity.assets.openFd(src).use { fd -> mp.setDataSource(fd.fileDescriptor, fd.startOffset, fd.length) }
            }
            mp.setOnCompletionListener {
                if (playingId == id) { playingId = null; emit("audio", id, "end") }
                try { it.release() } catch (_: Exception) {}
                if (player === it) player = null
            }
            mp.setOnErrorListener { p, _, _ ->
                emit("audio", id, "error")
                try { p.release() } catch (_: Exception) {}
                if (player === p) player = null
                playingId = null
                true
            }
            mp.prepare()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && speed > 0f && speed != 1f) {
                try { mp.playbackParams = mp.playbackParams.setSpeed(speed.coerceIn(0.5f, 1.5f)) } catch (_: Exception) {}
            }
            player = mp
            playingId = id
            if (clipStart > 0f) mp.seekTo((clipStart * 1000).toInt())
            mp.start()
            emit("audio", id, "start:" + mp.duration)
            if (clipEnd > 0f) {
                val endMs = (clipEnd * 1000).toInt()
                val check = object : Runnable {
                    override fun run() {
                        if (player !== mp) return
                        try {
                            if (mp.currentPosition >= endMs) { stopPlayerInternal(false); emit("audio", id, "end"); return }
                        } catch (_: Exception) { return }
                        main.postDelayed(this, 80)
                    }
                }
                main.postDelayed(check, 80)
            }
        } catch (e: Exception) {
            emit("audio", id, "error")
        }
    }

    private fun stopPlayerInternal(notify: Boolean) {
        val p = player
        val pid = playingId
        player = null
        playingId = null
        if (p != null) {
            try { p.stop() } catch (_: Exception) {}
            try { p.release() } catch (_: Exception) {}
            if (notify && pid != null) emit("audio", pid, "stop")
        }
    }

    @JavascriptInterface
    fun audioStop() {
        playToken.incrementAndGet()
        main.post { stopPlayerInternal(true) }
    }

    @JavascriptInterface
    fun audioIsCached(urlsJson: String): Boolean {
        val urls = parseUrls(urlsJson)
        val first = urls.firstOrNull() ?: return false
        if (!first.startsWith("http")) return true
        return cacheFile(urls).exists()
    }

    /** urlsListJson: [[url1, yedek1], [url2, yedek2], ...] — arka planda indirir. */
    @JavascriptInterface
    fun audioPrefetch(jobId: String, urlsListJson: String) {
        prefetchExec.execute {
            try {
                val list = JSONArray(urlsListJson)
                val total = list.length()
                var ok = 0
                var fail = 0
                for (i in 0 until total) {
                    val arr = list.getJSONArray(i)
                    val urls = (0 until arr.length()).map { arr.getString(it) }
                    val f = cacheFile(urls)
                    if (f.exists() || urls.any { download(it, f) }) ok++ else fail++
                    emit("prefetch", jobId, "${ok + fail}/$total/$fail")
                }
                emit("prefetch", jobId, "done/$ok/$fail")
            } catch (e: Exception) {
                emit("prefetch", jobId, "error")
            }
        }
    }

    @JavascriptInterface
    fun audioCacheSize(): Long = audioDir.listFiles()?.sumOf { it.length() } ?: 0L

    @JavascriptInterface
    fun audioClearCache() {
        audioDir.listFiles()?.forEach { it.delete() }
    }

    // ---------------------------------------------------------------- ses kaydı
    private var recorder: MediaRecorder? = null
    private var recKey: String? = null
    private var recTmp: File? = null

    private fun safeKey(k: String): String = k.replace(Regex("[^A-Za-z0-9_\\-]"), "_").take(80)
    private fun recFile(key: String): File = File(recDir, safeKey(key) + ".m4a")

    @JavascriptInterface
    fun micPermission(): String {
        return if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
            ctx.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) "granted" else "denied"
    }

    @JavascriptInterface
    fun requestMic() {
        main.post { activity.requestMicPermission() }
    }

    @JavascriptInterface
    fun recStart(key: String): Boolean {
        if (micPermission() != "granted") return false
        main.post {
            stopPlayerInternal(true)
            releaseRecorder()
            try {
                val tmp = File(recDir, "tmp_" + System.currentTimeMillis() + ".m4a")
                @Suppress("DEPRECATION")
                val r = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(ctx) else MediaRecorder()
                r.setAudioSource(MediaRecorder.AudioSource.MIC)
                r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                r.setAudioEncodingBitRate(96000)
                r.setAudioSamplingRate(44100)
                r.setMaxDuration(60000)
                r.setOutputFile(tmp.absolutePath)
                r.setOnInfoListener { _, what, _ ->
                    if (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) finishRecording()
                }
                r.prepare()
                r.start()
                recorder = r
                recKey = key
                recTmp = tmp
                emit("rec", key, "started")
            } catch (e: Exception) {
                releaseRecorder()
                emit("rec", key, "error")
            }
        }
        return true
    }

    private fun finishRecording() {
        val r = recorder ?: return
        val key = recKey ?: return
        val tmp = recTmp
        var ok = false
        try { r.stop(); ok = true } catch (_: Exception) {}
        releaseRecorder()
        if (ok && tmp != null && tmp.exists() && tmp.length() > 0) {
            val dest = recFile(key)
            dest.delete()
            if (tmp.renameTo(dest)) { emit("rec", key, "saved"); return }
        }
        tmp?.delete()
        emit("rec", key, "error")
    }

    private fun releaseRecorder() {
        try { recorder?.release() } catch (_: Exception) {}
        recorder = null
        recKey = null
    }

    @JavascriptInterface
    fun recStop() {
        main.post { finishRecording() }
    }

    @JavascriptInterface
    fun recLevel(): Int = try { recorder?.maxAmplitude ?: 0 } catch (e: Exception) { 0 }

    @JavascriptInterface
    fun recHas(key: String): Boolean = recFile(key).exists()

    @JavascriptInterface
    fun recDelete(key: String) { recFile(key).delete() }

    @JavascriptInterface
    fun recList(): String {
        val a = JSONArray()
        recDir.listFiles()?.filter { it.name.endsWith(".m4a") && !it.name.startsWith("tmp_") }?.forEach {
            a.put(it.name.removeSuffix(".m4a"))
        }
        return a.toString()
    }

    // ---------------------------------------------------------------- kullanıcı fotoğrafları
    private val imgDir = File(ctx.filesDir, "userimg").apply { mkdirs() }

    @JavascriptInterface
    fun saveUserImage(key: String, base64: String): Boolean = try {
        val bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT)
        File(imgDir, safeKey(key) + ".jpg").writeBytes(bytes); true
    } catch (e: Exception) { false }

    @JavascriptInterface
    fun deleteUserImage(key: String) { File(imgDir, safeKey(key) + ".jpg").delete() }

    @JavascriptInterface
    fun userImageList(): String {
        val a = JSONArray()
        imgDir.listFiles()?.filter { it.name.endsWith(".jpg") }?.forEach { a.put(it.name.removeSuffix(".jpg")) }
        return a.toString()
    }

    // ---------------------------------------------------------------- kalıcı durum
    @JavascriptInterface
    fun saveState(json: String) {
        prefs.edit().putString("state", json).apply()
    }

    @JavascriptInterface
    fun loadState(): String = prefs.getString("state", "") ?: ""

    // ---------------------------------------------------------------- çeşitli
    @JavascriptInterface
    fun vibrate(ms: Int) {
        try {
            @Suppress("DEPRECATION")
            val v = ctx.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(ms.toLong().coerceIn(5, 400), VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(ms.toLong())
            }
        } catch (_: Exception) {}
    }

    @JavascriptInterface
    fun keepScreenOn(on: Boolean) {
        main.post {
            if (on) activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    @JavascriptInterface
    fun isOnline(): Boolean {
        return try {
            val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
                caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            } else {
                @Suppress("DEPRECATION")
                cm.activeNetworkInfo?.isConnected == true
            }
        } catch (e: Exception) { true }
    }

    @JavascriptInterface
    fun openExternal(url: String) {
        main.post {
            try { activity.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) {}
        }
    }

    @JavascriptInterface
    fun openInApp(url: String, title: String) { main.post { activity.openInApp(url, title) } }

    @JavascriptInterface
    fun setLandscape(on: Boolean) { main.post { activity.setLandscape(on) } }

    @JavascriptInterface
    fun appVersion(): String = try {
        ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName ?: "1.0"
    } catch (e: Exception) { "1.0" }

    @JavascriptInterface
    fun exitApp() {
        main.post { activity.finish() }
    }

    // ---------------------------------------------------------------- otomatik güncelleme
    @JavascriptInterface
    fun updStatus(): String = UpdateManager.statusJson(ctx)

    @JavascriptInterface
    fun updCheck() {
        Thread { val r = try { UpdateManager.check(ctx, true) } catch (e: Exception) { "error:" + e.message }; emit("update", "check", r) }.start()
    }

    @JavascriptInterface
    fun updInstall() {
        Thread { val ok = try { UpdateManager.install(ctx) } catch (e: Exception) { false }; emit("update", "install", if (ok) "started" else "failed") }.start()
    }

    @JavascriptInterface
    fun updSetAuto(on: Boolean) { UpdateManager.setAuto(ctx, on) }

    @JavascriptInterface
    fun openInstallPermission() {
        main.post {
            try {
                if (Build.VERSION.SDK_INT >= 26) {
                    activity.startActivity(Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, android.net.Uri.parse("package:" + ctx.packageName)))
                } else activity.startActivity(Intent(android.provider.Settings.ACTION_SECURITY_SETTINGS))
            } catch (_: Exception) {}
        }
    }

    @JavascriptInterface
    fun requestNotif() { main.post { activity.requestNotifPermission() } }

    // ---------------------------------------------------------------- yaşam döngüsü
    fun onPause() {
        playToken.incrementAndGet()
        stopPlayerInternal(true)
        if (recorder != null) finishRecording()
    }

    fun release() {
        onPause()
        io.shutdownNow()
        prefetchExec.shutdownNow()
    }
}
