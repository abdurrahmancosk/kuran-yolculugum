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
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
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
import java.util.Locale
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

    // ---------------------------------------------------------------- TTS
    private var tts: TextToSpeech? = null
    @Volatile private var ttsReady = false
    private val voiceCache = HashMap<String, Voice?>()

    init {
        initTts()
    }

    private fun initTts() {
        tts = TextToSpeech(ctx) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) {
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) { emit("tts", utteranceId ?: "", "start") }
                    override fun onDone(utteranceId: String?) { emit("tts", utteranceId ?: "", "done") }
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) { emit("tts", utteranceId ?: "", "error") }
                    override fun onError(utteranceId: String?, errorCode: Int) { emit("tts", utteranceId ?: "", "error") }
                    override fun onStop(utteranceId: String?, interrupted: Boolean) { emit("tts", utteranceId ?: "", "stop") }
                })
            }
            emit("ttsready", "", ttsStatusJson())
        }
    }

    private fun localeFor(lang: String): Locale = when {
        lang.startsWith("ar") -> Locale("ar")
        lang.startsWith("en") -> Locale.US
        else -> Locale("tr", "TR")
    }

    private fun bestVoice(loc: Locale): Voice? {
        val key = loc.language
        if (voiceCache.containsKey(key)) return voiceCache[key]
        val t = tts ?: return null
        val v = try {
            val all = t.voices?.filter {
                it.locale.language == loc.language &&
                    !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
            } ?: emptyList()
            val chosen = prefs.getString("voice_$key", null)
            all.firstOrNull { it.name == chosen }
                // ebeveyn seçmediyse adında "male" geçen (erkek) sesi tercih et
                ?: all.filter { it.name.lowercase().contains("male") && !it.name.lowercase().contains("female") }.minByOrNull { if (it.isNetworkConnectionRequired) 1 else 0 }
                ?: all.sortedWith(compareBy<Voice>({ it.isNetworkConnectionRequired }, { -it.quality })).firstOrNull()
        } catch (e: Exception) { null }
        voiceCache[key] = v
        return v
    }

    @JavascriptInterface
    fun ttsVoices(lang: String): String {
        val a = JSONArray()
        val loc = localeFor(lang)
        try {
            tts?.voices?.filter { it.locale.language == loc.language }?.sortedBy { it.name }?.forEach {
                a.put(JSONObject().put("name", it.name).put("net", it.isNetworkConnectionRequired)
                    .put("ok", !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)))
            }
        } catch (_: Exception) {}
        return a.toString()
    }

    @JavascriptInterface
    fun ttsSetVoice(lang: String, name: String) {
        val key = localeFor(lang).language
        prefs.edit().putString("voice_$key", name).apply()
        main.post { voiceCache.remove(key) }
    }

    @JavascriptInterface
    fun ttsGetVoice(lang: String): String = prefs.getString("voice_" + localeFor(lang).language, "") ?: ""

    private fun langState(loc: Locale): String {
        val t = tts ?: return "none"
        return try {
            when (t.isLanguageAvailable(loc)) {
                TextToSpeech.LANG_MISSING_DATA -> "missing"
                TextToSpeech.LANG_NOT_SUPPORTED -> "none"
                else -> "ok"
            }
        } catch (e: Exception) { "none" }
    }

    private fun ttsStatusJson(): String {
        val o = JSONObject()
        o.put("ready", ttsReady)
        if (ttsReady) {
            o.put("tr", langState(Locale("tr", "TR")))
            o.put("ar", langState(Locale("ar")))
            o.put("engine", tts?.defaultEngine ?: "")
        }
        return o.toString()
    }

    @JavascriptInterface
    fun ttsStatus(): String = ttsStatusJson()

    @JavascriptInterface
    fun ttsSpeak(id: String, text: String, lang: String, rate: Float, pitch: Float): Boolean {
        if (!ttsReady) return false
        val loc = localeFor(lang)
        if (langState(loc) != "ok") return false
        main.post {
            val t = tts ?: return@post
            try {
                val v = bestVoice(loc)
                if (v != null) t.voice = v else t.language = loc
                t.setSpeechRate(rate.coerceIn(0.3f, 2f))
                t.setPitch(pitch.coerceIn(0.5f, 2f))
                val params = Bundle()
                params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1f)
                val r = t.speak(text, TextToSpeech.QUEUE_FLUSH, params, id)
                if (r != TextToSpeech.SUCCESS) emit("tts", id, "error")
            } catch (e: Exception) {
                emit("tts", id, "error")
            }
        }
        return true
    }

    @JavascriptInterface
    fun ttsStop() {
        main.post { try { tts?.stop() } catch (_: Exception) {} }
    }

    @JavascriptInterface
    fun openTtsSettings() {
        main.post {
            try {
                activity.startActivity(Intent("com.android.settings.TTS_SETTINGS").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e: Exception) {
                try { activity.startActivity(Intent(android.provider.Settings.ACTION_SETTINGS)) } catch (_: Exception) {}
            }
        }
    }

    @JavascriptInterface
    fun installTtsData() {
        main.post {
            try {
                activity.startActivity(Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e: Exception) { openTtsSettings() }
        }
    }

    @JavascriptInterface
    fun ttsReinit() {
        main.post {
            try { tts?.shutdown() } catch (_: Exception) {}
            voiceCache.clear()
            ttsReady = false
            initTts()
        }
    }

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
        val urls = parseUrls(urlsJson)
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
                startPlayer(id, src, speed)
            }
        }
    }

    private fun startPlayer(id: String, src: Any, speed: Float) {
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
            mp.start()
            emit("audio", id, "start:" + mp.duration)
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
            try { tts?.stop() } catch (_: Exception) {}
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
        try { tts?.stop() } catch (_: Exception) {}
        if (recorder != null) finishRecording()
    }

    fun release() {
        onPause()
        try { tts?.shutdown() } catch (_: Exception) {}
        io.shutdownNow()
        prefetchExec.shutdownNow()
    }
}
