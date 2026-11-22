# Kur'an Yolculuğum — çalışma kuralları

4–6 yaş çocuklar için Elif-Ba'dan Kur'an okumaya götüren Android uygulaması (Kotlin kabuk + `app/src/main/assets/www` altında HTML/JS arayüz).

## Kullanıcının kalıcı istekleri
- **Her güncellemeden sonra değişiklikleri `main` dalına commit edip `origin`e (github.com/abdurrahmancosk/kuran-yolculugum) gönder.**
- Telefondaki uygulama kendini her gün günceller; bunun için **yayınlanacak her sürümde** `app/build.gradle.kts` içindeki
  `versionCode` (+1) ve `versionName` artırılmalı, `RELEASE_NOTES.txt` kısa Türkçe notla güncellenmelidir.
  Yayın kanalı deponun `guncelleme` dalıdır (APK + `update.json`); telefondaki uygulama her gün
  `raw.githubusercontent.com/abdurrahmancosk/kuran-yolculugum/guncelleme/update.json` dosyasını denetler.
  Yayınlamak için: `./tools/publish.sh` (yerel anahtarla) — ya da GitHub Actions secrets tanımlıysa `main`e gönderim yeterlidir.
- Arayüz, anlatım ve notlar Türkçe; içerik Diyanet Kur'an kursu Elif-Ba sırasına ve Diyanet İlmihali'ne (Hanefî) uygun olmalı.

## İmza anahtarı
- `keystore/` klasörü **asla** depoya eklenmez (.gitignore'da). CI anahtarı GitHub Secrets'tan alır:
  `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
- Tüm sürümler aynı anahtarla imzalanmalı; aksi hâlde telefondaki güncelleme kurulamaz.

## Seslendirme — YALNIZ İNSAN SESİ (yapay ses/TTS YASAK)
- Kullanıcı isteği: seslendirmeyi yapay zekâ yapmayacak; web'deki benzer uygulama/videolardaki gerçek insan kayıtları kullanılacak
  (yalnız kişisel kullanım, telif sorunu yok dedi). Telefonun TTS motoru da koddan kaldırıldı; geri ekleme.
- Gömülü kayıtlar: `assets/www/hv/*.mp3`, dizin `js/hv_index.js` (K.HV anahtarlar, K.HV_TEXT söylenen metin, K.HV_PRAISE tebrikler).
  Üretim: `HV_SRC=<kaynak_kök> python3 tools/build_hv.py`; kaynak tanımları `tools/hv_sources.py`,
  kelime kayıtları `data_curriculum.js` içindeki `'cdDERS_SIRA'` anahtarlarından okunur.
  Kaynak kökünde: `CD/` = archive.org `elif-ba-cd-diyanet` (ElifBaCDzip.zip → cdrom0/sesler),
  `NH/` = archive.org `namazhocasimp3` (nh01.wav = 01-Abdest…mp3 ilk 240 sn, nh03.wav = 03-Sabah…mp3 ilk 560 sn, mono 44.1k),
  `CZ/` = archive.org `Namaz-ogreniyorum-cizgi-film` ses kanalı (cd2.wav).
- CD düzeni: ders 1 harf adları (29, Lamelif 28.); ders 2 hareke ve 12 med: Elif…Ye 28 satır; ders 9 cezm ve 17 şedde: Be…Ye 27 satır;
  satır r'nin heceleri r≤2 ise `_r1.._r3`, değilse `r1..r3` (üstün, esre, ötre). 9/43, 12/101, 17/223 bozuk → satır kaydından kesilir.
- `K.N.speak(metin)` sırası: ebeveyn kaydı (`say_`+vhash) → K.HV_TEXT'te birebir metin → ses yok ('nospeech', balonda yazı).
  `S.say(metin, {hv, item})`: kayıt yoksa `item` verilmişse harfin/hecenin insan sesi çalar. Yeni Türkçe cümle eklerken
  mümkünse kaydı olan bir cümleyi kullan; metin kayıtta söylenenle aynı olmalı. Her yeni kaydı Whisper (sherpa-onnx whisper-turbo) ile doğrula.
- Kur'an: varsayılan Türk hafız İshak Danış (archive.org "Âyet Âyet", eşleme `js/data_quran.js` DANIS); dualar: önce Diyanet CD kaydı (du_*).
- Konuşulan metne çocuğun adı gibi değişkenler koyma; ad yalnızca balonda gösterilir (`S.say(metin, {show})`).

## Test
- Arayüz: `cd app/src/main/assets/www && python3 -m http.server 8765` → Playwright ile ekran görüntüsü.
- Derleme: `./gradlew assembleRelease` (yerelde `keystore/kuranyolculugu.jks` + `keystore/signing.properties` gerekir).
- Kur'an metni `tools/gen_surahs.py` ile üretilir; metni elle değiştirme.
