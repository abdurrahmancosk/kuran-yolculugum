package com.kuranyolculugu.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.MimeTypeMap
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import java.io.IOException

/**
 * Uygulama kabuğu: Arayüz (oyunlar, dersler, sureler) assets/www içindeki
 * HTML/JS ile çizilir; ses (TTS), kayıt, önbellekli ses çalar ve kalıcı
 * kayıt gibi yerel yetenekler [NativeBridge] üzerinden sağlanır.
 */
class MainActivity : Activity() {

    companion object {
        const val ASSET_HOST = "appassets.androidplatform.net"
        const val START_URL = "https://$ASSET_HOST/www/index.html"
        const val REQ_RECORD_AUDIO = 4501
        const val REQ_NOTIF = 4502
        const val REQ_FILE = 4503
    }

    lateinit var web: WebView
    private lateinit var root: FrameLayout
    lateinit var bridge: NativeBridge
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private var insetsJs: String = ""
    private var fileCallback: android.webkit.ValueCallback<Array<Uri>>? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setBackgroundDrawableResource(android.R.color.transparent)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

        root = FrameLayout(this)
        root.setBackgroundColor(Color.parseColor("#FFF6E5"))
        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#FFF6E5"))
        root.addView(web, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(root)

        if (0 != (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            textZoom = 100
            cacheMode = WebSettings.LOAD_DEFAULT
            loadWithOverviewMode = true
            useWideViewPort = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
        }
        web.isVerticalScrollBarEnabled = false
        web.isHorizontalScrollBarEnabled = false
        web.overScrollMode = View.OVER_SCROLL_NEVER

        bridge = NativeBridge(this, web)
        web.addJavascriptInterface(bridge, "AndroidBridge")

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val url = request.url
                if (url.host == ASSET_HOST) return serveAsset(url)
                return null
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (!request.isForMainFrame) return false
                if (request.url.host == ASSET_HOST) return false
                // Çocuk uygulamadan çıkamasın: YouTube vb. dış sayfalara geçiş engellenir.
                return true
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                if (insetsJs.isNotEmpty()) web.evaluateJavascript(insetsJs, null)
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                if (customView != null) {
                    callback.onCustomViewHidden(); return
                }
                customView = view
                customViewCallback = callback
                root.addView(view, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
                web.visibility = View.GONE
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                hideSystemBars()
            }

            override fun onHideCustomView() {
                exitCustomView()
            }

            override fun onShowFileChooser(view: WebView, callback: android.webkit.ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                val pick = Intent(Intent.ACTION_GET_CONTENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE)
                return try {
                    @Suppress("DEPRECATION")
                    startActivityForResult(Intent.createChooser(pick, "Fotoğraf seç"), REQ_FILE)
                    true
                } catch (e: Exception) {
                    fileCallback = null; false
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                // Mikrofon kaydı yerel MediaRecorder ile yapılır; web izinleri verilmez.
                request.deny()
            }
        }

        root.setOnApplyWindowInsetsListener { _, insets ->
            applyInsets(insets)
            insets
        }

        hideSystemBars()
        if (savedInstanceState == null) web.loadUrl(START_URL) else web.restoreState(savedInstanceState)

        // Otomatik güncelleme: günlük işi planla; son denetim eskiyse şimdi arka planda denetle.
        UpdateManager.schedule(this)
        if (UpdateManager.shouldCheckNow(this)) {
            val app = applicationContext
            Thread { try { UpdateManager.check(app, false) } catch (_: Exception) {} }.start()
        }
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(i: Intent?) {
        if (i?.getBooleanExtra("openUpdate", false) == true) {
            web.postDelayed({ web.evaluateJavascript("window.App&&App.openUpdate&&App.openUpdate()", null) }, 1200)
        }
    }

    private fun applyInsets(insets: WindowInsets) {
        val d = resources.displayMetrics.density
        var t = 0; var b = 0; var l = 0; var r = 0
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val c = insets.displayCutout
            if (c != null) {
                t = c.safeInsetTop; b = c.safeInsetBottom; l = c.safeInsetLeft; r = c.safeInsetRight
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val sys = insets.getInsets(WindowInsets.Type.systemBars())
            t = maxOf(t, sys.top); b = maxOf(b, sys.bottom); l = maxOf(l, sys.left); r = maxOf(r, sys.right)
        }
        insetsJs = "(function(){var s=document.documentElement.style;" +
            "s.setProperty('--sat','${(t / d).toInt()}px');s.setProperty('--sab','${(b / d).toInt()}px');" +
            "s.setProperty('--sal','${(l / d).toInt()}px');s.setProperty('--sar','${(r / d).toInt()}px');})()"
        web.evaluateJavascript(insetsJs, null)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_FILE) {
            fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            fileCallback = null
        }
    }

    private fun serveAsset(url: Uri): WebResourceResponse? {
        var path = url.path ?: return null
        if (path.startsWith("/")) path = path.substring(1)
        if (path.startsWith("userimg/")) {
            val f = java.io.File(java.io.File(filesDir, "userimg"), path.substringAfter("userimg/").replace("/", ""))
            return if (f.exists()) WebResourceResponse("image/jpeg", null, f.inputStream()).apply { responseHeaders = mapOf("Cache-Control" to "no-cache") }
            else WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), null)
        }
        if (path.isEmpty() || path.endsWith("/")) path += "index.html"
        return try {
            val stream = assets.open(path)
            val ext = path.substringAfterLast('.', "").lowercase()
            val mime = when (ext) {
                "html" -> "text/html"
                "js" -> "application/javascript"
                "css" -> "text/css"
                "json" -> "application/json"
                "svg" -> "image/svg+xml"
                "woff2" -> "font/woff2"
                "woff" -> "font/woff"
                "mp3" -> "audio/mpeg"
                "png" -> "image/png"
                "webp" -> "image/webp"
                else -> MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "application/octet-stream"
            }
            val enc = if (mime.startsWith("text/") || mime.endsWith("javascript") || mime.endsWith("json") || mime.endsWith("svg+xml")) "utf-8" else null
            val resp = WebResourceResponse(mime, enc, stream)
            resp.responseHeaders = mapOf("Cache-Control" to "no-cache", "Access-Control-Allow-Origin" to "*")
            resp
        } catch (e: IOException) {
            WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), null)
        }
    }

    // ---------------------------------------------------------------- uygulama içi tarayıcı (yalnızca verilen sayfa)
    private var inApp: android.widget.LinearLayout? = null
    private var inAppWeb: WebView? = null

    @SuppressLint("SetJavaScriptEnabled")
    fun openInApp(url: String, title: String) {
        closeInApp()
        val start = Uri.parse(url)
        val box = android.widget.LinearLayout(this).apply { orientation = android.widget.LinearLayout.VERTICAL; setBackgroundColor(Color.BLACK) }
        val bar = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            setBackgroundColor(Color.parseColor("#2BB3A3"))
            val pad = (8 * resources.displayMetrics.density).toInt()
            setPadding(pad, pad, pad, pad)
        }
        val close = android.widget.Button(this).apply { text = "✖  Kapat"; setOnClickListener { closeInApp() } }
        val tv = android.widget.TextView(this).apply {
            text = title; setTextColor(Color.WHITE); textSize = 16f; maxLines = 1
            setPadding((12 * resources.displayMetrics.density).toInt(), 0, 0, 0)
        }
        bar.addView(close); bar.addView(tv)
        val w = WebView(this)
        with(w.settings) { javaScriptEnabled = true; domStorageEnabled = true; mediaPlaybackRequiresUserGesture = false; setSupportMultipleWindows(false) }
        w.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (!request.isForMainFrame) return false
                val u = request.url
                // Yalnızca açılan sayfada kal; başka videolara/sayfalara geçme.
                return !(u.host == start.host && u.path == start.path)
            }
        }
        w.webChromeClient = web.webChromeClient
        box.addView(bar, android.widget.LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        box.addView(w, android.widget.LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        root.addView(box, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        inApp = box; inAppWeb = w
        w.loadUrl(url)
    }

    fun closeInApp(): Boolean {
        val b = inApp ?: return false
        inAppWeb?.let { try { it.stopLoading(); it.loadUrl("about:blank"); it.destroy() } catch (_: Exception) {} }
        root.removeView(b)
        inApp = null; inAppWeb = null
        hideSystemBars()
        return true
    }

    fun setLandscape(on: Boolean) {
        requestedOrientation = if (on) ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE else ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        hideSystemBars()
    }

    fun hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let {
                it.hide(WindowInsets.Type.systemBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN)
        }
    }

    private fun exitCustomView() {
        val v = customView ?: return
        root.removeView(v)
        customView = null
        customViewCallback?.onCustomViewHidden()
        customViewCallback = null
        web.visibility = View.VISIBLE
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        hideSystemBars()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (customView != null) {
            exitCustomView(); return
        }
        if (closeInApp()) return
        web.evaluateJavascript("(function(){try{return window.App&&App.onBack?App.onBack():false}catch(e){return false}})()") { result ->
            if (result != "true") {
                @Suppress("DEPRECATION")
                super.onBackPressed()
            }
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onPause() {
        super.onPause()
        UpdateManager.appInForeground = false
        bridge.onPause()
        web.evaluateJavascript("window.App&&App.onPause&&App.onPause()", null)
        web.onPause()
    }

    override fun onResume() {
        super.onResume()
        UpdateManager.appInForeground = true
        web.onResume()
        hideSystemBars()
        web.evaluateJavascript("window.App&&App.onResume&&App.onResume()", null)
    }

    override fun onStop() {
        super.onStop()
        // Çocuk uygulamayı kapatınca bekleyen güncelleme kurulur (oyun sırasında kesinti olmaz).
        if (UpdateManager.autoEnabled(this) && UpdateManager.hasPending(this)) {
            val app = applicationContext
            Thread { try { UpdateManager.install(app) } catch (_: Exception) {} }.start()
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onDestroy() {
        bridge.release()
        web.destroy()
        super.onDestroy()
    }

    fun requestMicPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_RECORD_AUDIO)
        }
    }

    fun requestNotifPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTIF)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val ok = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
        if (requestCode == REQ_RECORD_AUDIO) bridge.emit("perm", "mic", if (ok) "granted" else "denied")
        if (requestCode == REQ_NOTIF) bridge.emit("perm", "notif", if (ok) "granted" else "denied")
    }
}
