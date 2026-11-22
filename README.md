# Kur'an Yolculuğum 🐦📖

4–6 yaş çocuklar için Diyanet Kur'an kursu Elif-Ba düzenine uygun, oyunlarla ve sesli anlatımla
**sıfırdan Kur'an-ı Kerim okumayı** öğreten Android uygulaması. Rehber karakter: **Hüdhüd kuşu**.

## Kurulum (telefon/tablet)
1. Son sürüm APK'sını [güncelleme dalından](https://github.com/abdurrahmancosk/kuran-yolculugum/tree/guncelleme) telefona indirin.
2. Dosyaya dokunun; Android "bilinmeyen kaynaklardan yükleme" izni isterse bu kaynağa izin verin.
3. Uygulama açılınca ebeveyn için kısa kurulum gelir: çocuğun adı ve kursta hangi aşamada olduğu.
4. Sesli anlatım için telefonda **Google Konuşma Hizmetleri** ve **Türkçe** ses paketi kurulu olmalıdır
   (çoğu telefonda hazırdır). Ebeveyn Paneli → "Sesi test et" ile kontrol edebilirsiniz.

Ebeveyn Paneli: ana ekranda sağ üstteki 🔒 simgesine **basılı tutun**, yazıyla verilen sayıyı girin.

## Bölümler
| Bölüm | İçerik |
|---|---|
| 🗺️ Elif-Ba Yolculuğu | 10 ada, 51 ders: Harfler → Harf şekilleri → Üstün/Esre/Ötre → Heceler → Cezm → Tenvin → Şedde → Med & Çeker → Kur'an kelimeleri → 13 sûreyi okuma → 🎓 Belge |
| 🌳 Sûreler Bahçesi | Fâtiha, İhlâs, Kevser, Asr, Nasr, Felak, Nâs, Kureyş, Fîl, Tebbet, Mâûn, Kâfirûn, Hümeze — 🎧 Dinle, 🧠 Ezberle (tekrar, kelime gizleme), 📖 Oku (kelime kelime) |
| 🕌 Namaz Öğreniyorum | **Erkek / Kadın ayrı gerçekçi çizimlerle** sesli abdest (13 adım) ve adım adım namaz (otomatik "Benimle Namaz Kıl"), namaz duaları, beş vakit, sıralama oyunu, Diyanet Çocuk videoları. Duruş farkları (tekbir, kıyam, rükû, secde, oturuş) Diyanet İlmihali'ne göredir. |
| 📺 Hocamızdan Dinle | Musa Coşkun Hoca'nın web'de bulunan tilavetleri + uygulamaya kaydedilen okumalar |
| 🎮 Oyun Parkı | Balon patlat, hafıza kartları, harf avı, çizim defteri, hareke giydir, hece avı, Elif-Ba tablosu |
| 🌟 Çıkartmalar | Her derste kazanılan çıkartma albümü |

Oyun türleri: tanışma kartları, parmakla harf çizme, dinle-bul, balon patlatma, hafıza, hareke giydirme,
okuma şeridi (dinle → kendi sesini kaydet → karşılaştır), sûre okuma.

## Sesler
- **Anlatımlar ve harf/hece sesleri:** telefonun Türkçe metin okuma motoru, kurs usulü ("Be üstün be").
- **Kur'an tilaveti:** internetten (everyayah.com / islamic.network) — Husarî (öğretici), Minşâvî (çocuklarla), Afâsî, Abdülbâsıt.
  İlk çalışta kaydedilir; Ebeveyn Paneli → "İnternetsiz Kullanım" ile tümü önceden indirilebilir.
- **Kelime kelime ses:** quran.com kelime kayıtları.
- **🎙️ Ses Kayıt Stüdyosu (Ebeveyn Paneli):** Musa Coşkun Hoca'nın ya da sizin sesinizle harfler, heceler,
  kelimeler, dualar ve âyetler kaydedilebilir; kaydedilen ses uygulamanın her yerinde öncelikle çalar.

## Kaynaklar
- Kur'an metni: Tanzil projesi (değiştirilmeden). "Türkiye mushafı usulü" yalnızca gösterim ayarıdır
  (hemzesiz elif, Allah lafzında çeker); Ebeveyn Paneli'nden "Standart" yazıma geçilebilir.
- Meal: Diyanet İşleri Başkanlığı. Namaz kılınışı: Diyanet İlmihali (Hanefî).
- Videolar: YouTube (Musa Coşkun Hoca tilavetleri; Diyanet Çocuk "Namaz Kılmayı Öğreniyorum").
- Yazı tipleri: Scheherazade New, Amiri Quran, Baloo 2 (SIL Open Font License).

## Geliştirici notları
- Yapı: Kotlin `MainActivity` + `NativeBridge` (TTS, ses kaydı, önbellekli ses çalar, kalıcı kayıt) ve
  `app/src/main/assets/www` altında HTML/CSS/JS arayüz (internet gerekmeden çalışır).
- Derleme: `./gradlew assembleRelease` → `app/build/outputs/apk/release/app-release.apk`
- İmza anahtarı depoda **yoktur** (güvenlik). Yerelde `keystore/kuranyolculugu.jks` + `keystore/signing.properties`,
  GitHub Actions'ta ise Secrets kullanılır. **Tüm sürümler aynı anahtarla imzalanmalıdır**, aksi hâlde telefon
  güncellemeyi kuramaz.

## Otomatik güncelleme ve yayın
- Telefondaki uygulama her gün deponun `guncelleme` dalındaki `update.json` dosyasını denetler; yeni sürümü indirir,
  SHA-256 ile doğrular ve uygulama kapatıldığında kurar (Android 12+: ilk onaydan sonra sessiz kurulum).
- Yeni sürüm yayınlamak için `app/build.gradle.kts` içinde `versionCode`/`versionName` artırılır,
  `RELEASE_NOTES.txt` güncellenir ve `main`e gönderilir.
- Yayın: `./tools/publish.sh` APK'yı derleyip imzalar ve `guncelleme` dalına gönderir.
- `main`e her gönderimde `.github/workflows/release.yml` aynı yayını GitHub Actions'ta yapar.
  Bunun için deponun **Settings → Secrets and variables → Actions** bölümünde bir kez şu gizli değişkenler
  tanımlanmalıdır: `KEYSTORE_BASE64` (anahtar dosyasının base64 hâli), `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
  Tanımlı değilse iş akışı yayını atlar.
- Kur'an verisini yeniden üretmek: `python3 tools/gen_surahs.py <veri_klasörü> app/src/main/assets/www/js/data_surahs.js`
- Tarayıcıda deneme: `cd app/src/main/assets/www && python3 -m http.server` → `http://localhost:8000`
