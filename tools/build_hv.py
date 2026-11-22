#!/usr/bin/env python3
"""İnsan sesi paketini üretir: app/src/main/assets/www/hv/*.mp3 + js/hv_index.js

Kullanım:  HV_SRC=/kaynak/kök python3 tools/build_hv.py
  HV_SRC altında: CD/ (Diyanet Elif-Ba CD'si cdrom0/sesler), NH/ (Namaz Hocası mp3), CZ/ (çizgi film sesi .wav)
Kaynak tanımları tools/hv_sources.py; kelime kayıtları data_curriculum.js içindeki hv:'cdDERS_NO' anahtarlarından okunur.
Ses işleme: sessizlik kırpma, 70 Hz yüksek geçiren, ses düzeyi eşitleme (loudnorm), mono 44.1 kHz, MP3 64 kbps.
"""
import hashlib, json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(ROOT, 'app/src/main/assets/www')
OUT = os.path.join(WWW, 'hv')
CACHE = os.path.join(ROOT, 'build', 'hvcache')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import hv_sources as SRC  # noqa: E402

SRCROOT = os.environ.get('HV_SRC', '')
ROOTS = {'CD': 'CD', 'NH': 'NH', 'CZ': 'CZ'}


def src_paths(spec):
    kind, rel = spec.split(':', 1)
    base = os.path.join(SRCROOT, ROOTS[kind])
    m = re.match(r'(.*)_\{(\d+)\.\.(\d+)\}$', rel)
    if m:
        return [os.path.join(base, f'{m.group(1)}_{i}.mp3') for i in range(int(m.group(2)), int(m.group(3)) + 1)]
    return [os.path.join(base, rel)]


def words_from_js():
    js = open(os.path.join(WWW, 'js/data_curriculum.js'), encoding='utf-8').read()
    keys = sorted(set(re.findall(r"'(cd\d+_\d+)'", js)))
    out = []
    for k in keys:
        les, n = k[2:].split('_')
        out.append(dict(k=k, s=f'CD:cuz/{les}/{n}.mp3'))
    return out


FILTER_TRIM = ('silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.04,areverse,'
               'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.06,areverse,')


def build_one(e, force=False):
    dst = os.path.join(OUT, e['k'] + '.mp3')
    paths = src_paths(e['s'])
    sig = hashlib.sha1(json.dumps([e, [os.path.getsize(p) for p in paths]], sort_keys=True).encode()).hexdigest()[:12]
    stamp = os.path.join(CACHE, e['k'] + '.sig')
    if not force and os.path.exists(dst) and os.path.exists(stamp) and open(stamp).read() == sig:
        return dst
    with tempfile.TemporaryDirectory() as td:
        parts = []
        for i, p in enumerate(paths):
            q = os.path.join(td, f'p{i}.wav')
            cmd = ['ffmpeg', '-loglevel', 'error', '-y']
            if 'ss' in e: cmd += ['-ss', str(e['ss'])]
            if 'to' in e: cmd += ['-to', str(e['to'])]
            cmd += ['-i', p, '-ac', '1', '-ar', '44100']
            af = (FILTER_TRIM if e.get('trim', True) else '') + 'highpass=f=70'
            if len(paths) > 1 and i < len(paths) - 1: af += ',apad=pad_dur=0.35'
            cmd += ['-af', af, q]
            subprocess.run(cmd, check=True)
            parts.append(q)
        cat = os.path.join(td, 'cat.wav')
        if len(parts) > 1:
            lst = os.path.join(td, 'l.txt')
            open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, cat], check=True)
        else:
            cat = parts[0]
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', cat, '-af',
                        'loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.06', '-ar', '44100', '-ac', '1',
                        '-c:a', 'libmp3lame', '-b:a', '64k', dst], check=True)
    open(stamp, 'w').write(sig)
    return dst


def main():
    if not SRCROOT:
        sys.exit('HV_SRC tanımlı değil')
    os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)
    ents = SRC.entries() + words_from_js()
    seen = set(); texts = {}
    for e in ents:
        if e['k'] in seen: continue
        seen.add(e['k'])
        build_one(e, force='--force' in sys.argv)
        if e.get('t'):
            texts[e['k']] = e['t']
    # artık kullanılmayan dosyaları sil
    for f in os.listdir(OUT):
        if f.rsplit('.', 1)[0] not in seen:
            os.remove(os.path.join(OUT, f))
    js = ('/* Üretildi: tools/build_hv.py — gömülü İNSAN sesi kayıtları (yapay ses yok). */\n'
          'window.K = window.K || {};\n'
          f'K.HV = new Set({json.dumps(sorted(seen))});\n'
          f'K.HV_TEXT = {json.dumps(texts, ensure_ascii=False, indent=0)};\n'
          f'K.HV_PRAISE = {json.dumps(sorted(k for k in seen if k.startswith("pr_aferin")))};\n')
    open(os.path.join(WWW, 'js/hv_index.js'), 'w', encoding='utf-8').write(js)
    size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.mp3'))
    print(f'{len(seen)} kayıt, {size / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
