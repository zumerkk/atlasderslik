import { readFileSync } from 'node:fs';
/**
 * Atlas Derslik — Gerçek Öğrenci & Öğretmen Seed Script
 * CSV dosyasındaki gerçek verileri MongoDB Atlas'a aktarır.
 *
 * Usage:  cd apps/api && npx ts-node src/seed-students.ts
 */

import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

function requiredEnvironment(name: string): string {
    const value = process.env[name];
    if (!value?.trim()) throw new Error(`${name} is required; credentials must be supplied through the environment.`);
    return value;
}

const MONGO_URI = requiredEnvironment('MONGO_URI');

// Tüm kullanıcıların varsayılan şifresi
const DEFAULT_PASSWORD = requiredEnvironment('SEED_USER_PASSWORD');


// Personal import records stay outside source control. Supply an explicit private JSON path.
function loadPrivateSeedUsers(): Record<string, any> {
    const filePath = requiredEnvironment('SEED_USERS_FILE');
    let data: any;
    try {
        data = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
        throw new Error('SEED_USERS_FILE must point to a readable private JSON file.');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('SEED_USERS_FILE must contain a JSON object.');
    }
    const fields = {"TEACHERS":["email","firstName","lastName","subject","phone"],"STUDENTS_BY_GRADE":["firstName","lastName","email","phone"]};
    for (const [key, required] of Object.entries(fields)) {
        const groups = key === 'STUDENTS_BY_GRADE' ? [5, 6, 7, 8].map((grade) => data[key]?.[grade]) : [data[key]];
        for (const records of groups) {
            if (!Array.isArray(records) || records.some((record) => !record || required.some((field) => typeof record[field] !== 'string' || !record[field].trim()))) {
                throw new Error(`SEED_USERS_FILE contains missing or invalid ${key} records.`);
            }
        }
    }
    return data;
}

const privateSeedUsers = loadPrivateSeedUsers();

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

// ─── Models ──────────────────────────────────────────────────────────────────

const User = mongoose.model('User', userSchema);
const Grade = mongoose.model('Grade', gradeSchema);
const Subject = mongoose.model('Subject', subjectSchema);
const TeacherAssignment = mongoose.model('TeacherAssignment', teacherAssignmentSchema);
const StudentEnrollment = mongoose.model('StudentEnrollment', studentEnrollmentSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hash(pw: string) {
    return bcrypt.hash(pw, await bcrypt.genSalt());
}

async function upsertUser(data: { email: string; firstName: string; lastName: string; role: string; grade?: number }) {
    const passwordHash = await hash(DEFAULT_PASSWORD);
    return User.findOneAndUpdate(
        { email: data.email },
        { ...data, passwordHash, isActive: true, assignedSubjects: [] },
        { upsert: true, new: true },
    );
}

// ─── Data from CSV ───────────────────────────────────────────────────────────

const TEACHERS = privateSeedUsers.TEACHERS as { email: string; firstName: string; lastName: string; subject: string; phone: string }[];

const STUDENTS_BY_GRADE = privateSeedUsers.STUDENTS_BY_GRADE as Record<number, { firstName: string; lastName: string; email: string; phone: string }[]>;

// ─── Main Seed ───────────────────────────────────────────────────────────────

async function seedStudents() {
    console.log('🚀 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // ── 1. Grades (ensure 5, 6, 7, 8 exist) ──────────────────
    console.log('📚 Ensuring grades 5-8 exist...');
    const grades: Record<number, any> = {};
    for (const lvl of [5, 6, 7, 8]) {
        grades[lvl] = await Grade.findOneAndUpdate(
            { level: lvl },
            { level: lvl, isActive: true },
            { upsert: true, new: true },
        );
    }
    console.log('  → Grades 5, 6, 7, 8 ready\n');

    // ── 2. İngilizce Subject (add for all grades) ─────────────
    console.log('📖 Adding İngilizce subject for all grades...');
    const subjectNames = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'];
    const subjects: Record<string, any> = {};
    for (const gl of [5, 6, 7, 8]) {
        for (const name of subjectNames) {
            const key = `${gl}-${name}`;
            subjects[key] = await Subject.findOneAndUpdate(
                { name, gradeLevel: gl },
                { name, gradeLevel: gl, isActive: true },
                { upsert: true, new: true },
            );
        }
    }
    console.log(`  → ${Object.keys(subjects).length} subjects ensured across 4 grades\n`);

    // ── 3. Teachers ───────────────────────────────────────────
    console.log('👩‍🏫 Seeding real teachers...');
    const teacherDocs: any[] = [];
    for (const t of TEACHERS) {
        const doc = await upsertUser({
            email: t.email.trim().toLowerCase(),
            firstName: t.firstName,
            lastName: t.lastName,
            role: 'TEACHER',
        });
        teacherDocs.push({ ...t, doc });
        console.log(`  ✓ ${t.firstName} ${t.lastName} → ${t.email} (${t.subject})`);
    }
    console.log('');

    // ── 4. Teacher Assignments (each teacher → all grades for their subject) ──
    console.log('📋 Seeding teacher assignments...');
    let taCount = 0;
    for (const t of teacherDocs) {
        for (const gl of [5, 6, 7, 8]) {
            const subjectKey = `${gl}-${t.subject}`;
            const subject = subjects[subjectKey];
            if (!subject) continue;
            await TeacherAssignment.findOneAndUpdate(
                { gradeId: grades[gl]._id, subjectId: subject._id, teacherId: t.doc._id },
                { gradeId: grades[gl]._id, subjectId: subject._id, teacherId: t.doc._id, notes: '' },
                { upsert: true, new: true },
            );
            taCount++;
        }
    }
    console.log(`  → ${taCount} teacher assignments\n`);

    // ── 5. Students ───────────────────────────────────────────
    console.log('🎓 Seeding real students...');
    let studentTotal = 0;
    let enrollmentCount = 0;

    // Track processed emails to handle duplicates across grades
    const processedEmails: Record<string, { grade: number; name: string }> = {};

    for (const [gradeStr, studentList] of Object.entries(STUDENTS_BY_GRADE)) {
        const gradeLevel = parseInt(gradeStr);
        console.log(`\n  📗 ${gradeLevel}. Sınıf — ${studentList.length} öğrenci:`);

        for (const s of studentList) {
            const email = s.email.trim().toLowerCase();

            // Handle duplicate email across grades while preserving each student record.
            // Use unique email for the second occurrence
            let finalEmail = email;
            if (processedEmails[email]) {
                // Create a unique email by adding grade suffix
                const [localPart, domain] = email.split('@');
                finalEmail = `${localPart}+sinif${gradeLevel}@${domain}`;
                console.log(`    ⚠ Duplicate email detected: ${email} (already used for ${processedEmails[email].name})`);
                console.log(`      → Using: ${finalEmail}`);
            }
            processedEmails[finalEmail] = { grade: gradeLevel, name: `${s.firstName} ${s.lastName}` };

            const studentDoc = await upsertUser({
                email: finalEmail,
                firstName: s.firstName,
                lastName: s.lastName,
                role: 'STUDENT',
                grade: gradeLevel,
            });
            studentTotal++;

            // Create enrollment
            await StudentEnrollment.findOneAndUpdate(
                { studentId: studentDoc._id },
                { studentId: studentDoc._id, gradeId: grades[gradeLevel]._id },
                { upsert: true, new: true },
            );
            enrollmentCount++;

            console.log(`    ✓ ${s.firstName} ${s.lastName} → ${finalEmail} (Sınıf ${gradeLevel})`);
        }
    }

    console.log(`\n  → ${studentTotal} öğrenci, ${enrollmentCount} kayıt\n`);

    // ── Summary ───────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ GERÇEK VERİ SEED TAMAMLANDI');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Özet:');
    console.log(`  Öğretmenler: ${TEACHERS.length} kişi`);
    console.log(`  Öğrenciler:  ${studentTotal} kişi`);
    console.log(`  Enrollments: ${enrollmentCount}`);
    console.log(`  Teacher Atama: ${taCount}`);
    console.log('');
    console.log('Credentials were supplied through the environment or saved in the private credentials file.');
    console.log('');
    console.log('👩‍🏫 Öğretmenler:');
    for (const t of TEACHERS) {
        console.log(`  ${t.firstName} ${t.lastName} → ${t.email} (${t.subject})`);
    }
    console.log('');
    console.log('🎓 Öğrenciler (her sınıf):');
    for (const [grade, students] of Object.entries(STUDENTS_BY_GRADE)) {
        console.log(`  ${grade}. Sınıf: ${students.map(s => `${s.firstName} ${s.lastName}`).join(', ')}`);
    }
    console.log('');
    console.log('ℹ️  Giriş: E-posta + Şifre ([environment password])');
    console.log('');

    await mongoose.disconnect();
    process.exit(0);
}

seedStudents().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
