#!/usr/bin/env bash
# Yerelden sürüm yayınlama (GitHub Actions secrets tanımlı değilse kullanılır).
# Gerekli: keystore/kuranyolculugu.jks + keystore/signing.properties, gh (REST erişimi).
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${GITHUB_REPOSITORY:-abdurrahmancosk/kuran-yolculugum}"
export GITHUB_REPOSITORY="$REPO"
export CODE=$(grep -oP 'versionCode\s*=\s*\K[0-9]+' app/build.gradle.kts)
export NAME=$(grep -oP 'versionName\s*=\s*"\K[^"]+' app/build.gradle.kts)
export TAG="v$NAME"
if gh api "repos/$REPO/releases/tags/$TAG" >/dev/null 2>&1; then echo "$TAG zaten yayında"; exit 0; fi
./gradlew assembleRelease --no-daemon -q
cp app/build/outputs/apk/release/app-release.apk KuranYolculugum.apk
export SHA=$(sha256sum KuranYolculugum.apk | cut -d' ' -f1)
python3 tools/make_update_json.py
BODY=$(cat RELEASE_NOTES.txt)
ID=$(gh api "repos/$REPO/releases" -f tag_name="$TAG" -f target_commitish=main -f name="Kur'an Yolculuğum $NAME" -f body="$BODY" -f make_latest=true --jq .id)
for f in KuranYolculugum.apk update.json; do
  CT=$([ "$f" = update.json ] && echo application/json || echo application/vnd.android.package-archive)
  gh api -X POST "https://uploads.github.com/repos/$REPO/releases/$ID/assets?name=$f" -H "Content-Type: $CT" --input "$f" --jq .browser_download_url
done
echo "Yayınlandı: $TAG ($CODE)"
