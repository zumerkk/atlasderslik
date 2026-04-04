/**
 * Atlas Derslik — Production Seed Script
 * Imports REAL data from atlas listesi.csv into the new Frankfurt MongoDB cluster.
 *
 * Usage:  cd apps/api && npx ts-node src/seed-production.ts
 */

import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb+srv://atlasderslik:2002%2E2002@atlasderslik.7qapnxz.mongodb.net/atlas-derslik?retryWrites=true&w=majority&appName=atlasderslik';

const DEFAULT_PASSWORD = 'Atlas2026!';

// ─── Mongoose Schemas (standalone, no NestJS) ────────────────────────────────

const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        role: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        grade: Number,
        assignedSubjects: { type: [String], default: [] },
        phone: { type: String, default: '' },
        address: { type: String, default: 'Kırıkkale' },
        city: { type: String, default: 'Kırıkkale' },
        identityNumber: { type: String, default: '11111111111' },
    },
    { timestamps: true },
);

const gradeSchema = new mongoose.Schema(
    {
        level: { type: Number, required: true },
        label: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
    },
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
    {
        name: { type: String, required: true },
        subjectId: { type: Types.ObjectId, ref: 'Subject', required: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true },
);

const topicSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        unitId: { type: Types.ObjectId, ref: 'Unit', required: true },
        order: { type: Number, default: 0 },
        objective: String,
    },
    { timestamps: true },
);

const teacherAssignmentSchema = new mongoose.Schema(
    {
        gradeId: { type: Types.ObjectId, ref: 'Grade', required: true },
        subjectId: { type: Types.ObjectId, ref: 'Subject', required: true },
        teacherId: { type: Types.ObjectId, ref: 'User', required: true },
        notes: { type: String, default: '' },
    },
    { timestamps: true },
);
teacherAssignmentSchema.index({ gradeId: 1, subjectId: 1, teacherId: 1 }, { unique: true });

const studentEnrollmentSchema = new mongoose.Schema(
    {
        studentId: { type: Types.ObjectId, ref: 'User', required: true },
        gradeId: { type: Types.ObjectId, ref: 'Grade', required: true },
        parentId: { type: Types.ObjectId, ref: 'User' },
        enrollmentDate: { type: Date, default: Date.now },
    },
    { timestamps: true },
);
studentEnrollmentSchema.index({ studentId: 1, gradeId: 1 }, { unique: true });

const liveClassSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: String,
        url: { type: String, required: true },
        startTime: { type: Date, required: true },
        durationMinutes: { type: Number, required: true, default: 40 },
        gradeLevel: { type: Number, required: true },
        subjectId: { type: Types.ObjectId, ref: 'Subject', required: true },
        teacherId: { type: Types.ObjectId, ref: 'User', required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
);

const videoSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: String,
        videoUrl: { type: String, required: true },
        durationMinutes: Number,
        gradeLevel: { type: Number, required: true },
        subjectId: { type: Types.ObjectId, ref: 'Subject', required: true },
        topicId: { type: Types.ObjectId, ref: 'Topic' },
        teacherId: { type: Types.ObjectId, ref: 'User', required: true },
        views: { type: Number, default: 0 },
    },
    { timestamps: true },
);

const assignmentSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: String,
        dueDate: { type: Date, required: true },
        subjectId: { type: Types.ObjectId, ref: 'Subject', required: true },
        gradeLevel: { type: Number, required: true },
        teacherId: { type: Types.ObjectId, ref: 'User', required: true },
        maxScore: { type: Number, default: 100 },
        instructions: String,
    },
    { timestamps: true },
);

const questionSchema = new mongoose.Schema(
    {
        text: { type: String, required: true },
        options: { type: [String], required: true },
        correctAnswer: { type: Number, required: true },
        gradeLevel: { type: Number, required: true },
        subjectId: { type: Types.ObjectId, ref: 'Subject', required: true },
        unitId: { type: Types.ObjectId, ref: 'Unit' },
        topicId: { type: Types.ObjectId, ref: 'Topic' },
        teacherId: { type: Types.ObjectId, ref: 'User', required: true },
        difficulty: { type: String, default: 'MEDIUM', enum: ['EASY', 'MEDIUM', 'HARD'] },
    },
    { timestamps: true },
);

const packageSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        subtitle: { type: String, default: '' },
        price: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
        features: [String],
        badge: { type: String, default: '' },
        sortOrder: { type: Number, default: 0 },
        period: { type: String, default: 'monthly', enum: ['monthly', 'yearly', 'one-time'] },
    },
    { timestamps: true },
);

const scheduleSchema = new mongoose.Schema(
    {
        gradeId: { type: Types.ObjectId, ref: 'Grade', required: true },
        subjectId: { type: Types.ObjectId, ref: 'Subject', required: true },
        teacherId: { type: Types.ObjectId, ref: 'User', required: true },
        dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        room: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
);
scheduleSchema.index({ gradeId: 1, dayOfWeek: 1, startTime: 1 }, { unique: true });

// ─── Models ──────────────────────────────────────────────────────────────────

const User = mongoose.model('User', userSchema);
const Grade = mongoose.model('Grade', gradeSchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Unit = mongoose.model('Unit', unitSchema);
const Topic = mongoose.model('Topic', topicSchema);
const TeacherAssignment = mongoose.model('TeacherAssignment', teacherAssignmentSchema);
const StudentEnrollment = mongoose.model('StudentEnrollment', studentEnrollmentSchema);
const LiveClass = mongoose.model('LiveClass', liveClassSchema);
const Video = mongoose.model('Video', videoSchema);
const Assignment = mongoose.model('Assignment', assignmentSchema);
const Question = mongoose.model('Question', questionSchema);
const Package = mongoose.model('Package', packageSchema);
const ScheduleModel = mongoose.model('Schedule', scheduleSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hash(pw: string) {
    return bcrypt.hash(pw, await bcrypt.genSalt());
}

async function upsertUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    grade?: number;
    phone?: string;
    password?: string;
}) {
    const passwordHash = await hash(data.password || DEFAULT_PASSWORD);
    return User.findOneAndUpdate(
        { email: data.email.toLowerCase().trim() },
        {
            email: data.email.toLowerCase().trim(),
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            role: data.role,
            passwordHash,
            isActive: true,
            grade: data.grade,
            phone: data.phone || '',
            assignedSubjects: [],
        },
        { upsert: true, new: true },
    );
}

// ─── Real Data from CSV ──────────────────────────────────────────────────────

// Öğretmenler (from CSV: Atlas Öğretmenler section)
const TEACHERS = [
    { firstName: 'Mısra', lastName: 'Çetin', email: 'misracetin560@gmail.com', phone: '5421069692', branch: 'Matematik' },
    { firstName: 'Oğuzhan', lastName: 'Öğretmen', email: 'oguzhan70034@gmail.com', phone: '5376278760', branch: 'Türkçe' },
    { firstName: 'Metehan', lastName: 'Hüyüklü', email: 'metehanacademy@gmail.com', phone: '5531161152', branch: 'Sosyal Bilgiler' },
    { firstName: 'Merve', lastName: 'Bolat', email: 'blltmerve@gmail.com', phone: '5451712003', branch: 'İngilizce' },
];

// Öğrenciler ve Veliler (from CSV)
// Format: student name, student email (generated), parent email (from CSV), parent phone, grade
const STUDENTS_5 = [
    { firstName: 'Ceren', lastName: 'Çekinmezer', parentEmail: 'cekinmezerfiliz@gmail.com', parentPhone: '5388701080', parentName: 'Filiz Çekinmezer' },
    { firstName: 'Defne', lastName: 'Sevimli', parentEmail: 'tubareyyaneliz@gmail.com', parentPhone: '5447989420', parentName: 'Tuba Sevimli' },
    { firstName: 'Damla', lastName: 'Özkaya', parentEmail: 'dilayercan2017@gmail.com', parentPhone: '5424905482', parentName: 'Dilay Özkaya' },
    { firstName: 'İpek Ecem', lastName: 'Çağlar', parentEmail: 'caglaripekecem@gmail.com', parentPhone: '5387062472', parentName: 'Çağlar Ailesi' },
    { firstName: 'Elif', lastName: 'Ece', parentEmail: 'gulizarece1985@gmail.com', parentPhone: '5064245401', parentName: 'Gülizar Ece' },
    { firstName: 'Elif', lastName: 'Yavuz', parentEmail: 'elifyvz077@gmail.com', parentPhone: '5388996061', parentName: 'Yavuz Ailesi' },
    { firstName: 'Zümra', lastName: 'Çolak', parentEmail: 'serifecolak1983@gmail.com', parentPhone: '5373853951', parentName: 'Şerife Çolak' },
    { firstName: 'Duru', lastName: 'Kayalı', parentEmail: 'belginkayali0707@gmail.com', parentPhone: '5368562694', parentName: 'Belgin Kayalı' },
    { firstName: 'Mehmet Berat', lastName: 'Durur', parentEmail: 'neslicankonus@gmail.com', parentPhone: '5064710189', parentName: 'Neslican Durur' },
];

const STUDENTS_6 = [
    { firstName: 'Elif', lastName: 'Sarıkaya', parentEmail: 'elifnisasarikaya09@gmail.com', parentPhone: '5063808932', parentName: 'Sarıkaya Ailesi' },
    { firstName: 'Mete Kemal', lastName: 'Dinçer', parentEmail: 'dincerkemer@yahoo.com', parentPhone: '5057336916', parentName: 'Dinçer Ailesi' },
    { firstName: 'Anisa', lastName: 'Aksungur', parentEmail: 'anisaaksungur@gmail.com', parentPhone: '5369497161', parentName: 'Aksungur Ailesi' },
    { firstName: 'Hatice', lastName: 'Öztürk', parentEmail: 'muradiyeozturk061@gmail.com', parentPhone: '5433092497', parentName: 'Muradiye Öztürk' },
    { firstName: 'Miraç', lastName: 'Atalay', parentEmail: 'yalcin07_38@hotmail.com', parentPhone: '5392671639', parentName: 'Yalçın Atalay' },
];

const STUDENTS_7 = [
    { firstName: 'Ali Aras', lastName: 'Çetin', parentEmail: 'mcetin5254@gmail.com', parentPhone: '5415455398', parentName: 'M. Çetin' },
    { firstName: 'Ela', lastName: 'Tüfekçiyaşar', parentEmail: 'zeynepela@gmail.com', parentPhone: '5077462933', parentName: 'Zeynep Tüfekçiyaşar' },
    { firstName: 'Yağmur', lastName: 'Özkaya', parentEmail: 'dilayercan2017@gmail.com', parentPhone: '5424905482', parentName: 'Dilay Özkaya' },
    { firstName: 'Ilgın', lastName: 'Sevin', parentEmail: 'adnanselcuk12@icloud.com', parentPhone: '5518258362', parentName: 'Adnan Sevin' },
    { firstName: 'Çınar Anıl', lastName: 'Üyütgen', parentEmail: 'safakuyutgen750@gmail.com', parentPhone: '5359732788', parentName: 'Şafak Üyütgen' },
];

const STUDENTS_8 = [
    { firstName: 'Ceylin', lastName: 'Gökay', parentEmail: 'elifgpkay@gmail.com', parentPhone: '5383997238', parentName: 'Elif Gökay' },
    { firstName: 'Ramazan', lastName: 'Çolak', parentEmail: 'serifecolak1983@gmail.com', parentPhone: '5373853951', parentName: 'Şerife Çolak' },
    { firstName: 'Kuzey', lastName: 'Uğurlu', parentEmail: 'ayseugurlu16@gmail.com', parentPhone: '5325049413', parentName: 'Ayşe Uğurlu' },
    { firstName: 'Sidar', lastName: 'Divarcı', parentEmail: 'amadeus44200@hotmail.com', parentPhone: '5055795240', parentName: 'Divarcı Ailesi' },
    { firstName: 'Emir', lastName: 'Ozarslan', parentEmail: 'asliozaslan53@gmail.com', parentPhone: '5337714135', parentName: 'Aslı Ozarslan' },
];

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed() {
    console.log('🚀 Atlas Derslik — Production Seed');
    console.log('═══════════════════════════════════════════');
    console.log('Connecting to MongoDB Atlas (Frankfurt)...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!\n');

    // ── 0. Clean slate ─────────────────────────────────────────
    console.log('🧹 Cleaning existing data...');
    const collections = [User, Grade, Subject, Unit, Topic, TeacherAssignment, StudentEnrollment, LiveClass, Video, Assignment, Question, Package, ScheduleModel];
    for (const model of collections) {
        await (model as any).deleteMany();
    }
    console.log('  → All collections cleared\n');

    // ── 1. Admin User ──────────────────────────────────────────
    console.log('👑 Creating admin user...');
    const admin = await upsertUser({
        email: 'admin@atlasderslik.com',
        firstName: 'Atlas',
        lastName: 'Admin',
        role: 'ADMIN',
        password: 'AtlasAdmin2026!',
    });
    console.log(`  → Admin: admin@atlasderslik.com\n`);

    // ── 2. Teachers ────────────────────────────────────────────
    console.log('👩‍🏫 Creating teachers...');
    const teacherDocs: Record<string, any> = {};
    for (const t of TEACHERS) {
        const doc = await upsertUser({
            email: t.email,
            firstName: t.firstName,
            lastName: t.lastName,
            role: 'TEACHER',
            phone: t.phone,
        });
        teacherDocs[t.branch] = doc;
        console.log(`  → ${t.firstName} ${t.lastName} (${t.branch}) — ${t.email}`);
    }
    console.log('');

    // ── 3. Grades ──────────────────────────────────────────────
    console.log('📚 Creating grades...');
    const grades: Record<number, any> = {};
    for (const lvl of [5, 6, 7, 8]) {
        grades[lvl] = await Grade.create({ level: lvl, label: `${lvl}. Sınıf`, isActive: true });
    }
    console.log('  → 4 grades (5, 6, 7, 8)\n');

    // ── 4. Subjects ────────────────────────────────────────────
    console.log('📖 Creating subjects...');
    const subjectNames = ['Matematik', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce'];
    const subjects: Record<string, any> = {};
    for (const gl of [5, 6, 7, 8]) {
        for (const name of subjectNames) {
            const key = `${gl}-${name}`;
            subjects[key] = await Subject.create({ name, gradeLevel: gl, isActive: true });
        }
    }
    console.log(`  → ${Object.keys(subjects).length} subjects across 4 grades\n`);

    // ── 5. Teacher Assignments ─────────────────────────────────
    // Her öğretmen kendi branşını tüm sınıflarda veriyor
    console.log('👩‍🏫 Assigning teachers to grades...');
    let taCount = 0;
    for (const t of TEACHERS) {
        const teacher = teacherDocs[t.branch];
        for (const gl of [5, 6, 7, 8]) {
            const subjectKey = `${gl}-${t.branch}`;
            const subject = subjects[subjectKey];
            if (teacher && subject) {
                await TeacherAssignment.create({
                    gradeId: grades[gl]._id,
                    subjectId: subject._id,
                    teacherId: teacher._id,
                    notes: '',
                });
                taCount++;
            }
        }
    }
    console.log(`  → ${taCount} teacher assignments\n`);

    // ── 6. Students + Parents + Enrollments ────────────────────
    console.log('🎓 Creating students, parents, and enrollments...');
    const allStudentGroups = [
        { grade: 5, students: STUDENTS_5 },
        { grade: 6, students: STUDENTS_6 },
        { grade: 7, students: STUDENTS_7 },
        { grade: 8, students: STUDENTS_8 },
    ];

    let studentCount = 0;
    let parentCount = 0;
    let enrollmentCount = 0;
    const parentCache: Record<string, any> = {};

    for (const group of allStudentGroups) {
        console.log(`\n  ── ${group.grade}. Sınıf ──`);
        for (const s of group.students) {
            // Generate student email from name
            const studentEmail = `${s.firstName.toLowerCase().replace(/\s+/g, '').replace(/[çÇ]/g, 'c').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[ıİ]/g, 'i')}.${s.lastName.toLowerCase().replace(/\s+/g, '').replace(/[çÇ]/g, 'c').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[ıİ]/g, 'i')}@ogrenci.atlasderslik.com`;

            // Create student
            const student = await upsertUser({
                email: studentEmail,
                firstName: s.firstName,
                lastName: s.lastName,
                role: 'STUDENT',
                grade: group.grade,
            });
            studentCount++;

            // Create or get parent (deduplicate by email)
            let parent: any;
            const parentEmailClean = s.parentEmail.toLowerCase().trim();
            if (parentCache[parentEmailClean]) {
                parent = parentCache[parentEmailClean];
            } else {
                const nameParts = s.parentName.split(' ');
                const parentFirstName = nameParts.slice(0, -1).join(' ') || nameParts[0];
                const parentLastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : s.lastName;
                parent = await upsertUser({
                    email: parentEmailClean,
                    firstName: parentFirstName,
                    lastName: parentLastName,
                    role: 'PARENT',
                    phone: s.parentPhone,
                });
                parentCache[parentEmailClean] = parent;
                parentCount++;
            }

            // Enroll student
            await StudentEnrollment.create({
                studentId: student._id,
                gradeId: grades[group.grade]._id,
                parentId: parent._id,
                enrollmentDate: new Date(),
            });
            enrollmentCount++;

            console.log(`    ✓ ${s.firstName} ${s.lastName} → Veli: ${s.parentName} (${parentEmailClean})`);
        }
    }
    console.log(`\n  → ${studentCount} students, ${parentCount} parents (unique), ${enrollmentCount} enrollments\n`);

    // ── 7. Units + Topics (Müfredat) ───────────────────────────
    console.log('📂 Creating curriculum (units & topics)...');
    const curriculum: Record<string, { units: { name: string; topics: string[] }[] }> = {
        'Matematik': {
            units: [
                { name: 'Doğal Sayılar', topics: ['Doğal Sayılarla Toplama', 'Doğal Sayılarla Çıkarma', 'Doğal Sayılarla Çarpma', 'Doğal Sayılarla Bölme'] },
                { name: 'Kesirler', topics: ['Kesirleri Karşılaştırma', 'Kesirlerle Toplama', 'Kesirlerle Çıkarma', 'Kesirlerle Çarpma'] },
                { name: 'Geometri', topics: ['Açılar', 'Üçgenler', 'Dörtgenler', 'Çember ve Daire'] },
                { name: 'Veri İşleme', topics: ['Tablo Okuma', 'Grafik Çizme', 'Ortalama Hesaplama'] },
            ],
        },
        'Türkçe': {
            units: [
                { name: 'Okuma', topics: ['Sözcükte Anlam', 'Cümlede Anlam', 'Paragraf Anlam', 'Metin Türleri'] },
                { name: 'Dil Bilgisi', topics: ['İsimler', 'Sıfatlar', 'Zamirler', 'Fiiller'] },
                { name: 'Yazma', topics: ['Kompozisyon', 'Öykü Yazma', 'Şiir Yazma'] },
            ],
        },
        'Sosyal Bilgiler': {
            units: [
                { name: 'Tarih', topics: ['İlk Uygarlıklar', 'Selçuklular', 'Osmanlı Devleti', 'Cumhuriyet Dönemi'] },
                { name: 'Coğrafya', topics: ['Dünya ve Haritalar', 'İklim ve Bitki Örtüsü', 'Nüfus ve Yerleşme'] },
                { name: 'Vatandaşlık', topics: ['Hak ve Sorumluluklar', 'Demokrasi', 'İnsan Hakları'] },
            ],
        },
        'İngilizce': {
            units: [
                { name: 'Grammar', topics: ['Simple Present Tense', 'Present Continuous', 'Past Simple', 'Future Tense'] },
                { name: 'Vocabulary', topics: ['Family', 'School', 'Daily Routines', 'Hobbies'] },
                { name: 'Reading & Writing', topics: ['Short Stories', 'Letters', 'Descriptions'] },
            ],
        },
    };

    let unitCount = 0;
    let topicCount = 0;
    for (const [subjectName, data] of Object.entries(curriculum)) {
        for (const gl of [5, 6, 7, 8]) {
            const subjectKey = `${gl}-${subjectName}`;
            const subj = subjects[subjectKey];
            if (!subj) continue;
            for (let ui = 0; ui < data.units.length; ui++) {
                const unitData = data.units[ui];
                const unit = await Unit.create({
                    name: unitData.name,
                    subjectId: subj._id,
                    order: ui + 1,
                });
                unitCount++;
                for (let ti = 0; ti < unitData.topics.length; ti++) {
                    await Topic.create({
                        name: unitData.topics[ti],
                        unitId: unit._id,
                        order: ti + 1,
                    });
                    topicCount++;
                }
            }
        }
    }
    console.log(`  → ${unitCount} units, ${topicCount} topics\n`);

    // ── 8. Packages ────────────────────────────────────────────
    console.log('📦 Creating packages...');
    const pkgs = [
        {
            name: 'Temel Destek Paketi',
            description: 'Yeni Nesil Soru Çözüm Odaklı Canlı Dersler ile temel eğitim desteği.',
            subtitle: 'Haftada 6 Ders (2 Mat, 2 Fen, 2 Tür) | Maksimum 10 Kişi',
            price: 3200,
            features: ['Yeni Nesil Soru Çözüm Odaklı Canlı Dersler', 'Müfredat Kazanımlarına %100 Uyumlu Anlatım', 'Haftalık Düzenli Ödevlendirme ve Kaynak Rehberliği', 'İnteraktif Katılım ve Anında Soru Sorma İmkanı', 'Yazılı Dönemlerine Özel Senaryo Çalışmaları'],
            badge: '',
            sortOrder: 1,
            period: 'monthly',
        },
        {
            name: 'Tam Destek Paketi',
            description: '5 Ana Branşta Eksiksiz Müfredat Tamamlama ile kapsamlı hazırlık.',
            subtitle: 'Haftada 8 Ders (2 Mat, 2 Fen, 2 Tür, 1 Sos, 1 İng) | Maksimum 8 Kişi',
            price: 4200,
            features: ['5 Ana Branşta Eksiksiz Müfredat Tamamlama', 'İnteraktif Katılım ve Anında Soru Sorma İmkanı', 'Sınav Odaklı Soru Çözüm Seansları', 'Zenginleştirilmiş PDF Soru ve Doküman Arşivi', 'Branş Bazlı Haftalık Ödev Takip Sistemi', 'Yazılı Dönemlerine Özel Senaryo Çalışmaları'],
            badge: 'En Popüler',
            sortOrder: 2,
            period: 'monthly',
        },
        {
            name: 'Sayısal Destek Paketi',
            description: 'Matematik ve Fen Bilimleri odaklı yoğun hazırlık programı.',
            subtitle: 'Haftada 6 Ders (3 Mat, 3 Fen) | Maksimum 7 Kişi',
            price: 3700,
            features: ['Matematik ve Fen Bilimleri Odaklı Yoğun Program', '7 Kişilik Gruplarda Maksimum İlgi', 'Mantık-Muhakeme ve Yeni Nesil Soru Stratejileri', 'Sayısal Branşlara Özel Haftalık Hedef Takibi', 'Nokta Atışı Konu Anlatımları ve Soru Pratikleri', 'Yazılı Dönemlerine Özel Senaryo Çalışmaları'],
            badge: '',
            sortOrder: 3,
            period: 'monthly',
        },
        {
            name: 'İleri Destek Paketi (VIP)',
            description: 'Birebir Mentorluk ve 5 Kişilik Özel Sınıflarda premium eğitim.',
            subtitle: 'Haftada 10 Ders (4 Mat, 4 Fen, 2 Tür) | Maksimum 5 Kişi (Özel Grup)',
            price: 6000,
            features: ['Birebir Mentorluk: Aylık Kişisel Gelişim Görüşmeleri', '5 Kişilik Özel Sınıflarda Özel Ders Kalitesinde Eğitim', 'Mantık-Muhakeme ve Yeni Nesil Soru Stratejileri', 'Branş Bazlı Haftalık Ödev Takip Sistemi', 'Sınav Stratejileri ve Motivasyon Odaklı Rehberlik', 'Yazılı Dönemlerine Özel Senaryo Çalışmaları'],
            badge: 'VIP',
            sortOrder: 4,
            period: 'monthly',
        },
    ];
    for (const p of pkgs) {
        await Package.create({ ...p, isActive: true });
    }
    console.log(`  → ${pkgs.length} packages\n`);

    // ── 9. Weekly Schedules ────────────────────────────────────
    console.log('📅 Creating weekly schedules...');
    const timeSlots = [
        { startTime: '16:00', endTime: '16:40' },
        { startTime: '16:50', endTime: '17:30' },
        { startTime: '17:40', endTime: '18:20' },
        { startTime: '18:30', endTime: '19:10' },
        { startTime: '19:20', endTime: '20:00' },
    ];

    // Each grade gets a schedule — teachers rotate through their subjects
    const scheduleEntries: any[] = [];
    for (const gl of [5, 6, 7, 8]) {
        const grade = grades[gl];
        // Mon-Fri, 2 slots per day
        const weeklyPlan = [
            { day: 1, subjects: ['Matematik', 'Türkçe'] },
            { day: 2, subjects: ['Sosyal Bilgiler', 'İngilizce'] },
            { day: 3, subjects: ['Matematik', 'Türkçe'] },
            { day: 4, subjects: ['Sosyal Bilgiler', 'İngilizce'] },
            { day: 5, subjects: ['Matematik', 'Türkçe'] },
        ];
        for (const plan of weeklyPlan) {
            for (let si = 0; si < plan.subjects.length; si++) {
                const subjectName = plan.subjects[si];
                const subjectKey = `${gl}-${subjectName}`;
                const subject = subjects[subjectKey];
                const teacher = teacherDocs[subjectName];
                if (subject && teacher) {
                    scheduleEntries.push({
                        gradeId: grade._id,
                        subjectId: subject._id,
                        teacherId: teacher._id,
                        dayOfWeek: plan.day,
                        startTime: timeSlots[si].startTime,
                        endTime: timeSlots[si].endTime,
                        room: `Online - ${gl}. Sınıf`,
                        isActive: true,
                    });
                }
            }
        }
    }
    // Insert schedules, skip duplicates
    let scheduleCount = 0;
    for (const entry of scheduleEntries) {
        try {
            await ScheduleModel.create(entry);
            scheduleCount++;
        } catch (err: any) {
            if (err?.code !== 11000) throw err;
            // duplicate key — skip
        }
    }
    console.log(`  → ${scheduleCount} schedule entries\n`);

    // ── 10. Summary ────────────────────────────────────────────
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('✅ PRODUCTION SEED COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('📋 Giriş Bilgileri:');
    console.log('─────────────────────────────────────────');
    console.log(`  Admin:      admin@atlasderslik.com  /  AtlasAdmin2026!`);
    console.log('');
    console.log('  Öğretmenler (Şifre: Atlas2026!):');
    for (const t of TEACHERS) {
        console.log(`    ${t.branch.padEnd(17)} → ${t.email}`);
    }
    console.log('');
    console.log('  Öğrenciler: [isim].[soyisim]@ogrenci.atlasderslik.com  /  Atlas2026!');
    console.log('  Veliler:    CSV\'deki gmail adresleri  /  Atlas2026!');
    console.log('');
    console.log(`  Toplam: 1 admin, ${TEACHERS.length} öğretmen, ${studentCount} öğrenci, ${parentCount} veli`);
    console.log(`  Sınıflar: 5, 6, 7, 8`);
    console.log(`  Dersler: ${Object.keys(subjects).length}`);
    console.log(`  Müfredat: ${unitCount} ünite, ${topicCount} konu`);
    console.log(`  Paketler: ${pkgs.length}`);
    console.log(`  Ders Programı: ${scheduleCount} giriş`);
    console.log('');

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
