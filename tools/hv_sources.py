"""İnsan sesi kaynak listesi (yapay ses YOK).

Kaynaklar (yerel klasör kökleri HV_SRC ortam değişkeniyle verilir, depoya girmez):
  CD  = Diyanet İşleri Başkanlığı "Elif-Ba'sı CD-ROM" (archive.org: elif-ba-cd-diyanet) → cdrom0/sesler
  NH  = "Namaz Hocası Mp3" (archive.org: namazhocasimp3)
  CZ  = "Namaz Öğreniyorum" çizgi filmi (archive.org: Namaz-ogreniyorum-cizgi-film), ses kanalı
Her kayıt Whisper ile metne karşı denetlenmiştir (tools/build_hv.py --verify).
"""

# Harf sırası (data_letters.js ile aynı)
LETTERS = ['elif', 'be', 'te', 'se', 'cim', 'ha', 'hi', 'dal', 'zel', 'ra', 'ze', 'sin', 'shin', 'sad', 'dad',
           'ti', 'zi', 'ayn', 'gayn', 'fe', 'kaf', 'kef', 'lam', 'mim', 'nun', 'vav', 'he', 'lamelif', 'ye']
ROW28 = [l for l in LETTERS if l != 'lamelif']             # CD ders 2 ve 12: Elif … Ye (28 satır)
ROW27 = [l for l in ROW28 if l != 'elif']                  # CD ders 9 ve 17: Be … Ye (27 satır)
H = ['u', 'e', 'o']                                         # üstün, esre, ötre


def cell(lesson, row, j):
    """CD'de satır r'nin j. hecesi: r=1,2 için _r j, diğerleri r j."""
    return f'cuz/{lesson}/_{row}{j}.mp3' if row <= 2 else f'cuz/{lesson}/{row}{j}.mp3'


def entries():
    out = []
    add = lambda k, s, **kw: out.append(dict(k=k, s=s, **kw))
    # 1) Harflerin adları (ders 1: 29 kayıt, Lamelif 28., Ye 29.)
    for i, l in enumerate(LETTERS):
        add('L_' + l, f'CD:cuz/1/{i + 1}.mp3')
    # 2) Harekeli okunuş (ders 2), cezm (ders 9), med (ders 12), şedde (ders 17)
    for lesson, rows, pre in ((2, ROW28, 'S'), (9, ROW27, 'C'), (12, ROW28, 'M'), (17, ROW27, 'D')):
        for r, l in enumerate(rows, 1):
            for j, h in enumerate(H, 1):
                add(f'{pre}_{l}_{h}', 'CD:' + cell(lesson, r, j))
    # CD dökümündeki 3 bozuk hece dosyası: aynı hocanın satır kaydından kesilir
    fix = {'C_cim_o': dict(s='CD:cuz/9/4.mp3', ss=3.62, to=4.55), 'M_ra_u': dict(s='CD:cuz/12/10.mp3', ss=0, to=1.80),
           'D_lam_o': dict(s='CD:cuz/17/22.mp3', ss=4.55)}
    for e in out:
        if e['k'] in fix: e.update(fix[e['k']])
    # 3) Dua ve zikirler (Diyanet CD)
    for k, s in [
        ('du_tekbir', 'dualar/subhaneke/allahuekber.mp3'),
        ('du_subhaneke', 'dualar/subhaneke/subhaneke_{1..5}'),
        ('du_tahiyyat', 'dualar/ettehiyyatu/tahiyyat_{1..5}'),
        ('du_salli', 'dualar/salli/salli_{1..3}'),
        ('du_barik', 'dualar/barik/barik_{1..3}'),
        ('du_rabbena1', 'dualar/atina/atina_{1..2}'),
        ('du_rabbena2', 'dualar/rabbenagfirli/rabbenagfirli.mp3'),
        ('du_ruku', 'ezan/tesbihat/subhanerabbiyelazim.mp3'),
        ('du_semiallah', 'ezan/tesbihat/semiallahulimenhamideh.mp3'),
        ('du_rabbenalek', 'ezan/tesbihat/rabbenalekelhamd.mp3'),
        ('du_secde', 'ezan/tesbihat/subhanerabbiyelala.mp3'),
        ('du_selam', 'ezan/tesbihat/esselamualeykumv.mp3'),
        ('du_euzu', 'sureler/fatiha/euzu.mp3'),
        ('du_besmele', 'sureler/fatiha/besmele.mp3'),
        ('du_sehadet', 'kelimei_tevhid/kelimei_sehadet_{1..2}'),
        ('du_tevhid', 'kelimei_tevhid/kelimei_tevhid_{1..2}'),
        ('du_amentu', 'kelimei_tevhid/amentu/amentu_{1..5}'),
    ]:
        add(k, 'CD:' + s)
    # 4) Diyanet CD'sindeki Türkçe ders anlatımları (metin = kayıtta söylenen)
    for k, f, t in CD_TR:
        add(k, 'CD:' + f, t=t)
    # 5) Namaz Hocası: abdest ve namaz anlatımı (cümle cümle, Whisper ile zamanlandı)
    for k, f, a, b, t in NH:
        add(k, 'NH:' + f, ss=round(max(0, a - 0.12), 2), to=round(b + 0.3, 2), t=t)
    # 6) "Namaz Öğreniyorum" çizgi filmi: babanın tebrikleri (pr_ = tebrik listesi)
    for k, f, a, b, t in CZ:
        add(k, 'CZ:' + f, ss=a, to=b, t=t)
    return out


CZ = [
    ('pr_aferin1', 'cd2.wav', 6.62, 7.62, 'Aferin sana.'),
    ('pr_aferin2', 'cd2.wav', 1003.30, 1004.40, 'Aferin sana!'),
    ('pr_namaz', 'cd2.wav', 6.62, 9.92, 'Aferin sana. Namaz kılmayı çabuk öğrenmişsin.'),
]

# (anahtar, dosya, başlangıç sn, bitiş sn, söylenen metin)
NH = [
    ('nh_ab0', 'nh01.wav', 9.43, 16.53, 'Abdeste eûzü besmele ve niyetle başlanır. Niyet ettim Allah rızası için abdest almaya denir.'),
    ('nh_ab1', 'nh01.wav', 17.02, 27.93, 'Ardından eller bileklere kadar yıkanır. Eller yıkanırken parmak araları dahil kuru yer kalmayacak şekilde yıkanır. Yüzük varsa hareket ettirilir.'),
    ('nh_ab2', 'nh01.wav', 29.11, 35.90, 'Ellerden sonra sağ elle ağza üç defa su verilir. Ağız çalkalanır, geri boşaltılır.'),
    ('nh_ab3', 'nh01.wav', 41.96, 48.95, 'Ağız yıkandıktan sonra sağ elle buruna üç defa su verilir. Sol elle sümkürülür. Bu sünnettir.'),
    ('nh_ab4', 'nh01.wav', 49.97, 62.72, 'Burundan sonra yüz yıkanır. İki elin avuçlarına su alınır, yüze sürülür. Bu şekilde yüz üç defa yıkanır. Saç bitiminden çene altına kadar yüzü yıkamak farzdır.'),
    ('nh_ab5', 'nh01.wav', 70.15, 79.37, 'Yüzden sonra kollar yıkanır. İlk önce sağ kol, daha sonra da sol kol, dirsekler dahil olmak üzere kuru yer kalmayacak şekilde yıkanır.'),
    ('nh_ab6', 'nh01.wav', 94.82, 96.86, 'Kolların yıkanması farzdır.'),
    ('nh_ab7', 'nh01.wav', 97.43, 108.54, 'Kollar yıkandıktan sonra baş meshedilir. İki el yıkanır, sağ elle başın üst tarafı bir kere meshedilir. Avuç içi başın üst kısmına temas ettirilir.'),
    ('nh_ab8', 'nh01.wav', 112.08, 128.97, 'Baş meshedildikten sonra kulaklar ve boyun meshedilir. Başımızı mesh ederken yıkadığımız ellerimizi bir daha yıkamaya gerek olmadan, önce kulaklar; serçe parmakla kulakların iç kısmı, baş parmaklarla da kulakların arkasını dolaşacak şekilde meshedilir.'),
    ('nh_ab9', 'nh01.wav', 130.28, 137.35, 'Sonra da kalan üç parmağın arka kısımlarıyla boynun arka ve yan tarafları meshedilir. Bu sünnettir.'),
    ('nh_ab10', 'nh01.wav', 138.85, 151.30, 'Son olarak ayaklar yıkanır. Yıkamaya sağ ayaktan başlanır, ayaklar topuklarla birlikte kuru yer kalmayacak şekilde yıkanır. Parmak araları teker teker aralanır ve yıkanır.'),
    ('nh_ab11', 'nh01.wav', 156.67, 163.79, 'Sonra sol ayak aynı şekilde kuru yer kalmayacak şekilde yıkanır. Ayakların yıkanması farzdır.'),
    ('nh_ab12', 'nh01.wav', 165.56, 168.72, 'Ayakların yıkanmasıyla abdest tamamlanmış olur.'),
    ('nh_n_kible', 'nh03.wav', 29.83, 31.61, 'Ayakta kıbleye doğru dönülür.'),
    ('nh_n_niyet', 'nh03.wav', 520.37, 527.98, 'Kâmet bittikten sonra niyet edilir. Niyet ettim Allah rızası için sabah namazının farzını kılmaya denir.'),
    ('nh_n_tekbir', 'nh03.wav', 39.42, 43.29, 'Eller kaldırılır, Allâhü ekber diyerek tekbir alınır.'),
    ('nh_n_tekbir_m', 'nh03.wav', 44.24, 47.14, 'Baş parmaklar kulakların hizasına kadar kaldırılır.'),
    ('nh_n_tekbir_f', 'nh03.wav', 48.45, 52.01, 'Bayanlar ellerini omuzları hizasına kadar kaldırırlar.'),
    ('nh_n_avuc', 'nh03.wav', 52.88, 54.66, 'Avuç içleri kıbleye dönük olur.'),
    ('nh_n_bag_m', 'nh03.wav', 55.26, 58.03, 'Tekbirden sonra eller göbek altına bağlanır.'),
    ('nh_n_bag_f', 'nh03.wav', 60.17, 63.23, 'Bayanlar ellerini göğüslerinin üzerine bağlarlar.'),
    ('nh_n_subhaneke', 'nh03.wav', 64.36, 66.57, 'Sonra Sübhâneke duası okunur.'),
    ('nh_n_fatiha', 'nh03.wav', 67.17, 71.73, 'Sübhâneke\'den sonra eûzü besmele ile birlikte Fâtiha sûresi okunur.'),
    ('nh_n_sure', 'nh03.wav', 72.50, 75.44, 'Fâtiha sûresinden sonra bir sûre daha okunur.'),
    ('nh_n_ruku', 'nh03.wav', 76.08, 79.83, 'Okuyuş bittikten sonra tekbir alınır ve rükûya gidilir.'),
    ('nh_n_ruku_m', 'nh03.wav', 84.50, 87.51, 'Rükûda eller dizleri kavrayacak şekilde tutulur.'),
    ('nh_n_ruku_f', 'nh03.wav', 88.08, 91.88, 'Bayanlar ellerini dizlerinin biraz yukarı kısmına koyarlar.'),
    ('nh_n_goz', 'nh03.wav', 92.77, 94.59, 'Gözler secde yerine bakar.'),
    ('nh_n_ruku3', 'nh03.wav', 95.20, 98.75, 'Burada üç defa «Sübhâne rabbiye\'l-azîm» denir.'),
    ('nh_n_kavme', 'nh03.wav', 100.17, 104.71, 'Sonra «Semiallâhü limen hamideh» diyerek rükûdan kalkılır.'),
    ('nh_n_kavme2', 'nh03.wav', 107.01, 111.85, 'Ayakta «Sübhânallah» diyecek kadar durulduktan sonra tekbir alıp secdeye gidilir.'),
    ('nh_n_secde', 'nh03.wav', 126.46, 129.83, 'Secdede üç defa «Sübhâne rabbiye\'l-a\'lâ» denir.'),
    ('nh_n_celse', 'nh03.wav', 130.71, 138.31, 'Secdeden tekbir alarak kalkılır. «Sübhânallah» diyecek kadar oturulduktan sonra tekbirle ikinci secdeye gidilir.'),
    ('nh_n_secde2', 'nh03.wav', 280.04, 282.67, 'Üç kere «Sübhâne rabbiye\'l-a\'lâ» denir.'),
    ('nh_n_kalk', 'nh03.wav', 142.20, 145.32, 'Tekbir alınır ve ikinci rekât için ayağa kalkılır.'),
    ('nh_n_rekat2', 'nh03.wav', 167.56, 173.22, 'İkinci rekâta başlarken besmele ile birlikte Fâtiha sûresi ve bir sûre daha okunur.'),
    ('nh_n_otur', 'nh03.wav', 283.28, 285.06, 'Tekbir alınır ve oturulur.'),
    ('nh_n_tahiyyat', 'nh03.wav', 310.16, 320.88, 'Bu son oturuştur. Bu oturuşa tahiyyata oturmak denir. Otururken Ettehiyyâtü, Salli, Bârik ve Rabbenâ duaları okunur.'),
    ('nh_n_selam', 'nh03.wav', 386.65, 394.76, 'Dualar okunduktan sonra önce sağ tarafa, sonra da sol tarafa «Esselâmü aleyküm ve rahmetullah» diye selam verilir.'),
    ('nh_n_selam2', 'nh03.wav', 395.28, 398.62, 'Selam verirken baş, selam verilen yöne döndürülür.'),
    ('nh_n_son', 'nh03.wav', 414.51, 431.88, 'Selamdan sonra «Allâhümme entesselâmü ve minkesselâm, tebârakte yâ zel-celâli vel-ikrâm» duası okunur.'),
]


CD_TR = [
    ('tr_harfler', 'cuz/1/BASLIK.mp3', 'Harflerin bağımsız isimleri.'),
    ('tr_hareke', 'cuz/2/BASLIK.mp3', 'Harflerin harekelerle okunuşu. Harekeler üçtür: üstün, esre, ötre.'),
    ('tr_sekil', 'cuz/2/BASLIK3.mp3', 'Harflerin başta, ortada ve sondaki durumları.'),
    ('tr_ustun', 'cuz/4/BASLIK.mp3', 'Üstün, ince harfleri e sesiyle, kalın harfleri a sesiyle okutur.'),
    ('tr_esre', 'cuz/7/BASLIK.mp3', 'Esre, ince harfleri i sesiyle, kalın harfleri i-ı arası bir sesle okutur.'),
    ('tr_otre', 'cuz/8/BASLIK.mp3', 'Ötre, ince harfleri ü-u arası bir sesle, kalın harfleri u sesiyle okutur.'),
    ('tr_cezm1', 'cuz/9/BASLIK.mp3', 'Harflerin cezimli okunuşu.'),
    ('tr_cezm2', 'cuz/10/BASLIK.mp3', 'Cezim, üzerinde bulunduğu harfi harekesiz okutur.'),
    ('tr_alistirma', 'cuz/11/BASLIK.mp3', 'Alıştırmalar.'),
    ('tr_med', 'cuz/12/BASLIK.mp3', 'Harflerin med harfleriyle uzatılarak okunuşu. Uzatma harfleri üçtür: vav, ya, elif.'),
    ('tr_med_elif', 'cuz/13/BASLIK.mp3', 'Harf-i med, uzatma harfi elif: kendinden önceki ince harfi a-e arası sesle, kalın harfi a sesiyle uzatır.'),
    ('tr_med_ya', 'cuz/14/BASLIK.mp3', 'Harf-i med, uzatma harfi ya: kendinden önceki ince harfi i sesiyle, kalın harfi i-ı arası bir sesle uzatır.'),
    ('tr_med_vav', 'cuz/15/BASLIK.mp3', 'Harf-i med, uzatma harfi vav: kendinden önceki ince harfi u-ü arası sesle, kalın harfi u sesiyle uzatır.'),
    ('tr_sedde1', 'cuz/17/BASLIK.mp3', 'Harflerin şeddeli okunuşu.'),
    ('tr_sedde2', 'cuz/18/BASLIK.mp3', 'Şedde, üzerinde bulunduğu harfi iki kere okutur.'),
    ('tr_tenvin_u', 'cuz/20/BASLIK.mp3', 'İki üstün, ince harfleri en sesiyle, kalın harfleri an sesiyle okutur.'),
    ('tr_tenvin_e', 'cuz/21/BASLIK.mp3', 'İki esre, ince harfleri in sesiyle, kalın harfleri in-ın arası bir sesle okutur.'),
    ('tr_tenvin_o', 'cuz/22/BASLIK.mp3', 'İki ötre, ince harfleri ün-un arası bir sesle, kalın harfleri un sesiyle okutur.'),
    ('tr_ceker', 'cuz/23/BASLIK.mp3', 'Çeker, önünde med harfi olsun olmasın, o harfin uzatılacağını gösterir.'),
    ('tr_el', 'cuz/26/BASLIK.mp3', 'El takısı.'),
    ('tr_lafza', 'cuz/28/BASLIK.mp3', 'Lafzatullah: Allah lafzındaki lam harfi, bu lafızdan önceki harfin harekesi üstün veya ötre ise kalın, esre ise ince okunur.'),
]
