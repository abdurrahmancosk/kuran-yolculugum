# Kur'an Yolculuğum — çalışma kuralları

4–6 yaş çocuklar için Elif-Ba'dan Kur'an okumaya götüren Android uygulaması (Kotlin kabuk + `app/src/main/assets/www` altında HTML/JS arayüz).

## Kullanıcının kalıcı istekleri
- **Her güncellemeden sonra değişiklikleri `main` dalına commit edip `origin`e (github.com/abdurrahmancosk/kuran-yolculugum) gönder.**
- Telefondaki uygulama kendini her gün günceller; bunun için **yayınlanacak her sürümde** `app/build.gradle.kts` içindeki
  `versionCode` (+1) ve `versionName` artırılmalı, `RELEASE_NOTES.txt` kısa Türkçe notla güncellenmelidir.
  `main`e gönderim → GitHub Actions (`.github/workflows/release.yml`) APK'yı derler, imzalar, Release + `update.json` yayınlar.
- Arayüz, anlatım ve notlar Türkçe; içerik Diyanet Kur'an kursu Elif-Ba sırasına ve Diyanet İlmihali'ne (Hanefî) uygun olmalı.

## İmza anahtarı
- `keystore/` klasörü **asla** depoya eklenmez (.gitignore'da). CI anahtarı GitHub Secrets'tan alır:
  `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
- Tüm sürümler aynı anahtarla imzalanmalı; aksi hâlde telefondaki güncelleme kurulamaz.

## Test
- Arayüz: `cd app/src/main/assets/www && python3 -m http.server 8765` → Playwright ile ekran görüntüsü.
- Derleme: `./gradlew assembleRelease` (yerelde `keystore/kuranyolculugu.jks` + `keystore/signing.properties` gerekir).
- Kur'an metni `tools/gen_surahs.py` ile üretilir; metni elle değiştirme.
