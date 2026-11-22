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

## Seslendirme (erkek sesi, çevrimdışı)
- Kullanıcı isteği: anlatımlar **erkek sesi** olmalı ve yapay olduğu belli olmamalı.
- Tüm cümleler önceden üretilip `assets/www/voice/*.mp3` olarak gömülür; `js/voice_index.js` dizindir.
  JS `K.N.speak()` önce bu paketi çalar, yoksa telefonun TTS'ine (erkek sesi tercihli) düşer.
- Yeni/değişen metin eklediğinde: `node tools/collect_voice.js tools/voice_inventory.json` (yerel sunucu açıkken),
  sonra `python3 tools/gen_voice.py <model_klasörü>` (Piper `tr_TR-fahrettin-medium`, `ar_JO-kareem-medium`;
  modeller github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models, `pip install "sherpa-onnx<2"`).
- Konuşulan metne çocuğun adı gibi değişkenler koyma; ad yalnızca balonda gösterilir (`S.say(metin, {show})`).

## Test
- Arayüz: `cd app/src/main/assets/www && python3 -m http.server 8765` → Playwright ile ekran görüntüsü.
- Derleme: `./gradlew assembleRelease` (yerelde `keystore/kuranyolculugu.jks` + `keystore/signing.properties` gerekir).
- Kur'an metni `tools/gen_surahs.py` ile üretilir; metni elle değiştirme.
