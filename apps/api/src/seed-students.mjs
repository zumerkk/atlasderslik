import { readFileSync } from 'node:fs';
/**
 * Atlas Derslik — Gerçek Öğrenci & Öğretmen Seed Script (API-based)
 * CSV'deki gerçek verileri çalışan API sunucusu üzerinden MongoDB'ye aktarır.
 *
 * Usage:  node apps/api/src/seed-students.mjs
 * Prerequisite: API server must be running on localhost:3001
 */

const API_URL = 'http://localhost:3001';
function requiredEnvironment(name) {
    const value = process.env[name];
    if (!value?.trim()) throw new Error(`${name} is required; credentials must be supplied through the environment.`);
    return value;
}

const DEFAULT_PASSWORD = requiredEnvironment('SEED_USER_PASSWORD');
const ADMIN_PASSWORD = requiredEnvironment('SEED_ADMIN_PASSWORD');
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@atlas.com';


// Personal import records stay outside source control. Supply an explicit private JSON path.
function loadPrivateSeedUsers() {
    const filePath = requiredEnvironment('SEED_USERS_FILE');
    let data;
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

// ─── Data from CSV ───────────────────────────────────────────────────────────

const TEACHERS = privateSeedUsers.TEACHERS;

const STUDENTS_BY_GRADE = privateSeedUsers.STUDENTS_BY_GRADE;

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function apiPost(path, body, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok && res.status !== 409) { // 409 = duplicate, ok for upserts
        return { error: true, status: res.status, data };
    }
    return { error: false, status: res.status, data };
}

async function apiGet(path, token = null) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, { headers });
    return res.json();
}

async function registerUser(userData) {
    const res = await apiPost('/auth/register', userData);
    if (res.error) {
        // Try to find the user by email via login (might already exist)
        const loginRes = await apiPost('/auth/login', { email: userData.email, password: DEFAULT_PASSWORD });
        if (!loginRes.error && loginRes.data.user) {
            return loginRes.data.user;
        }
        console.log(`    ⚠ Could not register/find: ${userData.email} - ${JSON.stringify(res.data)}`);
        return null;
    }
    return res.data;
}

// ─── Main Seed ───────────────────────────────────────────────────────────────

async function seedStudents() {
    console.log('🚀 Atlas Derslik — Gerçek Öğrenci & Öğretmen Seed');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // ── Step 0: Get admin token ──────────────────────────────
    console.log('🔐 Admin token alınıyor...');

    const adminLoginRes = await apiPost('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (adminLoginRes.error || !adminLoginRes.data.access_token || adminLoginRes.data.user?.role !== 'ADMIN') {
        throw new Error('Admin login failed. Provide existing admin credentials through SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.');
    }
    const adminToken = adminLoginRes.data.access_token;
    console.log('  ✓ Mevcut admin hesabı ile giriş yapıldı\n');

    // ── Step 1: Grades ──────────────────────────────────────
    console.log('📚 Sınıflar kontrol ediliyor...');
    const existingGrades = await apiGet('/education/grades', adminToken);
    const gradeMap = {};
    for (const g of existingGrades) {
        gradeMap[g.level] = g;
    }
    // Create missing grades (especially 8)
    for (const level of [5, 6, 7, 8]) {
        if (!gradeMap[level]) {
            const res = await apiPost('/education/grades', { level }, adminToken);
            if (!res.error) {
                gradeMap[level] = res.data;
                console.log(`  ✓ ${level}. sınıf oluşturuldu`);
            } else {
                console.log(`  ⚠ ${level}. sınıf oluşturulamadı: ${JSON.stringify(res.data)}`);
            }
        } else {
            console.log(`  ✓ ${level}. sınıf mevcut`);
        }
    }
    console.log('');

    // ── Step 2: Subjects ────────────────────────────────────
    console.log('📖 İngilizce dersi ekleniyor...');
    const allSubjects = await apiGet('/education/subjects/all', adminToken);
    const subjectMap = {};
    for (const s of allSubjects) {
        subjectMap[`${s.gradeLevel}-${s.name}`] = s;
    }
    // Add İngilizce for each grade + any missing subjects for grade 8
    const requiredSubjects = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'];
    for (const level of [5, 6, 7, 8]) {
        for (const name of requiredSubjects) {
            const key = `${level}-${name}`;
            if (!subjectMap[key]) {
                const res = await apiPost('/education/subjects', { name, gradeLevel: level }, adminToken);
                if (!res.error) {
                    subjectMap[key] = res.data;
                    console.log(`  ✓ ${level}. sınıf ${name} oluşturuldu`);
                }
            }
        }
    }
    console.log('');

    // ── Step 3: Teachers ────────────────────────────────────
    console.log('👩‍🏫 Öğretmenler ekleniyor...');
    const teacherDocs = [];
    for (const t of TEACHERS) {
        const email = t.email.trim().toLowerCase();
        const user = await registerUser({
            email,
            password: DEFAULT_PASSWORD,
            firstName: t.firstName,
            lastName: t.lastName,
            role: 'TEACHER',
        });
        if (user) {
            teacherDocs.push({ ...t, id: user._id });
            console.log(`  ✓ ${t.firstName} ${t.lastName} → ${email} (${t.subject})`);
        }
    }
    console.log('');

    // ── Step 4: Teacher Assignments ─────────────────────────
    console.log('📋 Öğretmen atamaları yapılıyor...');
    let taCount = 0;
    for (const t of teacherDocs) {
        for (const level of [5, 6, 7, 8]) {
            const subjectKey = `${level}-${t.subject}`;
            const subject = subjectMap[subjectKey];
            const grade = gradeMap[level];
            if (!subject || !grade || !t.id) continue;
            const res = await apiPost('/education/teacher-assignments', {
                gradeId: grade._id,
                subjectId: subject._id,
                teacherId: t.id,
            }, adminToken);
            if (!res.error) {
                taCount++;
            }
        }
    }
    console.log(`  → ${taCount} öğretmen ataması yapıldı\n`);

    // ── Step 5: Students ────────────────────────────────────
    console.log('🎓 Öğrenciler ekleniyor...');
    let studentTotal = 0;
    let enrollmentCount = 0;

    for (const [gradeStr, studentList] of Object.entries(STUDENTS_BY_GRADE)) {
        const gradeLevel = parseInt(gradeStr);
        const grade = gradeMap[gradeLevel];
        console.log(`\n  📗 ${gradeLevel}. Sınıf — ${studentList.length} öğrenci:`);

        for (const s of studentList) {
            const email = s.email.trim().toLowerCase();
            const user = await registerUser({
                email,
                password: DEFAULT_PASSWORD,
                firstName: s.firstName,
                lastName: s.lastName,
                role: 'STUDENT',
                grade: gradeLevel,
            });

            if (user && grade) {
                studentTotal++;
                // Create enrollment
                const enrollRes = await apiPost('/education/student-enrollments', {
                    studentId: user._id,
                    gradeId: grade._id,
                }, adminToken);
                if (!enrollRes.error) {
                    enrollmentCount++;
                }
                console.log(`    ✓ ${s.firstName} ${s.lastName} → ${email}`);
            } else {
                console.log(`    ⚠ ${s.firstName} ${s.lastName} → ${email} (HATA)`);
            }
        }
    }

    // ── Summary ───────────────────────────────────────────────
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ GERÇEK VERİ SEED TAMAMLANDI');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Özet:');
    console.log(`  Öğretmenler: ${teacherDocs.length} kişi`);
    console.log(`  Öğrenciler:  ${studentTotal} kişi`);
    console.log(`  Enrollments: ${enrollmentCount}`);
    console.log(`  Teacher Atama: ${taCount}`);
    console.log('');
    console.log('Credentials were supplied through the environment.');
    console.log('');
    console.log('👩‍🏫 Öğretmen Giriş Bilgileri:');
    for (const t of TEACHERS) {
    console.log('Credentials were supplied through the environment.');
    }
    console.log('');
    console.log('🎓 Öğrenci Giriş Bilgileri:');
    for (const [grade, students] of Object.entries(STUDENTS_BY_GRADE)) {
        console.log(`  ${grade}. Sınıf:`);
        for (const s of students) {
    console.log('Credentials were supplied through the environment.');
        }
    }
    console.log('');
    console.log('ℹ️  Giriş: E-posta + Şifre ([environment password])');
    console.log('');
}

seedStudents().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
