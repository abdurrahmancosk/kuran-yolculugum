#!/usr/bin/env bash
# Sürüm yayınlama: APK'yı derler, imzalar ve deponun "guncelleme" dalına (APK + update.json) gönderir.
# Telefondaki uygulama her gün https://raw.githubusercontent.com/<repo>/guncelleme/update.json dosyasını denetler.
# Gerekli: keystore/kuranyolculugu.jks + keystore/signing.properties (ya da KEYSTORE_* ortam değişkenleri).
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
REPO="${GITHUB_REPOSITORY:-abdurrahmancosk/kuran-yolculugum}"
BRANCH=guncelleme
export CODE=$(grep -oP 'versionCode\s*=\s*\K[0-9]+' app/build.gradle.kts)
export NAME=$(grep -oP 'versionName\s*=\s*"\K[^"]+' app/build.gradle.kts)
export TAG="v$NAME"
APK="KuranYolculugum-$NAME.apk"
export APK_URL="https://raw.githubusercontent.com/$REPO/$BRANCH/$APK"

# Dalda daha yeni ya da aynı sürüm varsa çık
WT=$(mktemp -d)
if git fetch -q --depth 1 origin "$BRANCH" 2>/dev/null; then
  git worktree add -q --detach "$WT" FETCH_HEAD
  PUB=$(python3 -c "import json;print(json.load(open('$WT/update.json'))['versionCode'])" 2>/dev/null || echo 0)
  if [ "$PUB" -ge "$CODE" ]; then echo "Yayındaki sürüm ($PUB) zaten >= $CODE; versionCode artırın."; git worktree remove --force "$WT"; exit 0; fi
  (cd "$WT" && git checkout -q -B "$BRANCH")
else
  git worktree add -q --detach "$WT"
  (cd "$WT" && git checkout -q --orphan "$BRANCH" && git rm -rqf . && git clean -fdxq)
fi

./gradlew assembleRelease --no-daemon -q
cp app/build/outputs/apk/release/app-release.apk "$WT/$APK"
export SHA=$(sha256sum "$WT/$APK" | cut -d' ' -f1)
(cd "$WT" && find . -maxdepth 1 -name 'KuranYolculugum-*.apk' ! -name "$APK" -delete && python3 "$ROOT/tools/make_update_json.py" \
  && cp "$ROOT/RELEASE_NOTES.txt" . \
  && printf '# Kur\x27an Yolculuğum — güncelleme kanalı\n\nSon sürüm: **%s** — [APK indir](%s)\n\nBu dal uygulamanın otomatik güncellemesi için kullanılır; elle değiştirmeyin.\n' "$NAME" "$APK" > README.md \
  && git add -A && git commit -qm "Sürüm $NAME ($CODE)" && git -c push.negotiate=true push -q origin "$BRANCH")
git worktree remove --force "$WT"
echo "Yayınlandı: $NAME ($CODE) → $APK_URL"
