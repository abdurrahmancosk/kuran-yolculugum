#!/usr/bin/env python3
"""Uygulamadaki tüm anlatımları doğal bir erkek sesiyle önceden üretir (çevrimdışı).
Türkçe: Piper "tr_TR-fahrettin-medium" (erkek), Arapça dualar: Piper "ar_JO-kareem-medium" (erkek).
Modeller: github.com/k2-fsa/sherpa-onnx/releases (tts-models). Çıktı: assets/www/voice/<hash>.mp3 + js/voice_index.js
Kullanım: python3 tools/gen_voice.py <model_klasörü> [--force]
"""
import json, os, re, sys, subprocess, unicodedata, wave, tempfile
import numpy as np
import sherpa_onnx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(ROOT, 'app/src/main/assets/www')
OUTDIR = os.path.join(WWW, 'voice')
MODELS = sys.argv[1]
FORCE = '--force' in sys.argv
VOICES = {'tr': 'vits-piper-tr_TR-fahrettin-medium', 'ar': 'vits-piper-ar_JO-kareem-medium'}

def b36(n):
    s = '0123456789abcdefghijklmnopqrstuvwxyz'; o = ''
    while True:
        n, r = divmod(n, 36); o = s[r] + o
        if n == 0: return o

def vhash(lang, text):
    t = unicodedata.normalize('NFC', lang + '|' + str(text))
    t = re.sub(r'\s+', ' ', t).strip()
    h1, h2 = 0x811c9dc5, 5381
    for ch in t:
        c = ord(ch)
        h1 = ((h1 ^ c) * 16777619) & 0xffffffff
        h2 = (h2 * 33 + c) & 0xffffffff
    return b36(h1) + b36(h2)

def load(lang):
    d = os.path.join(MODELS, VOICES[lang]); onnx = [f for f in os.listdir(d) if f.endswith('.onnx')][0]
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(
        model=os.path.join(d, onnx), tokens=os.path.join(d, 'tokens.txt'), data_dir=os.path.join(d, 'espeak-ng-data'),
        noise_scale=0.62, noise_scale_w=0.75, length_scale=1.0), num_threads=4, provider='cpu'), max_num_sentences=2)
    return sherpa_onnx.OfflineTts(cfg)

def prep(lang, t):
    # tirelerde kısa duraklama (ör. "eb-be" → "eb be")
    return t.replace('-', ' ') if lang == 'tr' else t

def main():
    inv = json.load(open(os.path.join(ROOT, 'tools/voice_inventory.json'), encoding='utf-8'))
    os.makedirs(OUTDIR, exist_ok=True)
    engines = {}
    keep = set()
    n_new = 0
    for i, it in enumerate(inv):
        lang, text = it['lang'], it['text']
        if lang not in VOICES: continue
        h = vhash(lang, text); keep.add(h)
        mp3 = os.path.join(OUTDIR, h + '.mp3')
        if os.path.exists(mp3) and not FORCE: continue
        if lang not in engines: engines[lang] = load(lang)
        short = len(text) <= 8
        speed = 0.82 if short else (0.9 if len(text) < 40 else 0.93)
        if lang == 'ar': speed = 0.8
        a = engines[lang].generate(prep(lang, text), sid=0, speed=speed)
        x = np.array(a.samples, dtype=np.float32)
        if x.size == 0: print('BOŞ:', text); continue
        # baş/son sessizliği kırp, kısa nefes payı bırak
        thr = 0.01; nz = np.where(np.abs(x) > thr)[0]
        if nz.size: x = x[max(0, nz[0] - int(0.03 * a.sample_rate)): nz[-1] + int(0.12 * a.sample_rate)]
        x = np.concatenate([np.zeros(int(0.04 * a.sample_rate), np.float32), x])
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
            with wave.open(tf.name, 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(a.sample_rate)
                w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
            # sıcak, net ses: gürültü/tıslama azaltma, hafif sıkıştırma, ses düzeyi eşitleme
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tf.name, '-af',
                            'highpass=f=70,lowpass=f=8500,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1.2:g=1.5,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=80,loudnorm=I=-17:TP=-2:LRA=9',
                            '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '40k', mp3], check=True)
            os.unlink(tf.name)
        n_new += 1
        if n_new % 100 == 0: print(n_new, 'üretildi...', flush=True)
    # artık kullanılmayan dosyaları temizle
    removed = 0
    for f in os.listdir(OUTDIR):
        if f.endswith('.mp3') and f[:-4] not in keep: os.unlink(os.path.join(OUTDIR, f)); removed += 1
    hashes = sorted(h for h in keep if os.path.exists(os.path.join(OUTDIR, h + '.mp3')))
    with open(os.path.join(WWW, 'js/voice_index.js'), 'w', encoding='utf-8') as f:
        f.write('/* Otomatik üretildi: tools/gen_voice.py — gömülü erkek sesi paketi dizini */\nwindow.K = window.K || {};\nK.VOICE = new Set(' + json.dumps(hashes) + ');\n')
    size = sum(os.path.getsize(os.path.join(OUTDIR, h + '.mp3')) for h in hashes)
    print(f'yeni {n_new}, silinen {removed}, toplam {len(hashes)} dosya, {size / 1048576:.1f} MB')

if __name__ == '__main__':
    main()
