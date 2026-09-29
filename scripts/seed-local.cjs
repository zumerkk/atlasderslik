#!/usr/bin/env node
'use strict';

/**
 * Isolated, repeatable local demo data. This script never reads .env / MONGO_URI.
 * Run: ATLAS_LOCAL_MONGO_URI=mongodb://127.0.0.1:27017/atlas_local node scripts/seed-local.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const apiRequire = createRequire(path.join(root, 'apps/api/package.json'));
const mongoose = apiRequire('mongoose');
const bcrypt = apiRequire('bcrypt');
const localDirectory = path.join(root, '.atlas-local');
const credentialsPath = path.join(localDirectory, 'credentials.json');

const accountDefinitions = [
  { role: 'STUDENT', email: 'ogrenci@atlas.local', firstName: 'Deniz', lastName: 'Deneme' },
  { role: 'PARENT', email: 'veli@atlas.local', firstName: 'Ayşe', lastName: 'Deneme' },
  { role: 'TEACHER', email: 'ogretmen@atlas.local', firstName: 'Elif', lastName: 'Deneme' },
  { role: 'ADMIN', email: 'admin@atlas.local', firstName: 'Atlas', lastName: 'Yerel' },
];

function validateLocalUri(value) {
  let uri;
  try { uri = new URL(value); } catch { throw new Error('Geçersiz yerel MongoDB adresi.'); }
  if (uri.protocol !== 'mongodb:' || !['127.0.0.1', 'localhost', '[::1]'].includes(uri.hostname)
    || uri.pathname !== '/atlas_local' || uri.username || uri.password || uri.search || uri.hash) {
    throw new Error('Bu komut yalnızca yerel bilgisayardaki atlas_local veritabanına yazabilir.');
  }
  return value;
}

function id(key) {
  return new mongoose.Types.ObjectId(crypto.createHash('sha256').update(`atlas-local:v1:${key}`).digest('hex').slice(0, 24));
}

function loadCredentials() {
  fs.mkdirSync(localDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(localDirectory, 0o700);
  if (fs.existsSync(credentialsPath)) {
    if (!fs.lstatSync(credentialsPath).isFile()) throw new Error('Yerel parola dosyası normal bir dosya olmalıdır.');
    const existing = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    if (existing.version !== 1 || !Array.isArray(existing.accounts) || existing.accounts.length !== accountDefinitions.length) {
      throw new Error('Yerel parola dosyasının biçimi geçersiz; hesaplara dokunulmadı.');
    }
    for (const definition of accountDefinitions) {
      const account = existing.accounts.find((entry) => entry.email === definition.email && entry.role === definition.role);
      if (!account || typeof account.password !== 'string' || account.password.length < 16) {
        throw new Error('Yerel parola dosyasında eksik/geçersiz hesap var; hesaplara dokunulmadı.');
      }
    }
    fs.chmodSync(credentialsPath, 0o600);
    return existing;
  }
  const credentials = {
    version: 1,
    createdAt: new Date().toISOString(),
    accounts: accountDefinitions.map((account) => ({ ...account, password: `Atlas-${crypto.randomBytes(12).toString('base64url')}` })),
  };
  fs.writeFileSync(credentialsPath, `${JSON.stringify(credentials, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return credentials;
}

function buildDataset(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now);
  const part = (name) => Number(parts.find((entry) => entry.type === name).value);
  const year = part('year');
  const month = part('month');
  const day = part('day');
  const localDate = (monthOffset, date, hour = 12) => new Date(Date.UTC(year, month - 1 + monthOffset, date, hour - 3));
  const historic = localDate(-3, 1);
  const current = (daysAgo) => new Date(Math.min(localDate(0, Math.max(1, day - daysAgo)).getTime(), now.getTime() - 1000));
  const studentId = id('user:STUDENT');
  const parentId = id('user:PARENT');
  const teacherId = id('user:TEACHER');
  const gradeId = id('grade:6');
  const mathId = id('subject:math');
  const turkishId = id('subject:turkish');
  const scienceId = id('subject:science');
  const rows = {};
  function add(collection, key, data, date = historic) {
    const row = { _id: id(key), ...data, createdAt: date, updatedAt: date };
    (rows[collection] ||= []).push(row);
    return row;
  }

  add('grades', 'grade:6', { level: 6, label: 'ATLAS • Yerel Deneme', isActive: true });
  const subjects = [
    ['math', 'Matematik', 'calculator'],
    ['turkish', 'Türkçe', 'book-open'],
    ['science', 'Fen Bilimleri', 'flask-conical'],
  ];
  for (const [key, name, icon] of subjects) {
    add('subjects', `subject:${key}`, { name, icon, gradeLevel: 6, gradeId, isActive: true, zoomUrl: '', zoomMeetingId: '', zoomPasscode: '' });
    add('teacherassignments', `teacher:${key}`, { teacherId, gradeId, subjectId: id(`subject:${key}`), notes: 'Yalnızca yerel deneme verisi.' });
  }
  add('studentenrollments', 'enrollment', { studentId, parentId, gradeId, enrollmentDate: historic });

  const topicDefinitions = [
    ['fractions', 'math', 'Sayılar ve İşlemler', 'Kesirlerle işlemler', 'Kesirlerle toplama, çıkarma ve çarpma işlemleri yapar.'],
    ['natural', 'math', 'Doğal Sayılar', 'Çarpanlar ve katlar', 'Doğal sayıların çarpanlarını ve katlarını belirler.'],
    ['reading', 'turkish', 'Okuma', 'Paragrafta anlam', 'Metnin ana düşüncesini ve yardımcı düşüncelerini belirler.'],
    ['systems', 'science', 'Vücudumuzdaki Sistemler', 'Destek ve hareket sistemi', 'Destek ve hareket sisteminin yapı ve görevlerini açıklar.'],
  ];
  for (const [key, subject, unitName, name, objective] of topicDefinitions) {
    add('units', `unit:${key}`, { name: unitName, subjectId: id(`subject:${subject}`), order: rows.units?.length || 0 });
    add('topics', `topic:${key}`, { name, objective, unitId: id(`unit:${key}`), order: 0 });
  }

  const questionSets = {
    fractions: [
      ['1/2 + 1/4 işleminin sonucu kaçtır?', ['3/4', '2/6', '1/8', '1/4'], 0],
      ['3/4 − 1/4 işleminin sonucu kaçtır?', ['1', '1/2', '1/4', '3/8'], 1],
      ['2/3 kesrinin 1/2 ile çarpımı kaçtır?', ['2/5', '1/6', '1/3', '3/2'], 2],
      ['5/6 − 1/3 işleminin sonucu kaçtır?', ['1/6', '2/3', '5/3', '1/2'], 3],
      ['3/5 + 1/10 işleminin sonucu kaçtır?', ['7/10', '4/15', '2/5', '3/10'], 0],
      ['Bir sınıftaki 24 öğrencinin 1/4’ü gözlük takıyor. Kaç öğrenci gözlük takar?', ['4', '6', '8', '12'], 1],
      ['2/3 kesrine denk olan kesir hangisidir?', ['3/4', '2/6', '4/6', '6/4'], 2],
      ['1 tam 1/2 kesrinin bileşik kesir gösterimi hangisidir?', ['1/2', '2/3', '2/2', '3/2'], 3],
      ['3/4 kesrinin ondalık gösterimi hangisidir?', ['0,75', '0,34', '0,25', '1,25'], 0],
      ['1/3 + 1/6 işleminin sonucu kaçtır?', ['2/9', '1/2', '1/9', '2/3'], 1],
    ],
    natural: [
      ['12 sayısının pozitif çarpanlarından biri değildir?', ['1', '3', '5', '6'], 2],
      ['6 ve 8 sayılarının en küçük ortak katı kaçtır?', ['12', '16', '18', '24'], 3],
      ['18 ve 24 sayılarının en büyük ortak böleni kaçtır?', ['6', '8', '12', '18'], 0],
      ['Aşağıdakilerden hangisi asal sayıdır?', ['21', '23', '27', '33'], 1],
      ['30 sayısının asal çarpanları hangi seçenekte verilmiştir?', ['2, 3, 5', '2, 5, 7', '3, 5, 9', '1, 2, 15'], 0],
      ['Dört basamaklı 1254 sayısı hangisine kalansız bölünür?', ['5', '3', '4', '10'], 1],
    ],
    reading: [
      ['“Her gün birkaç sayfa okumak, zamanla büyük bir bilgi birikimi sağlar.” cümlesinin ana düşüncesi hangisidir?', ['Okumak yalnızca boş zamanda yapılır.', 'Kitaplar her zaman uzundur.', 'Düzenli küçük çalışmalar gelişim sağlar.', 'Bilgi birikimi bir günde oluşur.'], 2],
      ['“Yağmur başladığı için pikniği erteledik.” cümlesinde hangi anlam ilişkisi vardır?', ['Karşılaştırma', 'Amaç-sonuç', 'Koşul', 'Neden-sonuç'], 3],
      ['“Bu kitap önceki kitaptan daha sürükleyici.” cümlesinde hangi anlam vardır?', ['Karşılaştırma', 'Koşul', 'Uyarı', 'Tahmin'], 0],
      ['Bir metnin ana düşüncesi nedir?', ['Metindeki ilk kelime', 'Yazarın okuyucuya vermek istediği temel ileti', 'Metnin sayfa sayısı', 'Kahramanın yaşı'], 1],
      ['“Başarı için planlı çalışmalıyız.” cümlesindeki “planlı” sözcüğünün anlamı hangisidir?', ['Rastgele', 'Düzensiz', 'Önceden düzenlenmiş', 'Acele'], 2],
      ['“Doğayı korumak hepimizin sorumluluğudur.” cümlesine uygun başlık hangisidir?', ['Şehir Trafiği', 'Sporun Önemi', 'Yeni Teknolojiler', 'Doğaya Karşı Sorumluluğumuz'], 3],
      ['“Kitabı bitirirsen birlikte değerlendirebiliriz.” cümlesinde hangi anlam vardır?', ['Koşul', 'Karşılaştırma', 'Abartma', 'Benzetme'], 0],
      ['“İnce ince yağan yağmur toprağı besliyordu.” cümlesinde hangi duyuya seslenilmiştir?', ['Tatma', 'Görme', 'Koklama', 'İşitme'], 1],
      ['Bir paragrafta örnek verilmesinin temel amacı nedir?', ['Metni belirsizleştirmek', 'Konudan uzaklaşmak', 'Düşünceyi somutlaştırmak', 'Başlığı gizlemek'], 2],
      ['“Tasarruf etmek, kaynakları gerektiği kadar kullanmaktır.” cümlesinde hangi anlatım yolu vardır?', ['Öyküleme', 'Kişileştirme', 'Karşılaştırma', 'Tanımlama'], 3],
    ],
    systems: [
      ['Vücudumuza şekil veren ve iç organları koruyan yapı hangisidir?', ['İskelet', 'Akciğer', 'Mide', 'Deri gözenekleri'], 0],
      ['Kemikleri birbirine bağlayan yapılara ne ad verilir?', ['Kas', 'Eklem', 'Sinir', 'Damar'], 1],
      ['Kafatası kemikleri arasında çoğunlukla hangi eklem tipi bulunur?', ['Oynar', 'Yarı oynar', 'Oynamaz', 'Esnek'], 2],
      ['Kol ve bacaklarımızın hareketinde görev alan kas türü hangisidir?', ['Düz kas', 'Kalp kası', 'Mide kası', 'Çizgili kas'], 3],
      ['Kemik sağlığını destekleyen mineral hangisidir?', ['Kalsiyum', 'Cıva', 'Kurşun', 'Alüminyum'], 0],
      ['Aşağıdakilerden hangisi uzun kemiklere örnektir?', ['Kafatası', 'Uyluk kemiği', 'Kaburga', 'Kürek kemiği'], 1],
      ['Bir kas kasılırken kendisine zıt çalışan kas genellikle ne yapar?', ['Kemikleşir', 'Kısalır', 'Gevşer', 'Yok olur'], 2],
      ['Omurlar arasındaki eklemler hangi gruptadır?', ['Oynamaz', 'Oynar', 'Tek yönlü', 'Yarı oynar'], 3],
      ['Destek ve hareket sistemi sağlığını koruyan davranış hangisidir?', ['Düzenli ve uygun egzersiz', 'Sürekli ağır yük taşımak', 'Yanlış duruş', 'Hareketsiz kalmak'], 0],
      ['Kasların kemiklere tutunmasını sağlayan yapı hangisidir?', ['Eklem sıvısı', 'Tendon', 'Kıkırdak', 'Omur'], 1],
    ],
  };
  for (const [topicKey, questions] of Object.entries(questionSets)) {
    const definition = topicDefinitions.find(([key]) => key === topicKey);
    questions.forEach(([text, options, correctAnswer], index) => add('questions', `question:${topicKey}:${index}`, {
      text, options, correctAnswer, objective: definition[4], gradeLevel: 6,
      subjectId: id(`subject:${definition[1]}`), unitId: id(`unit:${topicKey}`), topicId: id(`topic:${topicKey}`),
      teacherId, difficulty: 'MEDIUM', imageUrl: '', type: 'TEST', optionImages: [],
    }));
  }

  function test(key, title, subjectId, questionKeys, outcomes, completedAt) {
    const questionIds = questionKeys.map(([topic, number]) => id(`question:${topic}:${number}`));
    const record = add('tests', `test:${key}`, { title, description: 'Yerel deneme hesabı için örnek eğitim içeriği.', gradeLevel: 6, subjectId, teacherId, questionIds, duration: 20, isActive: true });
    if (!outcomes) return;
    const answers = {};
    questionKeys.forEach(([topic, number], index) => {
      const correct = questionSets[topic][number][2];
      answers[questionIds[index].toString()] = outcomes[index] === 'C' ? correct : outcomes[index] === 'W' ? (correct + 1) % 4 : -1;
    });
    const count = (kind) => outcomes.filter((outcome) => outcome === kind).length;
    add('testresults', `result:${key}`, { testId: record._id, studentId, answers, score: Math.round(count('C') / questionIds.length * 100), correctCount: count('C'), wrongCount: count('W'), emptyCount: count('E'), durationSeconds: 720 }, completedAt);
  }
  const keys = (topic, amount) => Array.from({ length: amount }, (_, index) => [topic, index]);
  test('previous-math', 'Geçen ay • Matematik değerlendirmesi (yerel)', mathId, keys('fractions', 10), ['C', 'W', 'C', 'W', 'C', 'W', 'W', 'C', 'E', 'E'], localDate(-1, 15));
  test('previous-turkish', 'Geçen ay • Türkçe değerlendirmesi (yerel)', turkishId, keys('reading', 10), ['C', 'C', 'W', 'C', 'C', 'W', 'C', 'W', 'C', 'E'], localDate(-1, 20));
  test('fractions', 'Kesirlerle işlemler • Konu taraması (yerel)', mathId, keys('fractions', 10), ['C', 'W', 'C', 'W', 'E', 'W', 'C', 'W', 'E', 'C'], current(6));
  test('natural', 'Çarpanlar ve katlar • Pekiştirme (yerel)', mathId, keys('natural', 6), ['C', 'C', 'C', 'C', 'W', 'C'], current(4));
  test('reading', 'Paragrafta anlam • Konu taraması (yerel)', turkishId, keys('reading', 10), ['C', 'C', 'C', 'C', 'C', 'C', 'W', 'C', 'C', 'C'], current(2));
  test('systems', 'Destek ve hareket • Konu taraması (yerel)', scienceId, keys('systems', 10), ['C', 'W', 'C', 'C', 'C', 'W', 'C', 'E', 'C', 'C'], current(1));
  test('practice', 'Kesirler • Kendini dene (yerel)', mathId, keys('fractions', 5));

  const homework = [
    ['fractions', 'Kesirlerde payda eşitleme (yerel)', mathId, localDate(0, day + 2), 'Paydaları farklı beş kesir toplama sorusu çöz. Her adımda neden payda eşitlediğini yaz.'],
    ['reading', 'Okuduğunu anlat (yerel)', turkishId, localDate(0, day + 4), 'Seçtiğin kısa bir metnin ana düşüncesini ve iki yardımcı düşüncesini yaz.'],
    ['science', 'İskeletin görevleri (yerel)', scienceId, current(3), 'İskeletin üç görevini ve sağlıklı duruş için iki öneriyi yaz.'],
  ];
  homework.forEach(([key, title, subjectId, dueDate, instructions]) => add('assignments', `assignment:${key}`, { title, description: 'Bu çalışma yerel deneme verisidir.', instructions, dueDate, subjectId, gradeLevel: 6, gradeId, teacherId, maxScore: 100, attachments: [], isOpticTest: false, opticOptionsCount: 4, answerKey: [] }));
  add('submissions', 'submission:science', { assignmentId: id('assignment:science'), studentId, fileUrl: '', fileUrls: [], note: 'İskeletimiz vücudumuzu destekler, organları korur ve hareket etmemize yardımcı olur.', grade: 85, feedback: 'Görevleri doğru açıklamışsın. Duruş önerilerini örneklerle geliştirebilirsin.', isLate: false, submittedAt: current(4), studentAnswers: [] }, current(4));
  add('submissions', 'submission:reading', { assignmentId: id('assignment:reading'), studentId, fileUrl: '', fileUrls: [], note: 'Metnin ana düşüncesini ve onu destekleyen iki düşünceyi belirledim.', grade: 90, feedback: 'Ana düşünce ile örnekleri iyi ilişkilendirmişsin.', isLate: false, submittedAt: current(1), studentAnswers: [] }, current(1));

  [['math', 1, '17:00', '17:40'], ['turkish', 2, '18:00', '18:40'], ['science', 3, '17:30', '18:10'], ['math', 4, '17:00', '17:40']].forEach(([subject, dayOfWeek, startTime, endTime], index) => {
    add('schedules', `schedule:${index}`, { gradeId, subjectId: id(`subject:${subject}`), teacherId, dayOfWeek, startTime, endTime, room: 'Yerel deneme sınıfı', isActive: true });
  });
  add('liveclasses', 'liveclass:fractions', { title: 'Kesirler etüdü (yerel deneme)', description: 'Bu örnek kayıt gerçek bir çevrim içi toplantı içermez.', url: '/student/atlas-ai', platform: 'OTHER', meetingId: '', passcode: '', startTime: localDate(0, day + 1, 18), durationMinutes: 40, gradeLevel: 6, gradeId, subjectId: mathId, teacherId, isActive: true });
  add('packages', 'package:demo', { name: '6. Sınıf • Yerel Deneme', description: 'Yalnızca bu bilgisayardaki deneme kurulumu için örnek paket. Gerçek satış değildir.', subtitle: 'AtlasAI ile çalışma ve gelişim takibi', price: 0, originalPrice: 0, isActive: true, features: ['3 ders', 'Örnek test ve ödevler', 'AtlasAI gelişim analizi'], badge: 'Yerel Deneme', sortOrder: 0, period: 'monthly' });
  add('orders', 'order:demo', { user: studentId, package: id('package:demo'), amount: 0, status: 'COMPLETED', paymentId: 'LOCAL-DEMO-NO-PAYMENT', paidAt: historic });
  add('studentprogresses', 'progress:student', { studentId, spentXp: 0, unlockedTitles: [], activeTitle: null, challengeLog: [] });
  return rows;
}

async function seed() {
  const uri = validateLocalUri(process.env.ATLAS_LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/atlas_local');
  const credentials = loadCredentials();
  const lockPath = path.join(localDirectory, 'seed.lock');
  let locked = false;
  try {
    fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx', mode: 0o600 });
    locked = true;
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, directConnection: true });
    const db = mongoose.connection.db;
    // Verify every existing identity before doing any writes. A missing credential
    // file must never silently replace passwords belonging to an existing account.
    for (const account of credentials.accounts) {
      const existing = await db.collection('users').findOne({ $or: [{ email: account.email }, { _id: id(`user:${account.role}`) }] });
      if (existing && (existing._id.toString() !== id(`user:${account.role}`).toString()
        || existing.email !== account.email || existing.role !== account.role
        || !await bcrypt.compare(account.password, existing.passwordHash))) {
        throw new Error(`Yerel hesap çakışması: ${account.email}. Mevcut hesap/parola değiştirilmedi.`);
      }
    }
    for (const account of credentials.accounts) {
      const now = new Date();
      const user = { _id: id(`user:${account.role}`), email: account.email, firstName: account.firstName, lastName: account.lastName,
        role: account.role, passwordHash: await bcrypt.hash(account.password, 12), isActive: true,
        assignedSubjects: account.role === 'TEACHER' ? ['Matematik', 'Türkçe', 'Fen Bilimleri'] : [],
        phone: '', address: 'Yerel deneme', city: 'Antalya', identityNumber: '', createdAt: now, updatedAt: now,
        ...(account.role === 'STUDENT' ? { grade: 6, parentId: id('user:PARENT') } : {}),
      };
      await db.collection('users').updateOne({ _id: user._id }, { $setOnInsert: user }, { upsert: true });
    }
    const dataset = buildDataset();
    for (const [collection, documents] of Object.entries(dataset)) {
      await db.collection(collection).bulkWrite(documents.map((document) => ({ updateOne: { filter: { _id: document._id }, update: { $setOnInsert: document }, upsert: true } })), { ordered: true });
    }
    console.log(JSON.stringify({ message: 'Yerel deneme verileri hazır. Mevcut kayıtlar korunur.', database: 'atlas_local', credentialsPath, counts: { users: credentials.accounts.length, ...Object.fromEntries(Object.entries(dataset).map(([name, docs]) => [name, docs.length])) } }, null, 2));
  } finally {
    await mongoose.disconnect();
    if (locked) fs.unlinkSync(lockPath);
  }
}

if (require.main === module) {
  seed().catch((error) => {
    console.error(`Yerel veri kurulumu tamamlanamadı: ${error.message}`);
    process.exitCode = 1;
  });
}
module.exports = { validateLocalUri, buildDataset };
