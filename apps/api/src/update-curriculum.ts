/**
 * Atlas Derslik — MEB Müfredatı Tam Güncelleme
 * 4-8. sınıf arası TÜM dersleri ve ünite/konuları ekler.
 *
 * MEB 2025-2026 Müfredatına Uygun:
 * - 4. Sınıf: Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler, İngilizce, Din Kültürü
 * - 5. Sınıf: Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler, İngilizce, Din Kültürü
 * - 6. Sınıf: Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler, İngilizce, Din Kültürü
 * - 7. Sınıf: Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler, İngilizce, Din Kültürü
 * - 8. Sınıf: Türkçe, Matematik, Fen Bilimleri, T.C. İnkılap Tarihi ve Atatürkçülük, İngilizce, Din Kültürü
 *
 * Usage: cd apps/api && npx ts-node src/update-curriculum.ts
 */

import mongoose, { Types } from 'mongoose';

const MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb+srv://atlasderslik:2002%2E2002@atlasderslik.7qapnxz.mongodb.net/atlas-derslik?retryWrites=true&w=majority&appName=atlasderslik';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const gradeSchema = new mongoose.Schema(
    { level: { type: Number, required: true }, label: { type: String, default: '' }, isActive: { type: Boolean, default: true } },
    { timestamps: true },
);

const subjectSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        gradeLevel: { type: Number, required: true },
        icon: String,
        isActive: { type: Boolean, default: true },
        zoomUrl: { type: String, default: '' },
        zoomMeetingId: { type: String, default: '' },
        zoomPasscode: { type: String, default: '' },
    },
    { timestamps: true },
);
subjectSchema.index({ name: 1, gradeLevel: 1 }, { unique: true });

const unitSchema = new mongoose.Schema(
    { name: { type: String, required: true }, subjectId: { type: Types.ObjectId, ref: 'Subject', required: true }, order: { type: Number, default: 0 } },
    { timestamps: true },
);

const topicSchema = new mongoose.Schema(
    { name: { type: String, required: true }, unitId: { type: Types.ObjectId, ref: 'Unit', required: true }, order: { type: Number, default: 0 }, objective: String },
    { timestamps: true },
);

const Grade = mongoose.model('Grade', gradeSchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Unit = mongoose.model('Unit', unitSchema);
const Topic = mongoose.model('Topic', topicSchema);

// ─── MEB Müfredatı — Ünite & Konular ─────────────────────────────────────────

interface CurriculumEntry {
    units: { name: string; topics: string[] }[];
}

// ── FEN BİLİMLERİ ──────────────────────────────────────────────────────
const FEN_4: CurriculumEntry = {
    units: [
        { name: 'Dünya ve Evren', topics: ['Güneş Sistemi', 'Dünya\'nın Katmanları', 'Yer Kabuğunun Yapısı'] },
        { name: 'Canlılar Dünyası', topics: ['Bitkileri Tanıyalım', 'Mikroskobik Canlılar', 'İnsan Vücudu'] },
        { name: 'Fiziksel Olaylar', topics: ['Kuvvet ve Hareket', 'Ses ve Özellikleri', 'Işık ve Özellikleri'] },
        { name: 'Madde ve Doğası', topics: ['Maddeyi Tanıyalım', 'Maddenin Halleri', 'Saf Madde ve Karışımlar'] },
    ],
};

const FEN_5: CurriculumEntry = {
    units: [
        { name: 'Canlılar Dünyası', topics: ['Canlıların Sınıflandırılması', 'İnsan ve Çevre İlişkisi', 'Biyolojik Çeşitlilik'] },
        { name: 'Fiziksel Olaylar', topics: ['Kuvvetin Ölçülmesi', 'Sürtünme Kuvveti', 'Işığın Yayılması', 'Işık ve Ses'] },
        { name: 'Madde ve Değişim', topics: ['Maddenin Değişimi', 'Maddenin Halleri ve Isı', 'Hal Değişimleri', 'Karışımlar'] },
        { name: 'Dünya ve Evren', topics: ['Güneş, Dünya ve Ay', 'Yıldızlar ve Gezegenler', 'Ay\'ın Hareketleri'] },
    ],
};

const FEN_6: CurriculumEntry = {
    units: [
        { name: 'Vücudumuzdaki Sistemler', topics: ['Destek ve Hareket Sistemi', 'Sindirim Sistemi', 'Dolaşım Sistemi', 'Solunum Sistemi', 'Boşaltım Sistemi'] },
        { name: 'Kuvvet ve Hareket', topics: ['Kuvvet, İş ve Enerji', 'Basit Makineler'] },
        { name: 'Madde ve Isı', topics: ['Maddenin Tanecikli Yapısı', 'Isı ve Sıcaklık', 'Hal Değişimi ve Isı Alışverişi'] },
        { name: 'Ses ve Özellikleri', topics: ['Sesin Oluşumu', 'Sesin Yayılması', 'Sesin Sürati ve Şiddeti'] },
        { name: 'Elektrik', topics: ['Elektrik Devre Elemanları', 'Seri ve Paralel Bağlama', 'Elektriğin Güvenli Kullanımı'] },
    ],
};

const FEN_7: CurriculumEntry = {
    units: [
        { name: 'Hücre ve Bölünmeler', topics: ['Hücre Yapısı', 'Mitoz Bölünme', 'Canlılarda Üreme'] },
        { name: 'Kuvvet ve Enerji', topics: ['Kuvvet ve Enerji İlişkisi', 'Enerji Dönüşümleri', 'Yenilenebilir Enerji Kaynakları'] },
        { name: 'Maddenin Yapısı ve Özellikleri', topics: ['Atom ve Molekül', 'Element ve Bileşik', 'Kimyasal Tepkimeler', 'Asitler ve Bazlar'] },
        { name: 'Işık', topics: ['Işığın Kırılması', 'Aynalar', 'Mercekler', 'Işığın Renklere Ayrılması'] },
        { name: 'Elektrik', topics: ['Elektrik Enerjisi', 'Elektriksel Kuvvet', 'Ampermetre ve Voltmetre'] },
    ],
};

const FEN_8: CurriculumEntry = {
    units: [
        { name: 'Mevsimler ve İklim', topics: ['Mevsim Oluşumu', 'İklim ve Hava Durumu', 'Küresel İklim Değişikliği'] },
        { name: 'DNA ve Genetik Kod', topics: ['DNA Yapısı', 'Genetik Kod', 'Mutasyon', 'Genetik Mühendisliği ve Biyoteknoloji'] },
        { name: 'Basınç', topics: ['Katılarda Basınç', 'Sıvılarda Basınç', 'Gazlarda Basınç', 'Kaldırma Kuvveti'] },
        { name: 'Madde ve Endüstri', topics: ['Periyodik Tablo', 'Fiziksel ve Kimyasal Değişimler', 'Kimyasal Tepkime Denklemleri', 'Endüstride Kimya'] },
        { name: 'Basit Makineler', topics: ['Basit Makineler', 'Dişliler', 'Kasnaklar'] },
        { name: 'Enerji Dönüşümleri', topics: ['Enerji Türleri', 'Enerji Dönüşümü ve Korunumu', 'Verimlilik'] },
    ],
};

// ── MATEMATİK ───────────────────────────────────────────────────────
const MAT_4: CurriculumEntry = {
    units: [
        { name: 'Doğal Sayılar', topics: ['Doğal Sayılarla Toplama', 'Doğal Sayılarla Çıkarma', 'Doğal Sayılarla Çarpma', 'Doğal Sayılarla Bölme'] },
        { name: 'Kesirler', topics: ['Kesir Kavramı', 'Kesirleri Karşılaştırma', 'Bileşik ve Tam Sayılı Kesirler'] },
        { name: 'Ondalık Gösterim', topics: ['Ondalık Gösterim', 'Ondalık Kesirlerle İşlemler'] },
        { name: 'Geometri', topics: ['Açılar', 'Üçgen ve Dörtgenler', 'Simetri', 'Çevre Uzunlukları'] },
        { name: 'Ölçme', topics: ['Uzunluk Ölçme', 'Tartma', 'Sıvıları Ölçme', 'Zaman Ölçme'] },
        { name: 'Veri', topics: ['Tablo Oluşturma', 'Sütun Grafiği'] },
    ],
};

const MAT_5: CurriculumEntry = {
    units: [
        { name: 'Doğal Sayılar', topics: ['Doğal Sayılarla İşlemler', 'Sayı Örüntüleri', 'Doğal Sayıların Katları ve Bölenleri'] },
        { name: 'Kesirlerle İşlemler', topics: ['Kesirlerle Toplama ve Çıkarma', 'Kesirlerle Çarpma', 'Ondalık Gösterim'] },
        { name: 'Yüzdeler', topics: ['Yüzde Kavramı', 'Yüzde Hesaplamaları'] },
        { name: 'Temel Geometri', topics: ['Açılar', 'Üçgenler', 'Dörtgenler', 'Çember ve Daire'] },
        { name: 'Alan Ölçme', topics: ['Alan Kavramı', 'Dikdörtgen ve Kare Alanı', 'Üçgen Alanı'] },
        { name: 'Veri İşleme', topics: ['Tablo ve Grafik Okuma', 'Ortalama', 'Veri Toplama'] },
    ],
};

const MAT_6: CurriculumEntry = {
    units: [
        { name: 'Doğal Sayılarla İşlemler', topics: ['EKOK ve EBOB', 'Üslü Sayılar', 'İşlem Önceliği'] },
        { name: 'Tam Sayılar', topics: ['Tam Sayı Kavramı', 'Tam Sayılarla Toplama ve Çıkarma', 'Tam Sayılarla Çarpma ve Bölme'] },
        { name: 'Kesirlerle İşlemler', topics: ['Kesirlerle Çarpma ve Bölme', 'Ondalık Kesirlerle İşlemler'] },
        { name: 'Oran-Orantı', topics: ['Oran Kavramı', 'Orantı', 'Doğru Orantı'] },
        { name: 'Cebir', topics: ['Cebirsel İfadeler', 'Denklem Kurma ve Çözme'] },
        { name: 'Geometri', topics: ['Açı Hesaplamaları', 'Alan Hesaplamaları', 'Çember', 'Prizmalar'] },
        { name: 'Veri Analizi', topics: ['Çizgi Grafiği', 'Daire Grafiği', 'Merkezi Eğilim Ölçüleri'] },
    ],
};

const MAT_7: CurriculumEntry = {
    units: [
        { name: 'Tam Sayılarla İşlemler', topics: ['Tam Sayılarla İşlemler', 'Rasyonel Sayılar', 'Rasyonel Sayılarla İşlemler'] },
        { name: 'Oran-Orantı', topics: ['Ters Orantı', 'Yüzde Problemleri', 'Basit Faiz'] },
        { name: 'Cebir', topics: ['Cebirsel İfadeler ve Özdeşlikler', 'Birinci Dereceden Denklemler', 'Eşitsizlikler'] },
        { name: 'Geometri ve Ölçme', topics: ['Doğrular ve Açılar', 'Çokgenler', 'Çember ve Daire', 'Alan ve Çevre Hesaplama'] },
        { name: 'Dönüşüm Geometrisi', topics: ['Öteleme', 'Yansıma', 'Dönme'] },
        { name: 'Veri Analizi', topics: ['Merkezi Eğilim ve Yayılım Ölçüleri', 'Çizgi Grafiği', 'Daire Grafiği'] },
    ],
};

const MAT_8: CurriculumEntry = {
    units: [
        { name: 'Çarpanlar ve Katlar', topics: ['Üslü İfadeler', 'Kareköklü İfadeler', 'EKOK ve EBOB Uygulamaları'] },
        { name: 'Cebirsel İfadeler', topics: ['Cebirsel İfadeler ve Özdeşlikler', 'Çarpanlara Ayırma', 'Doğrusal Denklemler'] },
        { name: 'Doğrusal Denklemler', topics: ['Birinci Dereceden İki Bilinmeyenli Denklemler', 'Denklem Sistemleri', 'Eşitsizlikler'] },
        { name: 'Üçgenler', topics: ['Üçgende Açı-Kenar Bağıntıları', 'Eşlik ve Benzerlik', 'Pisagor Bağıntısı'] },
        { name: 'Dönüşüm Geometrisi', topics: ['Öteleme', 'Yansıma', 'Dönme', 'Benzerlik Dönüşümü'] },
        { name: 'Geometrik Cisimler', topics: ['Prizmalar', 'Piramitler', 'Silindir, Koni ve Küre'] },
        { name: 'Olasılık', topics: ['Olasılık Kavramı', 'Olasılık Hesaplama', 'Bağımlı ve Bağımsız Olaylar'] },
        { name: 'Veri Analizi', topics: ['Histogram', 'Çan Eğrisi', 'Standart Sapma'] },
    ],
};

// ── TÜRKÇE ──────────────────────────────────────────────────────────
const TURKCE_4: CurriculumEntry = {
    units: [
        { name: 'Okuma', topics: ['Akıcı Okuma', 'Sözcükte Anlam', 'Cümlede Anlam', 'Metin Türleri'] },
        { name: 'Dil Bilgisi', topics: ['Ses Bilgisi', 'Büyük-Küçük Harf', 'Noktalama İşaretleri', 'Eş ve Zıt Anlamlı Kelimeler'] },
        { name: 'Yazma', topics: ['Hikâye Yazma', 'Mektup Yazma', 'Günlük Tutma'] },
        { name: 'Dinleme ve Konuşma', topics: ['Dinleme Kuralları', 'Sunum Yapma', 'Tartışma'] },
    ],
};

const TURKCE_5: CurriculumEntry = {
    units: [
        { name: 'Sözcükte Anlam', topics: ['Gerçek ve Mecaz Anlam', 'Eş - Zıt Anlamlılar', 'Deyimler ve Atasözleri'] },
        { name: 'Cümle Bilgisi', topics: ['Cümlede Anlam', 'Cümle Türleri', 'Özne ve Yüklem'] },
        { name: 'Paragraf', topics: ['Paragrafta Ana Düşünce', 'Paragrafta Yardımcı Düşünce', 'Paragraf Yapısı'] },
        { name: 'Dil Bilgisi', topics: ['İsimler', 'Sıfatlar', 'Zamirler', 'Zarflar'] },
        { name: 'Yazma', topics: ['Kompozisyon Yazma', 'Öykü Yazma', 'Şiir'] },
    ],
};

const TURKCE_6: CurriculumEntry = {
    units: [
        { name: 'Sözcükte Anlam', topics: ['Sözcüğün Anlam Özellikleri', 'Söz Sanatları', 'Deyimler'] },
        { name: 'Cümle Bilgisi', topics: ['Cümlenin Öğeleri', 'Fiil ve Fiilimsi', 'Cümle Çeşitleri'] },
        { name: 'Paragraf', topics: ['Paragrafın Yapısı', 'Ana Fikir ve Yardımcı Fikir', 'Paragrafta Anlam İlişkileri'] },
        { name: 'Dil Bilgisi', topics: ['Fiiller', 'Fiilimsi', 'Ek Fiil', 'Yapım ve Çekim Ekleri'] },
        { name: 'Metin Türleri', topics: ['Hikâye', 'Masal', 'Fabl', 'Şiir Türleri'] },
    ],
};

const TURKCE_7: CurriculumEntry = {
    units: [
        { name: 'Sözcükte Anlam', topics: ['Sözcük Yapısı', 'Söz Sanatları', 'Atasözleri ve Deyimler'] },
        { name: 'Cümle Bilgisi', topics: ['Cümlenin Öğeleri', 'Fiilimsiler', 'Cümle Türleri ve Anlamı'] },
        { name: 'Paragraf', topics: ['Paragrafta Anlam', 'Paragraf Tamamlama', 'Paragraf Oluşturma'] },
        { name: 'Dil Bilgisi', topics: ['Sözcükte Yapı', 'Cümle Öğeleri Derinleştirme', 'Anlatım Bozuklukları'] },
    ],
};

const TURKCE_8: CurriculumEntry = {
    units: [
        { name: 'Sözcükte Anlam', topics: ['Sözcük Türleri', 'Söz Sanatları', 'Anlam İlişkileri'] },
        { name: 'Cümle Bilgisi', topics: ['Cümle Öğeleri', 'Cümle Türleri', 'Anlatım Bozuklukları', 'Fiilimsiler'] },
        { name: 'Paragraf', topics: ['Paragrafta Ana Düşünce', 'Paragrafta Yapı', 'Paragraf Soruları'] },
        { name: 'Yazım ve Noktalama', topics: ['Yazım Kuralları', 'Noktalama İşaretleri', 'Yazım Hataları'] },
        { name: 'Metin Türleri', topics: ['Öğretici Metinler', 'Yazınsal Metinler', 'Deneme ve Makale'] },
    ],
};

// ── SOSYAL BİLGİLER ─────────────────────────────────────────────────
const SOSYAL_4: CurriculumEntry = {
    units: [
        { name: 'Birey ve Toplum', topics: ['Ben ve Ailem', 'Hak ve Sorumluluklar', 'Birlikte Yaşama'] },
        { name: 'Kültür ve Miras', topics: ['Millî Kültür Unsurları', 'Geçmişte ve Günümüzde Sosyal Yaşam'] },
        { name: 'İnsanlar, Yerler ve Çevreler', topics: ['Yaşadığımız Yer', 'Harita Bilgisi', 'Doğal Afetler'] },
        { name: 'Üretim, Dağıtım ve Tüketim', topics: ['Meslekler', 'İhtiyaçlar ve İstekler', 'Bilinçli Tüketici'] },
    ],
};

const SOSYAL_5: CurriculumEntry = {
    units: [
        { name: 'Birey ve Toplum', topics: ['Haklar ve Özgürlükler', 'Toplumsal Roller', 'Değerlerimiz'] },
        { name: 'Kültür ve Miras', topics: ['Uygarlıkları Öğreniyorum', 'Kültürel Etkileşim'] },
        { name: 'İnsanlar, Yerler ve Çevreler', topics: ['Bölgelerimiz', 'Haritada Yön ve Konum', 'İklim ve Bitki Örtüsü'] },
        { name: 'Bilim, Teknoloji ve Toplum', topics: ['Bilim ve Teknolojinin Gelişimi', 'Teknoloji ve Toplum'] },
        { name: 'Üretim, Dağıtım ve Tüketim', topics: ['Ekonomik Faaliyetler', 'Kaynakların Kullanımı'] },
        { name: 'Etkin Vatandaşlık', topics: ['Yönetim Biçimleri', 'Demokrasi'] },
    ],
};

const SOSYAL_6: CurriculumEntry = {
    units: [
        { name: 'Birey ve Toplum', topics: ['Sosyal Roller', 'Toplumsal Değişim', 'İletişim'] },
        { name: 'Kültür ve Miras', topics: ['İlk Türk Devletleri', 'İslamiyet ve Türkler', 'Orta Çağ Uygarlıkları'] },
        { name: 'İnsanlar, Yerler ve Çevreler', topics: ['Dünya\'nın Şekli ve Hareketleri', 'İklimler', 'Nüfus ve Yerleşme'] },
        { name: 'Üretim, Dağıtım ve Tüketim', topics: ['Kaynaklarımız', 'Meslekler ve Kariyer', 'Girişimcilik'] },
        { name: 'Etkin Vatandaşlık', topics: ['Yönetim Biçimleri', 'Cumhuriyet ve Demokrasi', 'Vatandaşlık Bilinci'] },
    ],
};

const SOSYAL_7: CurriculumEntry = {
    units: [
        { name: 'Birey ve Toplum', topics: ['İletişim ve Empati', 'Toplumsal Yapı', 'Aile ve Toplum'] },
        { name: 'Kültür ve Miras', topics: ['Osmanlı Devleti\'nin Kuruluşu', 'Osmanlı Yükselme Dönemi', 'Keşifler ve Reform'] },
        { name: 'İnsanlar, Yerler ve Çevreler', topics: ['Türkiye\'nin Coğrafi Bölgeleri', 'Göçler', 'Çevre Sorunları'] },
        { name: 'Bilim, Teknoloji ve Toplum', topics: ['İlk Çağ ve Orta Çağ Bilim İnsanları', 'Bilimsel Gelişmeler'] },
        { name: 'Üretim, Dağıtım ve Tüketim', topics: ['Vakıflar', 'Ticaret Yolları', 'Ekonomi ve Toplum'] },
        { name: 'Etkin Vatandaşlık', topics: ['Osmanlı Yönetim Yapısı', 'Hukuk ve Adalet'] },
    ],
};

// ── T.C. İNKILAP TARİHİ VE ATATÜRKÇÜLÜK (8. SINIF) ─────────────────
const INKILAP_8: CurriculumEntry = {
    units: [
        { name: 'Bir Kahraman Doğuyor', topics: ['Mustafa Kemal\'in Çocukluk ve Öğrenim Hayatı', 'Osmanlı Devleti\'nin Son Dönemleri', '31 Mart Olayı ve Trablusgarp Savaşı'] },
        { name: 'Millî Uyanış', topics: ['I. Dünya Savaşı', 'Mondros Ateşkes Antlaşması', 'İşgaller ve Cemiyetler', 'Kuva-yı Millîye'] },
        { name: 'Millî Bir Destan: Ya İstiklal Ya Ölüm!', topics: ['TBMM\'nin Açılması', 'Sakarya Meydan Muharebesi', 'Büyük Taarruz', 'Mudanya ve Lozan'] },
        { name: 'Atatürkçülük ve Türk İnkılabı', topics: ['Siyasi Alanda Yapılan İnkılaplar', 'Hukuk Alanında Yapılan İnkılaplar', 'Eğitim ve Kültür Alanında Yapılan İnkılaplar', 'Ekonomi Alanında Yapılan İnkılaplar', 'Toplumsal Alanda Yapılan İnkılaplar'] },
        { name: 'Atatürk İlkeleri', topics: ['Cumhuriyetçilik', 'Milliyetçilik', 'Halkçılık', 'Devletçilik', 'Laiklik', 'İnkılapçılık'] },
        { name: 'Atatürk Dönemi Türk Dış Politikası', topics: ['Hatay Meselesi', 'Montrö Boğazlar Sözleşmesi', 'Sadabat Paktı ve Balkan Antantı'] },
    ],
};

// ── İNGİLİZCE ───────────────────────────────────────────────────────
const ING_4: CurriculumEntry = {
    units: [
        { name: 'Classroom Rules', topics: ['Classroom Objects', 'Daily Instructions', 'Numbers 1-100'] },
        { name: 'My Family', topics: ['Family Members', 'Describing People', 'Possessives'] },
        { name: 'My Day', topics: ['Daily Routines', 'Time Expressions', 'Days of the Week'] },
        { name: 'Weather and Emotions', topics: ['Weather Conditions', 'Feelings', 'Seasons'] },
        { name: 'My Town', topics: ['Places in Town', 'Giving Directions', 'Prepositions of Place'] },
        { name: 'Food and Drinks', topics: ['Fruits and Vegetables', 'Meals', 'Likes and Dislikes'] },
    ],
};

const ING_5: CurriculumEntry = {
    units: [
        { name: 'Hello!', topics: ['Greetings', 'Introducing Yourself', 'Countries and Nationalities'] },
        { name: 'My Town', topics: ['Describing Places', 'Giving Directions', 'Asking for Directions'] },
        { name: 'Games and Hobbies', topics: ['Free Time Activities', 'Sports', 'Can/Can\'t'] },
        { name: 'My Daily Routine', topics: ['Simple Present Tense', 'Adverbs of Frequency', 'Time'] },
        { name: 'Health', topics: ['Body Parts', 'Illnesses', 'Advice'] },
        { name: 'Movies', topics: ['Types of Movies', 'Making Suggestions', 'Adjectives'] },
    ],
};

const ING_6: CurriculumEntry = {
    units: [
        { name: 'Life', topics: ['Present Simple vs Present Continuous', 'Routines', 'Free Time'] },
        { name: 'Yummy Breakfast', topics: ['Food and Drinks', 'Countable/Uncountable Nouns', 'Ordering Food'] },
        { name: 'Downtown', topics: ['Places', 'Prepositions', 'Imperatives'] },
        { name: 'Weather and Emotions', topics: ['Weather Forecast', 'Feelings', 'Comparatives'] },
        { name: 'At the Fair', topics: ['Describing Events', 'Past Simple', 'Regular/Irregular Verbs'] },
        { name: 'Democracy', topics: ['Rights and Responsibilities', 'Voting', 'Equality'] },
    ],
};

const ING_7: CurriculumEntry = {
    units: [
        { name: 'Appearance and Personality', topics: ['Physical Appearance', 'Personality Traits', 'Comparatives and Superlatives'] },
        { name: 'Sports', topics: ['Types of Sports', 'Expressing Preferences', 'Scores'] },
        { name: 'Biographies', topics: ['Past Simple Tense', 'Famous People', 'Biography Writing'] },
        { name: 'Wild Animals', topics: ['Animal Habitats', 'Describing Animals', 'Endangered Species'] },
        { name: 'Television', topics: ['TV Programmes', 'Preferences', 'Quantifiers'] },
        { name: 'Celebrations', topics: ['Special Days', 'Making Plans', 'Future Tense'] },
        { name: 'Environment', topics: ['Environmental Problems', 'Recycling', 'Obligation (must/should)'] },
    ],
};

const ING_8: CurriculumEntry = {
    units: [
        { name: 'Friendship', topics: ['Friendship Qualities', 'Present Perfect Tense', 'For/Since'] },
        { name: 'Teen Life', topics: ['Teenage Activities', 'Preferences', 'Connectors'] },
        { name: 'Cooking', topics: ['Recipes', 'Cooking Verbs', 'Imperatives', 'Countable/Uncountable'] },
        { name: 'Communication', topics: ['Technology', 'Internet Safety', 'Passive Voice'] },
        { name: 'The Internet', topics: ['Online Activities', 'Digital Literacy', 'Past Passive'] },
        { name: 'Adventures', topics: ['Past Continuous', 'When/While', 'Travel Vocabulary'] },
        { name: 'Tourism', topics: ['Holiday Plans', 'Describing Places', 'Future Plans'] },
        { name: 'Chores', topics: ['Household Chores', 'Requests and Offers', 'Modals'] },
    ],
};

// ── DİN KÜLTÜRÜ VE AHLAK BİLGİSİ ──────────────────────────────────
const DIN_4: CurriculumEntry = {
    units: [
        { name: 'Allah İnancı', topics: ['Allah\'ın Varlığı', 'Allah\'ın Sıfatları', 'Dua'] },
        { name: 'İbadet', topics: ['Namaz', 'Oruç', 'Temizlik'] },
        { name: 'Hz. Muhammed\'in Hayatı', topics: ['Doğumu ve Çocukluğu', 'Peygamber Oluşu', 'Örnek Davranışları'] },
        { name: 'Ahlak ve Değerler', topics: ['Doğruluk', 'Yardımseverlik', 'Saygı'] },
    ],
};

const DIN_5: CurriculumEntry = {
    units: [
        { name: 'Allah İnancı', topics: ['Allah\'ın Sıfatları', 'Evrendeki Düzen', 'Kader İnancı'] },
        { name: 'İbadet', topics: ['Namaz ve Çeşitleri', 'Oruç', 'Zekat ve Sadaka'] },
        { name: 'Hz. Muhammed\'in Hayatı', topics: ['Medine Dönemi', 'Veda Hutbesi', 'Aile Hayatı'] },
        { name: 'Kur\'an ve Yorumu', topics: ['Kur\'an\'ın Önemi', 'Sure ve Ayet', 'Kur\'an Okuma'] },
    ],
};

const DIN_6: CurriculumEntry = {
    units: [
        { name: 'Allah İnancı', topics: ['Tevhid İnancı', 'Allah\'ın 99 İsmi'] },
        { name: 'Peygamber ve İlahi Kitaplar', topics: ['Peygamberlere İman', 'Kutsal Kitaplar'] },
        { name: 'Ahlak ve Değerler', topics: ['Adalet', 'Merhamet', 'Sorumluluk', 'Hoşgörü'] },
        { name: 'İslam ve Sosyal Hayat', topics: ['Komşuluk İlişkileri', 'Çevre Bilinci', 'Sosyal Yardımlaşma'] },
    ],
};

const DIN_7: CurriculumEntry = {
    units: [
        { name: 'İnanç', topics: ['Melek İnancı', 'Ahiret İnancı', 'Kaza ve Kader'] },
        { name: 'İbadet', topics: ['Hac ve Umre', 'Kurban', 'Sadaka ve İnfak'] },
        { name: 'Kur\'an ve Hadis', topics: ['Kur\'an Ahlakı', 'Hadis ve Sünnet', 'Hz. Muhammed\'in Hadisleri'] },
        { name: 'İslam Düşüncesinde Ahlak', topics: ['Erdemler', 'İslam Ahlakının Temelleri'] },
    ],
};

const DIN_8: CurriculumEntry = {
    units: [
        { name: 'İnanç', topics: ['Kader ve Özgür İrade', 'Ölüm ve Ötesi'] },
        { name: 'Din ve Hayat', topics: ['Din ve Laiklik', 'Din ve Bilim', 'Farklı Dinler'] },
        { name: 'Ahlak ve Değerler', topics: ['Barış ve Kardeşlik', 'Hak ve Adalet', 'İslam\'da Bilgi ve Hikmet'] },
        { name: 'Hz. Muhammed\'in Örnekliği', topics: ['Veda Hutbesi', 'Evrensel Mesajlar', 'İnsan Hakları'] },
    ],
};

// ─── Ana Müfredat Haritası ────────────────────────────────────────

// key: "sınıf-ders" → CurriculumEntry
const FULL_CURRICULUM: Record<string, Record<string, CurriculumEntry>> = {
    '4': {
        'Matematik': MAT_4,
        'Türkçe': TURKCE_4,
        'Fen Bilimleri': FEN_4,
        'Sosyal Bilgiler': SOSYAL_4,
        'İngilizce': ING_4,
        'Din Kültürü ve Ahlak Bilgisi': DIN_4,
    },
    '5': {
        'Matematik': MAT_5,
        'Türkçe': TURKCE_5,
        'Fen Bilimleri': FEN_5,
        'Sosyal Bilgiler': SOSYAL_5,
        'İngilizce': ING_5,
        'Din Kültürü ve Ahlak Bilgisi': DIN_5,
    },
    '6': {
        'Matematik': MAT_6,
        'Türkçe': TURKCE_6,
        'Fen Bilimleri': FEN_6,
        'Sosyal Bilgiler': SOSYAL_6,
        'İngilizce': ING_6,
        'Din Kültürü ve Ahlak Bilgisi': DIN_6,
    },
    '7': {
        'Matematik': MAT_7,
        'Türkçe': TURKCE_7,
        'Fen Bilimleri': FEN_7,
        'Sosyal Bilgiler': SOSYAL_7,
        'İngilizce': ING_7,
        'Din Kültürü ve Ahlak Bilgisi': DIN_7,
    },
    '8': {
        'Matematik': MAT_8,
        'Türkçe': TURKCE_8,
        'Fen Bilimleri': FEN_8,
        'T.C. İnkılap Tarihi ve Atatürkçülük': INKILAP_8,
        'İngilizce': ING_8,
        'Din Kültürü ve Ahlak Bilgisi': DIN_8,
    },
};

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🎓 Atlas Derslik — MEB Müfredatı Tam Güncelleme');
    console.log('═══════════════════════════════════════════════');
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB bağlantısı kuruldu\n');

    // ── 1. Grade 4 ekle (yoksa) ────────────────────────────────
    console.log('📚 Sınıflar kontrol ediliyor...');
    for (const lvl of [4, 5, 6, 7, 8]) {
        const existing = await Grade.findOne({ level: lvl });
        if (!existing) {
            await Grade.create({ level: lvl, label: `${lvl}. Sınıf`, isActive: true });
            console.log(`  ✅ ${lvl}. Sınıf eklendi`);
        } else {
            console.log(`  ✓ ${lvl}. Sınıf mevcut`);
        }
    }
    console.log('');

    // ── 2. Tüm dersler ve müfredat ────────────────────────────
    let newSubjectCount = 0;
    let existingSubjectCount = 0;
    let newUnitCount = 0;
    let newTopicCount = 0;

    for (const [gradeStr, subjects] of Object.entries(FULL_CURRICULUM)) {
        const gradeLevel = parseInt(gradeStr);
        console.log(`\n📖 ${gradeLevel}. SINIF DERSLERİ`);
        console.log('─'.repeat(50));

        for (const [subjectName, curriculum] of Object.entries(subjects)) {
            // Subject oluştur veya getir
            let subject = await Subject.findOne({ name: subjectName, gradeLevel });
            if (!subject) {
                subject = await Subject.create({ name: subjectName, gradeLevel, isActive: true });
                newSubjectCount++;
                console.log(`  ✅ YENİ: ${subjectName}`);
            } else {
                existingSubjectCount++;
                console.log(`  ✓ MEVCUT: ${subjectName}`);
            }

            // Bu dersin mevcut ünitelerini kontrol et
            const existingUnits = await Unit.find({ subjectId: subject._id });
            if (existingUnits.length > 0) {
                console.log(`     → ${existingUnits.length} ünite zaten mevcut, atlanıyor`);
                continue;
            }

            // Ünite ve konuları ekle
            for (let ui = 0; ui < curriculum.units.length; ui++) {
                const unitData = curriculum.units[ui];
                const unit = await Unit.create({
                    name: unitData.name,
                    subjectId: subject._id,
                    order: ui + 1,
                });
                newUnitCount++;

                for (let ti = 0; ti < unitData.topics.length; ti++) {
                    await Topic.create({
                        name: unitData.topics[ti],
                        unitId: unit._id,
                        order: ti + 1,
                    });
                    newTopicCount++;
                }
                console.log(`     → ${unitData.name} (${unitData.topics.length} konu)`);
            }
        }
    }

    // ── 3. Sonuç ──────────────────────────────────────────────
    const totalSubjects = await Subject.countDocuments();
    const totalUnits = await Unit.countDocuments();
    const totalTopics = await Topic.countDocuments();

    console.log('\n');
    console.log('═══════════════════════════════════════════════');
    console.log('✅ MEB MÜFREDATI GÜNCELLEMESİ TAMAMLANDI');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log(`  Yeni Dersler: ${newSubjectCount}`);
    console.log(`  Mevcut Dersler: ${existingSubjectCount}`);
    console.log(`  Yeni Üniteler: ${newUnitCount}`);
    console.log(`  Yeni Konular: ${newTopicCount}`);
    console.log('');
    console.log(`  TOPLAM: ${totalSubjects} ders, ${totalUnits} ünite, ${totalTopics} konu`);
    console.log('');
    console.log('  Sınıflar: 4, 5, 6, 7, 8');
    console.log('  Dersler:');
    console.log('    4-7: Matematik, Türkçe, Fen Bilimleri, Sosyal Bilgiler, İngilizce, Din Kültürü');
    console.log('    8:   Matematik, Türkçe, Fen Bilimleri, T.C. İnkılap Tarihi, İngilizce, Din Kültürü');
    console.log('');

    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Hata:', err);
    process.exit(1);
});
