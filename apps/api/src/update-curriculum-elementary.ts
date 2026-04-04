/**
 * Atlas Derslik — İlkokul Müfredatı (1-3. Sınıf)
 * MEB 2025-2026 müfredatına uygun ilkokul dersleri ekler.
 *
 * 1. Sınıf: Türkçe, Matematik, Hayat Bilgisi, İngilizce
 * 2. Sınıf: Türkçe, Matematik, Hayat Bilgisi, İngilizce
 * 3. Sınıf: Türkçe, Matematik, Hayat Bilgisi, Fen Bilimleri, İngilizce
 *
 * Usage: cd apps/api && npx ts-node src/update-curriculum-elementary.ts
 */

import mongoose, { Types } from 'mongoose';

const MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb+srv://atlasderslik:2002%2E2002@atlasderslik.7qapnxz.mongodb.net/atlas-derslik?retryWrites=true&w=majority&appName=atlasderslik';

const gradeSchema = new mongoose.Schema(
    { level: { type: Number, required: true }, label: { type: String, default: '' }, isActive: { type: Boolean, default: true } },
    { timestamps: true },
);
const subjectSchema = new mongoose.Schema(
    { name: { type: String, required: true }, gradeLevel: { type: Number, required: true }, icon: String, isActive: { type: Boolean, default: true }, zoomUrl: { type: String, default: '' }, zoomMeetingId: { type: String, default: '' }, zoomPasscode: { type: String, default: '' } },
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

interface CurriculumEntry { units: { name: string; topics: string[] }[] }

// ── HAYAT BİLGİSİ ──────────────────────────────────────────────
const HAYAT_1: CurriculumEntry = {
    units: [
        { name: 'Ben ve Okulum', topics: ['Kendimi Tanıyorum', 'Okulumu Tanıyorum', 'Sınıf Kuralları', 'Arkadaşlarım'] },
        { name: 'Ailem ve Evim', topics: ['Aile Üyelerim', 'Evimiz', 'Aile İçi Görevler', 'Akrabalarım'] },
        { name: 'Sağlığım', topics: ['Temizlik Alışkanlıkları', 'Beslenme', 'Doğru Oturuş ve Duruş'] },
        { name: 'Güvenliğim', topics: ['Trafik Kuralları', 'Ev Kazaları', 'Güvenli Oyun'] },
        { name: 'Doğa ve Çevre', topics: ['Canlı ve Cansızlar', 'Mevsimler', 'Doğayı Koruma'] },
        { name: 'Ülkemiz', topics: ['Bayrak ve İstiklal Marşı', 'Atatürk', 'Millî Bayramlar'] },
    ],
};

const HAYAT_2: CurriculumEntry = {
    units: [
        { name: 'Ben ve Toplum', topics: ['Bireysel Farklılıklar', 'Toplumsal Kurallar', 'İletişim', 'Paylaşma ve Yardımlaşma'] },
        { name: 'Ailem ve Çevrem', topics: ['Aile İçi İletişim', 'Komşuluk İlişkileri', 'Mahallemizdeki Kurumlar'] },
        { name: 'Sağlıklı Yaşam', topics: ['Sağlıklı Beslenme', 'Düzenli Uyku', 'Spor ve Egzersiz', 'Hastalıklardan Korunma'] },
        { name: 'Doğada Hayat', topics: ['Bitkiler', 'Hayvanlar', 'Su ve Toprak', 'Hava Kirliliği'] },
        { name: 'Ülkemizi Tanıyalım', topics: ['Yakın Çevremiz', 'İlimiz ve İlçemiz', 'Ülkemizin Güzellikleri'] },
        { name: 'Milli Değerlerimiz', topics: ['Atatürk\'ün Hayatı', 'Cumhuriyet ve Demokrasi', 'Tarihî Mekânlar'] },
    ],
};

const HAYAT_3: CurriculumEntry = {
    units: [
        { name: 'Birey ve Toplum', topics: ['Hak ve Sorumluluklar', 'Toplumda İletişim', 'Farklılıklara Saygı', 'Empati'] },
        { name: 'Sağlık ve Güvenlik', topics: ['İlk Yardım Bilgisi', 'Güvenli İnternet', 'Afetlere Hazırlık', 'Madde Bağımlılığı'] },
        { name: 'Doğa ve Çevre', topics: ['Ekosistem', 'Geri Dönüşüm', 'Enerji Tasarrufu', 'Çevre Kirliliği'] },
        { name: 'Ülkemiz ve Dünya', topics: ['Türkiye\'nin Coğrafyası', 'Kültürel Zenginlikler', 'Dünya Üzerindeki Ülkeler'] },
        { name: 'Bilim ve Teknoloji', topics: ['Bilimsel Düşünme', 'Basit Deney Yapma', 'Teknoloji ve Yaşam'] },
    ],
};

// ── MATEMATİK ───────────────────────────────────────────────────
const MAT_1: CurriculumEntry = {
    units: [
        { name: 'Sayılar', topics: ['1-20 Arası Sayılar', 'Sayı Okuma ve Yazma', 'Sıralama ve Karşılaştırma'] },
        { name: 'Toplama', topics: ['Toplama İşlemi', 'Eldeli Toplama', 'Problem Çözme'] },
        { name: 'Çıkarma', topics: ['Çıkarma İşlemi', 'Onluk Bozmadan Çıkarma', 'Problem Çözme'] },
        { name: 'Geometri', topics: ['Şekilleri Tanıyalım', 'Geometrik Cisimler', 'Örüntüler'] },
        { name: 'Ölçme', topics: ['Uzunluk Ölçme', 'Zaman', 'Para'] },
    ],
};

const MAT_2: CurriculumEntry = {
    units: [
        { name: 'Sayılar', topics: ['100\'e Kadar Sayılar', 'Basamak Değeri', 'Sayı Doğrusu'] },
        { name: 'Toplama ve Çıkarma', topics: ['İki Basamaklı Toplama', 'İki Basamaklı Çıkarma', 'Zihinden İşlem'] },
        { name: 'Çarpma', topics: ['Çarpma Kavramı', 'Çarpım Tablosu (2-5)', 'Çarpma Problemleri'] },
        { name: 'Geometri', topics: ['Düzlem Şekiller', 'Simetri', 'Örüntü ve Süsleme'] },
        { name: 'Ölçme', topics: ['Uzunluk (cm-m)', 'Tartma (gr-kg)', 'Saat Okuma'] },
        { name: 'Veri', topics: ['Tablo Okuma', 'Basit Grafik'] },
    ],
};

const MAT_3: CurriculumEntry = {
    units: [
        { name: 'Sayılar', topics: ['1000\'e Kadar Sayılar', 'Basamak Değeri', 'Sayıları Karşılaştırma ve Sıralama'] },
        { name: 'Toplama ve Çıkarma', topics: ['Üç Basamaklı Toplama', 'Üç Basamaklı Çıkarma', 'Tahmin'] },
        { name: 'Çarpma ve Bölme', topics: ['Çarpım Tablosu (6-10)', 'Bölme Kavramı', 'Bölme İşlemi'] },
        { name: 'Kesirler', topics: ['Kesir Kavramı', 'Basit Kesirler', 'Yarım-Çeyrek'] },
        { name: 'Geometri', topics: ['Açı Kavramı', 'Çokgenler', 'Çevre Hesaplama'] },
        { name: 'Ölçme', topics: ['Uzunluk (mm-cm-m-km)', 'Alan Kavramı', 'Litre', 'Zaman'] },
        { name: 'Veri', topics: ['Tablo ve Grafik Oluşturma', 'Sıklık Tablosu'] },
    ],
};

// ── TÜRKÇE ──────────────────────────────────────────────────────
const TURKCE_1: CurriculumEntry = {
    units: [
        { name: 'İlk Okuma Yazma', topics: ['Harfleri Tanıma', 'Hece Oluşturma', 'Kelime Okuma', 'Cümle Okuma'] },
        { name: 'Dinleme', topics: ['Dinleme Kuralları', 'Masal Dinleme', 'Hikâye Anlatma'] },
        { name: 'Konuşma', topics: ['Kendini Tanıtma', 'Soru Sorma', 'İstek Bildirme'] },
        { name: 'Yazma', topics: ['Harf Yazma', 'Kelime Yazma', 'Kısa Cümle Yazma'] },
    ],
};

const TURKCE_2: CurriculumEntry = {
    units: [
        { name: 'Okuma', topics: ['Akıcı Okuma', 'Vurgu ve Tonlama', 'Metin Anlama'] },
        { name: 'Sözcük Bilgisi', topics: ['Eş Anlamlı Sözcükler', 'Zıt Anlamlı Sözcükler', 'Sözcük Dağarcığı'] },
        { name: 'Dil Bilgisi', topics: ['Büyük Harf Kuralları', 'Noktalama İşaretleri', 'Cümle Oluşturma'] },
        { name: 'Yazma', topics: ['Dikte', 'Kısa Metin Yazma', 'Mektup'] },
        { name: 'Dinleme ve Konuşma', topics: ['Dinlediğini Anlama', 'Duygu ve Düşünce Bildirme', 'Şiir Okuma'] },
    ],
};

const TURKCE_3: CurriculumEntry = {
    units: [
        { name: 'Okuma', topics: ['Sesli Okuma', 'Sessiz Okuma', 'Okuduğunu Anlama', 'Metin Türlerini Tanıma'] },
        { name: 'Sözcük Bilgisi', topics: ['Gerçek ve Mecaz Anlam', 'Eş Sesli Sözcükler', 'Atasözleri'] },
        { name: 'Dil Bilgisi', topics: ['İsim', 'Sıfat', 'Fiil', 'Yazım Kuralları'] },
        { name: 'Yazma', topics: ['Hikâye Yazma', 'Anı Yazma', 'Özet Çıkarma'] },
    ],
};

// ── İNGİLİZCE ───────────────────────────────────────────────────
const ING_1: CurriculumEntry = {
    units: [
        { name: 'Greetings', topics: ['Hello - Goodbye', 'What\'s your name?', 'How are you?'] },
        { name: 'Numbers and Colors', topics: ['Numbers 1-10', 'Colors', 'Counting Objects'] },
        { name: 'My Body', topics: ['Body Parts', 'Actions (stand up, sit down)', 'Simon Says'] },
        { name: 'Animals', topics: ['Farm Animals', 'Pet Animals', 'Animal Sounds'] },
    ],
};

const ING_2: CurriculumEntry = {
    units: [
        { name: 'My Friends', topics: ['Introductions', 'Age', 'Likes and Dislikes'] },
        { name: 'My Classroom', topics: ['Classroom Objects', 'Instructions', 'Where is it?'] },
        { name: 'My Family', topics: ['Family Members', 'He/She', 'Possessives'] },
        { name: 'Food', topics: ['Fruits', 'Vegetables', 'I like / I don\'t like'] },
        { name: 'Weather', topics: ['Sunny, Rainy, Cloudy', 'Seasons', 'What\'s the weather like?'] },
    ],
};

const ING_3: CurriculumEntry = {
    units: [
        { name: 'My Daily Routine', topics: ['Wake up, Eat, Go to School', 'Time (o\'clock)', 'What time do you...?'] },
        { name: 'My Home', topics: ['Rooms', 'Furniture', 'There is / There are'] },
        { name: 'Transportation', topics: ['Vehicles', 'How do you go to school?', 'By car/bus/walk'] },
        { name: 'Hobbies', topics: ['Sports', 'Activities', 'Can / Can\'t'] },
        { name: 'Clothes', topics: ['Clothing Items', 'What are you wearing?', 'Colors and Clothes'] },
    ],
};

// ── FEN BİLİMLERİ (3. Sınıf) ───────────────────────────────────
const FEN_3: CurriculumEntry = {
    units: [
        { name: 'Canlılar Dünyası', topics: ['Canlı ve Cansız Varlıklar', 'Bitkileri Tanıyalım', 'Hayvanları Tanıyalım'] },
        { name: 'Beş Duyumuz', topics: ['Görme', 'İşitme', 'Dokunma', 'Tat Alma', 'Koklama'] },
        { name: 'Kuvvet ve Hareket', topics: ['İtme ve Çekme', 'Mıknatıs', 'Hareketli Cisimler'] },
        { name: 'Elektrik', topics: ['Elektriğin Önemi', 'Güvenli Elektrik Kullanımı', 'Basit Elektrik Devresi'] },
        { name: 'Dünyamız ve Gökyüzü', topics: ['Dünya', 'Güneş', 'Ay', 'Gece ve Gündüz'] },
    ],
};

// ─── Tam Müfredat Haritası ──────────────────────────────────────
const CURRICULUM: Record<string, Record<string, CurriculumEntry>> = {
    '1': { 'Türkçe': TURKCE_1, 'Matematik': MAT_1, 'Hayat Bilgisi': HAYAT_1, 'İngilizce': ING_1 },
    '2': { 'Türkçe': TURKCE_2, 'Matematik': MAT_2, 'Hayat Bilgisi': HAYAT_2, 'İngilizce': ING_2 },
    '3': { 'Türkçe': TURKCE_3, 'Matematik': MAT_3, 'Hayat Bilgisi': HAYAT_3, 'Fen Bilimleri': FEN_3, 'İngilizce': ING_3 },
};

async function main() {
    console.log('🏫 Atlas Derslik — İlkokul Müfredatı (1-3. Sınıf)');
    console.log('═══════════════════════════════════════════════');
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB bağlantısı kuruldu\n');

    // Grade 1-3 ekle
    for (const lvl of [1, 2, 3]) {
        const existing = await Grade.findOne({ level: lvl });
        if (!existing) {
            await Grade.create({ level: lvl, label: `${lvl}. Sınıf`, isActive: true });
            console.log(`  ✅ ${lvl}. Sınıf eklendi`);
        } else {
            console.log(`  ✓ ${lvl}. Sınıf mevcut`);
        }
    }

    let newSubjects = 0, newUnits = 0, newTopics = 0;

    for (const [gradeStr, subjects] of Object.entries(CURRICULUM)) {
        const gradeLevel = parseInt(gradeStr);
        console.log(`\n📖 ${gradeLevel}. SINIF`);
        console.log('─'.repeat(40));

        for (const [subjectName, curriculum] of Object.entries(subjects)) {
            let subject = await Subject.findOne({ name: subjectName, gradeLevel });
            if (!subject) {
                subject = await Subject.create({ name: subjectName, gradeLevel, isActive: true });
                newSubjects++;
                console.log(`  ✅ ${subjectName}`);
            } else {
                console.log(`  ✓ ${subjectName} (mevcut)`);
                continue;
            }
            for (let ui = 0; ui < curriculum.units.length; ui++) {
                const u = curriculum.units[ui];
                const unit = await Unit.create({ name: u.name, subjectId: subject._id, order: ui + 1 });
                newUnits++;
                for (let ti = 0; ti < u.topics.length; ti++) {
                    await Topic.create({ name: u.topics[ti], unitId: unit._id, order: ti + 1 });
                    newTopics++;
                }
            }
        }
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ İLKOKUL MÜFREDATı TAMAMLANDI');
    console.log(`  Yeni Dersler: ${newSubjects}`);
    console.log(`  Yeni Üniteler: ${newUnits}`);
    console.log(`  Yeni Konular: ${newTopics}`);
    console.log('═══════════════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => { console.error('❌', err); process.exit(1); });
