#!/usr/bin/env python3
"""Telefondaki uygulamanın günlük okuduğu update.json dosyasını üretir.
Ortam değişkenleri: CODE, NAME, TAG, SHA, APK_URL (isteğe bağlı), GITHUB_REPOSITORY."""
import json, os

repo = os.environ.get('GITHUB_REPOSITORY', 'abdurrahmancosk/kuran-yolculugum')
notes = ''
if os.path.exists('RELEASE_NOTES.txt'):
    notes = open('RELEASE_NOTES.txt', encoding='utf-8').read().strip()
data = {
    'versionCode': int(os.environ['CODE']),
    'versionName': os.environ['NAME'],
    'apk': os.environ.get('APK_URL') or f"https://github.com/{repo}/releases/download/{os.environ['TAG']}/KuranYolculugum.apk",
    'sha256': os.environ['SHA'],
    'notes': notes,
}
with open('update.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
