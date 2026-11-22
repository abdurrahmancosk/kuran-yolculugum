#!/usr/bin/env python3
"""Kur'an verisini (Tanzil 'Simple' metni + Diyanet meali) uygulama formatına dönüştürür.
Kaynak: github.com/fawazahmed0/quran-api (Tanzil metni, Diyanet İşleri meali).
Kullanım: python3 gen_surahs.py <veri_klasörü> <çıktı.js>
"""
import json, sys, re, os

D = sys.argv[1]
OUT = sys.argv[2]

FATHA, KASRA, DAMMA, SUKUN, SHADDA, DAGGER = 'َ', 'ِ', 'ُ', 'ْ', 'ّ', 'ٰ'
WAQF = set(chr(c) for c in range(0x06D6, 0x06DD))

def load(ed, c):
    return {v['verse']: v['text'] for v in json.load(open(f'{D}/{ed}/{c}.json'))['chapter']}

info = json.load(open(f'{D}/info.json'))['chapters']
counts = [len(ch['verses']) for ch in info]
cum = [0]
for n in counts:
    cum.append(cum[-1] + n)

def gnum(s, a):
    return cum[s - 1] + a

BASMALA_STD = load('ara-quransimple', 1)[1]

ALLAH_RE = re.compile('لَّه')  # لَّه -> لّٰه (lafzatullah)
allah_hits = set()

def turkish_style(tok, ayah_initial):
    t = tok
    t = t.replace('آ', 'ا' + DAGGER)          # آ -> اٰ
    t = t.replace('أ', 'ا').replace('إ', 'ا')  # أ إ -> ا (hareke korunur)
    base = re.sub('[ً-ْٰ]', '', tok)
    # Lafzatullah: الله, لله, بالله, والله, فالله, اللهم
    if re.match('^(?:[وفب]?ا?لل?ه|[وفب]?اللهم|لله|الله)', base) and ALLAH_RE.search(t):
        t = ALLAH_RE.sub('لّ' + DAGGER + 'ه', t)
        allah_hits.add(tok)
    if ayah_initial and t.startswith('ال') :
        t = 'ا' + FATHA + t[1:]                      # اَلْ…
    if ayah_initial and t.startswith('اه' + SUKUN):
        t = 'ا' + KASRA + t[1:]                      # اِهْدِنَا
    return t

def words_of(text, ayah_initial=True):
    toks = text.split()
    out = []
    i = 0
    first = True
    while i < len(toks):
        tk = toks[i]
        if all(ch in WAQF for ch in tk):
            if out:
                out[-1]['m'] = (out[-1].get('m', '') + tk)
            i += 1
            continue
        parts = [tk]
        if tk == 'يَا' and i + 1 < len(toks):  # يَا + sonraki kelime (quran.com tek kelime sayar)
            parts.append(toks[i + 1])
            i += 1
        std = ' '.join(parts)
        tr = ' '.join(turkish_style(p, ayah_initial and first and k == 0) for k, p in enumerate(parts))
        out.append({'s': std, 't': tr, 'i': len(out) + 1})
        first = False
        i += 1
    return out

SURAHS = [
    (1, 'Fâtiha', 'الفاتحة', 'Fâtiha, Kur\'an\'ın ilk sûresidir. Her namazda okuruz.'),
    (112, 'İhlâs', 'الإخلاص', 'İhlâs sûresi, Allah\'ın bir olduğunu anlatır.'),
    (108, 'Kevser', 'الكوثر', 'Kevser, Kur\'an\'ın en kısa sûresidir.'),
    (103, 'Asr', 'العصر', 'Asr sûresi, zamanın çok kıymetli olduğunu anlatır.'),
    (110, 'Nasr', 'النصر', 'Nasr sûresi, Allah\'ın yardımını müjdeler.'),
    (113, 'Felak', 'الفلق', 'Felak sûresi ile her türlü kötülükten Allah\'a sığınırız.'),
    (114, 'Nâs', 'الناس', 'Nâs sûresi ile kötü düşüncelerden Allah\'a sığınırız.'),
    (106, 'Kureyş', 'قريش', 'Kureyş sûresi, Allah\'ın verdiği yiyecek ve güven nimetini anlatır.'),
    (105, 'Fîl', 'الفيل', 'Fîl sûresi, Kâbe\'yi yıkmaya gelen fil ordusunun hikâyesini anlatır.'),
    (111, 'Tebbet', 'المسد', 'Tebbet sûresi, Peygamberimize kötülük yapan Ebû Leheb\'i anlatır.'),
    (107, 'Mâûn', 'الماعون', 'Mâûn sûresi, yetime ve yoksula yardım etmeyi öğretir.'),
    (109, 'Kâfirûn', 'الكافرون', 'Kâfirûn sûresi, inancımıza sahip çıkmayı öğretir.'),
    (104, 'Hümeze', 'الهمزة', 'Hümeze sûresi, kimseyle alay etmemeyi ve kırıcı olmamayı öğretir.'),
]

result = []
for (n, tr, ar, desc) in SURAHS:
    simple = load('ara-quransimple', n)
    meal = load('tur-diyanetisleri', n)
    latin = load('tur-latinalphabet', n)
    verses = []
    for a in sorted(simple):
        t = simple[a]
        if n != 1 and a == 1:
            assert t.startswith(BASMALA_STD + ' '), (n, t)
            t = t[len(BASMALA_STD) + 1:]
        verses.append({'a': a, 'g': gnum(n, a), 'w': words_of(t), 'meal': meal.get(a, ''), 'latin': latin.get(a, '')})
    result.append({'n': n, 'tr': tr, 'ar': ar, 'desc': desc, 'count': len(verses), 'v': verses})

extra = {}
for (c, a) in [(2, 201), (14, 41)]:
    t = load('ara-quransimple', c)[a]
    extra[f'{c}:{a}'] = {'s': c, 'a': a, 'g': gnum(c, a), 'w': words_of(t),
                         'meal': load('tur-diyanetisleri', c)[a], 'latin': load('tur-latinalphabet', c)[a]}

basmala = {'w': words_of(BASMALA_STD), 'meal': load('tur-diyanetisleri', 1)[1], 'latin': load('tur-latinalphabet', 1)[1]}

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('/* Otomatik üretildi: tools/gen_surahs.py — Kaynak: Tanzil Kur\'an metni (Simple) ve Diyanet İşleri meali,\n')
    f.write('   github.com/fawazahmed0/quran-api üzerinden. Metin değiştirilmemiştir; "t" alanı yalnızca Türkiye mushafı\n')
    f.write('   yazım usulüne göre (hemzesiz elif, Allah lafzında çeker) gösterim içindir. */\n')
    f.write('window.K = window.K || {};\n')
    f.write('K.SURAHS = ' + json.dumps(result, ensure_ascii=False) + ';\n')
    f.write('K.BASMALA = ' + json.dumps(basmala, ensure_ascii=False) + ';\n')
    f.write('K.QURAN_EXTRA = ' + json.dumps(extra, ensure_ascii=False) + ';\n')
    f.write('K.AYAH_COUNTS = ' + json.dumps(counts) + ';\n')

print('allah tokens:', sorted(allah_hits))
# kontrol: quran.com kelime sayıları (Uthmani metne göre; yapay boşluklar ayıklanarak)
for (n, *_rest) in SURAHS:
    uth = load('ara-quranuthmanihaf', n)
    for v in next(r for r in result if r['n'] == n)['v']:
        ut = [x for x in uth[v['a']].replace('‏', '').split() if x not in ('ا',) and not all(ch in WAQF for ch in x)]
        if len(ut) != len(v['w']):
            print('COUNT MISMATCH', n, v['a'], len(v['w']), len(ut), uth[v['a']])
for r in result:
    for v in r['v']:
        for w in v['w']:
            if w['s'] != w['t'] and r['n'] in (1, 112):
                print(r['n'], v['a'], w['s'], '->', w['t'])
print('ok', len(result))
