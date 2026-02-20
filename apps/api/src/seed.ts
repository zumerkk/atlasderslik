/**
 * Atlas Derslik — Comprehensive Seed Script
 * Creates demo data for all roles, curriculum, assignments, and content.
 *
 * Usage:  cd apps/api && npx ts-node src/seed.ts
 *         or: npm run seed
 */

import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb+srv://AtlasDerslik:2002%2E2002Atlas@atlasderslik.6ziq4aa.mongodb.net/atlas-derslik?retryWrites=true&w=majority&appName=AtlasDerslik';

const PASSWORD = 'Password123!';

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
    },
    { timestamps: true },
);

const gradeSchema = new mongoose.Schema(
    { level: { type: Number, required: true, unique: true }, isActive: { type: Boolean, default: true } },
    { timestamps: true },
);

const subjectSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        gradeLevel: { type: Number, required: true },
        icon: String,
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
);
subjectSchema.index({ name: 1, gradeLevel: 1 }, { unique: true });

const unitSchema = new mongoose.Schema(
    { name: { type: String, required: true }, subjectId: { type: Types.ObjectId, ref: 'Subject', required: true }, order: { type: Number, default: 0 } },
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
        studentId: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
        gradeId: { type: Types.ObjectId, ref: 'Grade', required: true },
        parentId: { type: Types.ObjectId, ref: 'User' },
        enrollmentDate: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

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
        price: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
        features: [String],
    },
    { timestamps: true },
);

const submissionSchema = new mongoose.Schema(
    {
        assignmentId: { type: Types.ObjectId, ref: 'Assignment', required: true },
        studentId: { type: Types.ObjectId, ref: 'User', required: true },
        fileUrl: String,
        note: String,
        grade: Number,
        feedback: String,
        submittedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

const scheduleSchema = new mongoose.Schema(
    {
        gradeId: { type: Types.ObjectId, ref: 'Grade', required: true },
        subjectId: { type: Types.ObjectId, ref: 'Subject', required: true },
        teacherId: { type: Types.ObjectId, ref: 'User', required: true },
        dayOfWeek: { type: Number, required: true, min: 1, max: 5 },
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
const Submission = mongoose.model('Submission', submissionSchema);
const ScheduleModel = mongoose.model('Schedule', scheduleSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hash(pw: string) {
    return bcrypt.hash(pw, await bcrypt.genSalt());
}

async function upsertUser(data: { email: string; firstName: string; lastName: string; role: string; grade?: number }) {
    const passwordHash = await hash(PASSWORD);
    return User.findOneAndUpdate(
        { email: data.email },
        { ...data, passwordHash, isActive: true, assignedSubjects: [] },
        { upsert: true, new: true },
    );
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed() {
    console.log('🚀 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // ── 1. Users ───────────────────────────────────────────────
    console.log('👤 Seeding users...');
    const admin = await upsertUser({ email: 'admin@atlas.com', firstName: 'Atlas', lastName: 'Admin', role: 'ADMIN' });
    const teacher1 = await upsertUser({ email: 'teacher1@atlas.com', firstName: 'Ayşe', lastName: 'Yılmaz', role: 'TEACHER' });
    const teacher2 = await upsertUser({ email: 'teacher2@atlas.com', firstName: 'Mehmet', lastName: 'Kaya', role: 'TEACHER' });

    const students: any[] = [];
    const studentData = [
        { email: 'student1@atlas.com', firstName: 'Ali', lastName: 'Demir', grade: 5 },
        { email: 'student2@atlas.com', firstName: 'Zeynep', lastName: 'Çelik', grade: 5 },
        { email: 'student3@atlas.com', firstName: 'Burak', lastName: 'Arslan', grade: 5 },
        { email: 'student4@atlas.com', firstName: 'Elif', lastName: 'Koç', grade: 5 },
        { email: 'student5@atlas.com', firstName: 'Emre', lastName: 'Şahin', grade: 6 },
        { email: 'student6@atlas.com', firstName: 'Selin', lastName: 'Özkan', grade: 6 },
        { email: 'student7@atlas.com', firstName: 'Kaan', lastName: 'Aydın', grade: 6 },
        { email: 'student8@atlas.com', firstName: 'Merve', lastName: 'Yıldız', grade: 7 },
        { email: 'student9@atlas.com', firstName: 'Onur', lastName: 'Kılıç', grade: 7 },
        { email: 'student10@atlas.com', firstName: 'Defne', lastName: 'Polat', grade: 7 },
    ];
    for (const s of studentData) {
        students.push(await upsertUser({ ...s, role: 'STUDENT' }));
    }

    const parent1 = await upsertUser({ email: 'parent1@atlas.com', firstName: 'Hasan', lastName: 'Demir', role: 'PARENT' });
    const parent2 = await upsertUser({ email: 'parent2@atlas.com', firstName: 'Fatma', lastName: 'Çelik', role: 'PARENT' });
    const parent3 = await upsertUser({ email: 'parent3@atlas.com', firstName: 'İbrahim', lastName: 'Şahin', role: 'PARENT' });
    const parent4 = await upsertUser({ email: 'parent4@atlas.com', firstName: 'Aysel', lastName: 'Yıldız', role: 'PARENT' });
    const parent5 = await upsertUser({ email: 'parent5@atlas.com', firstName: 'Kemal', lastName: 'Kılıç', role: 'PARENT' });

    console.log(`  → ${3 + students.length + 5} users seeded\n`);

    // ── 2. Grades ──────────────────────────────────────────────
    console.log('📚 Seeding grades...');
    const grades: Record<number, any> = {};
    for (const lvl of [5, 6, 7]) {
        grades[lvl] = await Grade.findOneAndUpdate({ level: lvl }, { level: lvl, isActive: true }, { upsert: true, new: true });
    }
    console.log('  → 3 grades (5, 6, 7)\n');

    // ── 3. Subjects ────────────────────────────────────────────
    console.log('📖 Seeding subjects...');
    const subjectNames = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler'];
    const subjects: Record<string, any> = {}; // key: "5-Matematik"
    for (const gl of [5, 6, 7]) {
        for (const name of subjectNames) {
            const key = `${gl}-${name}`;
            subjects[key] = await Subject.findOneAndUpdate(
                { name, gradeLevel: gl },
                { name, gradeLevel: gl, isActive: true },
                { upsert: true, new: true },
            );
        }
    }
    console.log(`  → ${Object.keys(subjects).length} subjects across 3 grades\n`);

    // ── 4. Units + Topics ─────────────────────────────────────
    console.log('📂 Seeding units & topics...');
    const unitNames: Record<string, string[][]> = {
        Matematik: [
            ['Doğal Sayılar', ['Doğal Sayılarla Toplama', 'Doğal Sayılarla Çıkarma', 'Doğal Sayılarla Çarpma']],
            ['Kesirler', ['Kesirleri Karşılaştırma', 'Kesirlerle Toplama', 'Kesirlerle Çıkarma']],
        ] as any,
        'Türkçe': [
            ['Okuma', ['Sözcükte Anlam', 'Cümlede Anlam', 'Paragraf Anlam']],
            ['Dil Bilgisi', ['İsimler', 'Sıfatlar', 'Zamirler']],
        ] as any,
        'Fen Bilimleri': [
            ['Madde ve Değişim', ['Maddenin Halleri', 'Isı ve Sıcaklık', 'Hal Değişimleri']],
            ['Canlılar Dünyası', ['Hücre', 'Organlar', 'Sistemler']],
        ] as any,
        'Sosyal Bilgiler': [
            ['Tarih', ['İlk Uygarlıklar', 'Osmanlı Devleti', 'Cumhuriyet Dönemi']],
            ['Coğrafya', ['Dünya ve Haritalar', 'İklim ve Bitki Örtüsü', 'Nüfus ve Yerleşme']],
        ] as any,
    };

    // Store first unit+topic for content seeding later
    let sampleUnit: any = null;
    let sampleTopic: any = null;
    let unitCount = 0;
    let topicCount = 0;

    for (const [subjectName, unitsArr] of Object.entries(unitNames)) {
        for (const gl of [5, 6, 7]) {
            const subjectKey = `${gl}-${subjectName}`;
            const subj = subjects[subjectKey];
            if (!subj) continue;
            for (let ui = 0; ui < (unitsArr as any[]).length; ui++) {
                const [unitName, topicNames] = (unitsArr as any[])[ui];
                const unit = await Unit.findOneAndUpdate(
                    { name: unitName, subjectId: subj._id },
                    { name: unitName, subjectId: subj._id, order: ui + 1 },
                    { upsert: true, new: true },
                );
                unitCount++;
                if (!sampleUnit) sampleUnit = unit;
                for (let ti = 0; ti < topicNames.length; ti++) {
                    const topic = await Topic.findOneAndUpdate(
                        { name: topicNames[ti], unitId: unit._id },
                        { name: topicNames[ti], unitId: unit._id, order: ti + 1 },
                        { upsert: true, new: true },
                    );
                    topicCount++;
                    if (!sampleTopic) sampleTopic = topic;
                }
            }
        }
    }
    console.log(`  → ${unitCount} units, ${topicCount} topics\n`);

    // ── 5. Teacher Assignments ─────────────────────────────────
    // Spec:  5: Mat + Türkçe,  6: Fen,  7: Sosyal Bilgiler (Tarih)
    // Cross: same teacher across multiple grades + multiple subjects per grade
    console.log('👩‍🏫 Seeding teacher assignments...');
    const tAssignments = [
        // teacher1: 5-Mat, 5-Türkçe, 6-Fen, 7-Matematik (cross-grade)
        { teacher: teacher1, grade: 5, subject: 'Matematik' },
        { teacher: teacher1, grade: 5, subject: 'Türkçe' },
        { teacher: teacher1, grade: 6, subject: 'Fen Bilimleri' },
        { teacher: teacher1, grade: 7, subject: 'Matematik' },
        // teacher2: 6-Matematik, 6-Türkçe, 7-Sosyal Bilgiler, 7-Fen (cross-grade + multi-subject)
        { teacher: teacher2, grade: 6, subject: 'Matematik' },
        { teacher: teacher2, grade: 6, subject: 'Türkçe' },
        { teacher: teacher2, grade: 7, subject: 'Sosyal Bilgiler' },
        { teacher: teacher2, grade: 7, subject: 'Fen Bilimleri' },
    ];
    for (const ta of tAssignments) {
        await TeacherAssignment.findOneAndUpdate(
            { gradeId: grades[ta.grade]._id, subjectId: subjects[`${ta.grade}-${ta.subject}`]._id, teacherId: ta.teacher._id },
            { gradeId: grades[ta.grade]._id, subjectId: subjects[`${ta.grade}-${ta.subject}`]._id, teacherId: ta.teacher._id, notes: '' },
            { upsert: true, new: true },
        );
    }
    console.log(`  → ${tAssignments.length} teacher assignments\n`);

    // ── 6. Student Enrollments ─────────────────────────────────
    console.log('🎓 Seeding student enrollments...');
    const enrollmentMap = [
        // grade 5: students 0-3, parent1 for student 0+1
        { studentIdx: 0, grade: 5, parent: parent1 },
        { studentIdx: 1, grade: 5, parent: parent2 },
        { studentIdx: 2, grade: 5, parent: null },
        { studentIdx: 3, grade: 5, parent: null },
        // grade 6: students 4-6, parent3 for student 4
        { studentIdx: 4, grade: 6, parent: parent3 },
        { studentIdx: 5, grade: 6, parent: null },
        { studentIdx: 6, grade: 6, parent: null },
        // grade 7: students 7-9, parent4 for student 7, parent5 for student 8
        { studentIdx: 7, grade: 7, parent: parent4 },
        { studentIdx: 8, grade: 7, parent: parent5 },
        { studentIdx: 9, grade: 7, parent: null },
    ];
    for (const e of enrollmentMap) {
        const updateData: any = { studentId: students[e.studentIdx]._id, gradeId: grades[e.grade]._id };
        if (e.parent) updateData.parentId = e.parent._id;
        await StudentEnrollment.findOneAndUpdate({ studentId: students[e.studentIdx]._id }, updateData, { upsert: true, new: true });
    }
    console.log(`  → ${enrollmentMap.length} student enrollments\n`);

    // ── 7. Packages ────────────────────────────────────────────
    console.log('📦 Seeding packages...');
    await Package.deleteMany({});
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
        await Package.findOneAndUpdate({ name: p.name }, { ...p, isActive: true }, { upsert: true, new: true });
    }
    console.log(`  → ${pkgs.length} packages\n`);

    // ── 8. Demo Content — Live Classes ─────────────────────────
    console.log('🎥 Seeding demo content...');
    const mat5 = subjects['5-Matematik'];
    const fen5 = subjects['5-Fen Bilimleri'];
    const tur5 = subjects['5-Türkçe'];
    const mat6 = subjects['6-Matematik'];
    const fen6 = subjects['6-Fen Bilimleri'];
    const mat7 = subjects['7-Matematik'];
    const sos7 = subjects['7-Sosyal Bilgiler'];

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    await LiveClass.deleteMany({ teacherId: { $in: [teacher1._id, teacher2._id] } });
    await LiveClass.insertMany([
        {
            title: 'Doğal Sayılarla İşlemler — Canlı Ders',
            description: '5. sınıf Matematik canlı ders — doğal sayılarla dört işlem.',
            url: 'https://meet.google.com/abc-defg-hij',
            startTime: tomorrow,
            durationMinutes: 40,
            gradeLevel: 5,
            subjectId: mat5._id,
            teacherId: teacher1._id,
        },
        {
            title: 'Kesirlerle Toplama ve Çıkarma — Canlı Ders',
            description: '6. sınıf Matematik canlı ders — kesir işlemleri.',
            url: 'https://zoom.us/j/123456789',
            startTime: nextWeek,
            durationMinutes: 45,
            gradeLevel: 6,
            subjectId: mat6._id,
            teacherId: teacher1._id,
        },
        {
            title: '7. Sınıf Osmanlı Tarihi — Canlı Ders',
            description: '7. sınıf Sosyal Bilgiler — Osmanlı kuruluş dönemi.',
            url: 'https://meet.google.com/xyz-uvwt-klm',
            startTime: twoDays,
            durationMinutes: 40,
            gradeLevel: 7,
            subjectId: sos7._id,
            teacherId: teacher2._id,
        },
    ]);
    console.log('  → 3 live classes');

    // ── 9. Demo Content — Videos ──────────────────────────────
    await Video.deleteMany({ teacherId: { $in: [teacher1._id, teacher2._id] } });
    await Video.insertMany([
        {
            title: 'Doğal Sayılar — Konu Anlatımı',
            description: 'Doğal sayılar konusunun detaylı video anlatımı.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationMinutes: 25,
            gradeLevel: 5,
            subjectId: mat5._id,
            teacherId: teacher1._id,
            views: 142,
        },
        {
            title: 'Maddenin Halleri — Deneylerle Öğrenelim',
            description: 'Katı, sıvı ve gaz hallerini deneylerle açıklıyoruz.',
            videoUrl: 'https://www.youtube.com/watch?v=example2',
            durationMinutes: 18,
            gradeLevel: 5,
            subjectId: fen5._id,
            teacherId: teacher1._id,
            views: 87,
        },
        {
            title: 'Kesirler — Temel Kavramlar',
            description: '6. sınıf kesirler konu anlatımı.',
            videoUrl: 'https://www.youtube.com/watch?v=example3',
            durationMinutes: 30,
            gradeLevel: 6,
            subjectId: mat6._id,
            teacherId: teacher1._id,
            views: 215,
        },
    ]);
    console.log('  → 3 videos');

    // ── 10. Demo Content — Assignments ────────────────────────
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const threeWeeksLater = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

    await Assignment.deleteMany({ teacherId: { $in: [teacher1._id, teacher2._id] } });
    const seededAssignments = await Assignment.insertMany([
        {
            title: 'Doğal Sayılar Çalışma Kağıdı',
            description: 'Doğal sayılarla dört işlem alıştırmaları.',
            dueDate: twoWeeksLater,
            subjectId: mat5._id,
            gradeLevel: 5,
            teacherId: teacher1._id,
            maxScore: 100,
            instructions: 'Tüm soruları çözüp fotoğrafını yükleyin.',
        },
        {
            title: 'Fen Laboratuvar Ödevi',
            description: 'Maddenin halleri deneyi raporu.',
            dueDate: twoWeeksLater,
            subjectId: fen5._id,
            gradeLevel: 5,
            teacherId: teacher1._id,
            maxScore: 50,
            instructions: 'Deney raporunu PDF olarak yükleyin.',
        },
        {
            title: 'Kesirler Test',
            description: '6. sınıf kesirler konusu test çalışması.',
            dueDate: threeWeeksLater,
            subjectId: mat6._id,
            gradeLevel: 6,
            teacherId: teacher1._id,
            maxScore: 100,
        },
        {
            title: '7. Sınıf Tarih Ödevi',
            description: 'Osmanlı Devleti kuruluş dönemi araştırma ödevi.',
            dueDate: threeWeeksLater,
            subjectId: sos7._id,
            gradeLevel: 7,
            teacherId: teacher2._id,
            maxScore: 100,
            instructions: 'En az 2 sayfa araştırma yazısı hazırlayın.',
        },
    ]);
    console.log('  → 4 assignments');

    // ── 11. Demo Content — Questions ──────────────────────────
    await Question.deleteMany({ teacherId: { $in: [teacher1._id, teacher2._id] } });
    const questions: any[] = [
        { text: '24 + 37 işleminin sonucu kaçtır?', options: ['51', '61', '71', '81'], correctAnswer: 1, gradeLevel: 5, subjectId: mat5._id, teacherId: teacher1._id, difficulty: 'EASY' },
        { text: '3/4 ile 1/4 toplamı kaçtır?', options: ['2/4', '4/4', '1/2', '3/8'], correctAnswer: 1, gradeLevel: 5, subjectId: mat5._id, teacherId: teacher1._id, difficulty: 'EASY' },
        { text: '156 × 3 işleminin sonucu kaçtır?', options: ['368', '468', '568', '458'], correctAnswer: 1, gradeLevel: 5, subjectId: mat5._id, teacherId: teacher1._id, difficulty: 'MEDIUM' },
        { text: 'Bir üçgenin iç açıları toplamı kaç derecedir?', options: ['90°', '120°', '180°', '360°'], correctAnswer: 2, gradeLevel: 5, subjectId: mat5._id, teacherId: teacher1._id, difficulty: 'MEDIUM' },
        { text: 'Katı maddelerin belirli bir şekli var mıdır?', options: ['Hayır', 'Evet', 'Bazen', 'Sıcaklığa bağlı'], correctAnswer: 1, gradeLevel: 5, subjectId: fen5._id, teacherId: teacher1._id, difficulty: 'EASY' },
        { text: 'Suyun kaynama sıcaklığı kaç °C dir?', options: ['50°C', '75°C', '100°C', '200°C'], correctAnswer: 2, gradeLevel: 5, subjectId: fen5._id, teacherId: teacher1._id, difficulty: 'EASY' },
        { text: 'Hangi hal değişiminde madde katıdan sıvıya geçer?', options: ['Buharlaşma', 'Erime', 'Yoğuşma', 'Donma'], correctAnswer: 1, gradeLevel: 5, subjectId: fen5._id, teacherId: teacher1._id, difficulty: 'MEDIUM' },
        { text: '48 ÷ 6 işleminin sonucu kaçtır?', options: ['6', '7', '8', '9'], correctAnswer: 2, gradeLevel: 6, subjectId: mat6._id, teacherId: teacher1._id, difficulty: 'EASY' },
        { text: '2/3 kesrinin ondalık gösterimi nedir?', options: ['0,33', '0,50', '0,66', '0,75'], correctAnswer: 2, gradeLevel: 6, subjectId: mat6._id, teacherId: teacher1._id, difficulty: 'MEDIUM' },
        { text: 'Bir karenin çevresi 36 cm ise kenar uzunluğu kaç cm dir?', options: ['6', '8', '9', '12'], correctAnswer: 2, gradeLevel: 6, subjectId: mat6._id, teacherId: teacher1._id, difficulty: 'HARD' },
    ];
    // Link first few questions to sample unit/topic if available
    if (sampleUnit && sampleTopic) {
        questions[0].unitId = sampleUnit._id;
        questions[0].topicId = sampleTopic._id;
        questions[1].unitId = sampleUnit._id;
        questions[1].topicId = sampleTopic._id;
    }
    await Question.insertMany(questions as any);
    console.log('  → 10 questions');

    // ── 12. Demo — Submissions (Exam records) ─────────────────
    console.log('📝 Seeding submissions (exam records)...');
    await Submission.deleteMany({ studentId: { $in: students.map(s => s._id) } });
    const submissionData = [
        // student1 (grade 5) submitted first two assignments
        { assignmentId: seededAssignments[0]._id, studentId: students[0]._id, note: 'Tüm soruları çözdüm.', grade: 85, feedback: 'Başarılı, birkaç dikkatsizlik var.' },
        { assignmentId: seededAssignments[1]._id, studentId: students[0]._id, note: 'Rapor ekte.', grade: 90, feedback: 'Çok güzel hazırlanmış.' },
        // student2 (grade 5) submitted first assignment
        { assignmentId: seededAssignments[0]._id, studentId: students[1]._id, note: 'Çözdüm.', grade: 72, feedback: 'Bazı adımları eksik bırakmışsın.' },
        // student5 (grade 6) submitted third assignment
        { assignmentId: seededAssignments[2]._id, studentId: students[4]._id, note: 'Test tamamlandı.', grade: 95, feedback: 'Mükemmel!' },
        // student8 (grade 7) submitted fourth assignment
        { assignmentId: seededAssignments[3]._id, studentId: students[7]._id, note: 'Araştırma yazımı yükledim.', grade: 88, feedback: 'İyi bir araştırma, kaynakça ekle.' },
    ];
    await Submission.insertMany(
        submissionData.map(s => ({ ...s, fileUrl: '', submittedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) })),
    );
    console.log(`  → ${submissionData.length} submissions\n`);

    // ── 13. Demo — Weekly Schedules ────────────────────────────
    console.log('📅 Seeding weekly schedules...');
    await ScheduleModel.deleteMany({});
    const timeSlots = [
        { startTime: '09:00', endTime: '09:40' },
        { startTime: '09:50', endTime: '10:30' },
        { startTime: '10:40', endTime: '11:20' },
        { startTime: '11:30', endTime: '12:10' },
        { startTime: '13:00', endTime: '13:40' },
    ];

    // Grade 5 weekly schedule (teacher1: Matematik, Türkçe)
    const grade5Schedule = [
        // Pazartesi (1)
        { day: 1, slot: 0, subject: 'Matematik', teacher: teacher1 },
        { day: 1, slot: 1, subject: 'Türkçe', teacher: teacher1 },
        { day: 1, slot: 2, subject: 'Fen Bilimleri', teacher: teacher1 },
        { day: 1, slot: 3, subject: 'Sosyal Bilgiler', teacher: teacher1 },
        // Salı (2)
        { day: 2, slot: 0, subject: 'Türkçe', teacher: teacher1 },
        { day: 2, slot: 1, subject: 'Matematik', teacher: teacher1 },
        { day: 2, slot: 2, subject: 'Sosyal Bilgiler', teacher: teacher1 },
        { day: 2, slot: 3, subject: 'Fen Bilimleri', teacher: teacher1 },
        // Çarşamba (3)
        { day: 3, slot: 0, subject: 'Matematik', teacher: teacher1 },
        { day: 3, slot: 1, subject: 'Fen Bilimleri', teacher: teacher1 },
        { day: 3, slot: 2, subject: 'Türkçe', teacher: teacher1 },
        { day: 3, slot: 3, subject: 'Matematik', teacher: teacher1 },
        // Perşembe (4)
        { day: 4, slot: 0, subject: 'Sosyal Bilgiler', teacher: teacher1 },
        { day: 4, slot: 1, subject: 'Türkçe', teacher: teacher1 },
        { day: 4, slot: 2, subject: 'Matematik', teacher: teacher1 },
        { day: 4, slot: 3, subject: 'Fen Bilimleri', teacher: teacher1 },
        // Cuma (5)
        { day: 5, slot: 0, subject: 'Türkçe', teacher: teacher1 },
        { day: 5, slot: 1, subject: 'Matematik', teacher: teacher1 },
        { day: 5, slot: 2, subject: 'Fen Bilimleri', teacher: teacher1 },
    ];

    // Grade 6 weekly schedule (teacher2: Matematik, Türkçe; teacher1: Fen)
    const grade6Schedule = [
        { day: 1, slot: 0, subject: 'Matematik', teacher: teacher2 },
        { day: 1, slot: 1, subject: 'Fen Bilimleri', teacher: teacher1 },
        { day: 1, slot: 2, subject: 'Türkçe', teacher: teacher2 },
        { day: 1, slot: 3, subject: 'Sosyal Bilgiler', teacher: teacher2 },
        { day: 2, slot: 0, subject: 'Türkçe', teacher: teacher2 },
        { day: 2, slot: 1, subject: 'Matematik', teacher: teacher2 },
        { day: 2, slot: 2, subject: 'Fen Bilimleri', teacher: teacher1 },
        { day: 2, slot: 3, subject: 'Matematik', teacher: teacher2 },
        { day: 3, slot: 0, subject: 'Fen Bilimleri', teacher: teacher1 },
        { day: 3, slot: 1, subject: 'Türkçe', teacher: teacher2 },
        { day: 3, slot: 2, subject: 'Matematik', teacher: teacher2 },
        { day: 3, slot: 3, subject: 'Sosyal Bilgiler', teacher: teacher2 },
        { day: 4, slot: 0, subject: 'Matematik', teacher: teacher2 },
        { day: 4, slot: 1, subject: 'Fen Bilimleri', teacher: teacher1 },
        { day: 4, slot: 2, subject: 'Türkçe', teacher: teacher2 },
        { day: 4, slot: 3, subject: 'Matematik', teacher: teacher2 },
        { day: 5, slot: 0, subject: 'Türkçe', teacher: teacher2 },
        { day: 5, slot: 1, subject: 'Matematik', teacher: teacher2 },
        { day: 5, slot: 2, subject: 'Fen Bilimleri', teacher: teacher1 },
    ];

    // Grade 7 weekly schedule (teacher1: Matematik; teacher2: Sosyal, Fen)
    const grade7Schedule = [
        { day: 1, slot: 0, subject: 'Matematik', teacher: teacher1 },
        { day: 1, slot: 1, subject: 'Sosyal Bilgiler', teacher: teacher2 },
        { day: 1, slot: 2, subject: 'Fen Bilimleri', teacher: teacher2 },
        { day: 1, slot: 3, subject: 'Türkçe', teacher: teacher1 },
        { day: 2, slot: 0, subject: 'Fen Bilimleri', teacher: teacher2 },
        { day: 2, slot: 1, subject: 'Matematik', teacher: teacher1 },
        { day: 2, slot: 2, subject: 'Sosyal Bilgiler', teacher: teacher2 },
        { day: 2, slot: 3, subject: 'Türkçe', teacher: teacher1 },
        { day: 3, slot: 0, subject: 'Matematik', teacher: teacher1 },
        { day: 3, slot: 1, subject: 'Fen Bilimleri', teacher: teacher2 },
        { day: 3, slot: 2, subject: 'Sosyal Bilgiler', teacher: teacher2 },
        { day: 3, slot: 3, subject: 'Matematik', teacher: teacher1 },
        { day: 4, slot: 0, subject: 'Türkçe', teacher: teacher1 },
        { day: 4, slot: 1, subject: 'Matematik', teacher: teacher1 },
        { day: 4, slot: 2, subject: 'Fen Bilimleri', teacher: teacher2 },
        { day: 4, slot: 3, subject: 'Sosyal Bilgiler', teacher: teacher2 },
        { day: 5, slot: 0, subject: 'Matematik', teacher: teacher1 },
        { day: 5, slot: 1, subject: 'Sosyal Bilgiler', teacher: teacher2 },
        { day: 5, slot: 2, subject: 'Fen Bilimleri', teacher: teacher2 },
    ];

    const allSchedules = [
        ...grade5Schedule.map(s => ({ ...s, grade: 5 })),
        ...grade6Schedule.map(s => ({ ...s, grade: 6 })),
        ...grade7Schedule.map(s => ({ ...s, grade: 7 })),
    ];

    const scheduleDocs = allSchedules.map(s => ({
        gradeId: grades[s.grade]._id,
        subjectId: subjects[`${s.grade}-${s.subject}`]._id,
        teacherId: s.teacher._id,
        dayOfWeek: s.day,
        startTime: timeSlots[s.slot].startTime,
        endTime: timeSlots[s.slot].endTime,
        room: `${s.grade}-${String.fromCharCode(65 + (s.day % 3))}`,
        isActive: true,
    }));

    await ScheduleModel.insertMany(scheduleDocs);
    console.log(`  → ${scheduleDocs.length} schedule entries across 3 grades\n`);

    // ── Done ───────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════');
    console.log('✅ SEED COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('Demo Login Bilgileri (Tüm şifre: Password123!)');
    console.log('  Admin:    admin@atlas.com');
    console.log('  Teacher1: teacher1@atlas.com');
    console.log('  Teacher2: teacher2@atlas.com');
    console.log('  Student:  student1@atlas.com .. student10@atlas.com');
    console.log('  Parent:   parent1@atlas.com  .. parent5@atlas.com');
    console.log('');

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
