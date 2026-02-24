/**
 * Atlas Derslik — Gerçek Öğrenci & Öğretmen Seed Script (API-based)
 * CSV'deki gerçek verileri çalışan API sunucusu üzerinden MongoDB'ye aktarır.
 *
 * Usage:  node apps/api/src/seed-students.mjs
 * Prerequisite: API server must be running on localhost:3001
 */

const API_URL = 'http://localhost:3001';
const DEFAULT_PASSWORD = 'Atlas2024!';

// ─── Data from CSV ───────────────────────────────────────────────────────────

const TEACHERS = [
    { email: 'misracetin560@gmail.com', firstName: 'Mısra', lastName: 'Çetin', subject: 'Matematik', phone: '5421069692' },
    { email: 'oguzhan70034@gmail.com', firstName: 'Oğuzhan', lastName: 'Öğretmen', subject: 'Türkçe', phone: '5376278760' },
    { email: 'metehanacademy@gmail.com', firstName: 'Metehan', lastName: 'Hüyüklü', subject: 'Sosyal Bilgiler', phone: '5531161152' },
    { email: 'blltmerve@gmail.com', firstName: 'Merve', lastName: 'Bolat', subject: 'İngilizce', phone: '5451712003' },
];

const STUDENTS_BY_GRADE = {
    5: [
        { firstName: 'Ceren', lastName: 'Çekinmezer', email: 'cekinmezerfiliz@gmail.com', phone: '5388701080' },
        { firstName: 'Defne', lastName: 'Sevimli', email: 'tubareyyaneliz@gmail.com', phone: '5447989420' },
        { firstName: 'Damla', lastName: 'Özkaya', email: 'dilayercan2017@gmail.com', phone: '5424905482' },
        { firstName: 'İpek Ecem', lastName: 'Çağlar', email: 'caglaripekecem@gmail.com', phone: '5387062472' },
        { firstName: 'Elif', lastName: 'Ece', email: 'gulizarece1985@gmail.com', phone: '5064245401' },
        { firstName: 'Elif', lastName: 'Yavuz', email: 'elifyvz077@gmail.com', phone: '5388996061' },
        { firstName: 'Zümra', lastName: 'Çolak', email: 'serifecolak1983@gmail.com', phone: '5373853951' },
        { firstName: 'Duru', lastName: 'Kayalı', email: 'belginkayali0707@gmail.com', phone: '5368562694' },
        { firstName: 'Mehmet Berat', lastName: 'Durur', email: 'neslicankonus@gmail.com', phone: '5064710189' },
    ],
    6: [
        { firstName: 'Elif', lastName: 'Sarıkaya', email: 'elifnisasarikaya09@gmail.com', phone: '5063808932' },
        { firstName: 'Mete Kemal', lastName: 'Dinçer', email: 'dincerkemer@yahoo.com', phone: '5057336916' },
        { firstName: 'Anisa', lastName: 'Aksungur', email: 'anisaaksungur@gmail.com', phone: '5369497161' },
        { firstName: 'Hatice', lastName: 'Öztürk', email: 'muradiyeozturk061@gmail.com', phone: '5433092497' },
        { firstName: 'Miraç', lastName: 'Atalay', email: 'yalcin07_38@hotmail.com', phone: '5392671639' },
    ],
    7: [
        { firstName: 'Ali Aras', lastName: 'Çetin', email: 'mcetin5254@gmail.com', phone: '5415455398' },
        { firstName: 'Ela', lastName: 'Tüfekçiyaşar', email: 'zeynepela@gmail.com', phone: '5077462933' },
        { firstName: 'Yağmur', lastName: 'Özkaya', email: 'dilayercan2017+sinif7@gmail.com', phone: '5424905482' },
        { firstName: 'Ilgın', lastName: 'Sevin', email: 'adnanselcuk12@icloud.com', phone: '5518258362' },
        { firstName: 'Çınar Anıl', lastName: 'Üyütgen', email: 'safakuyutgen750@gmail.com', phone: '5359732788' },
    ],
    8: [
        { firstName: 'Ceylin', lastName: 'Öğrenci', email: 'elifgpkay@gmail.com', phone: '5383997238' },
        { firstName: 'Ramazan', lastName: 'Çolak', email: 'serifecolak1983+sinif8@gmail.com', phone: '5373853951' },
        { firstName: 'Kuzey', lastName: 'Uğurlu', email: 'ayseugurlu16@gmail.com', phone: '5325049413' },
        { firstName: 'Sidar', lastName: 'Divarcı', email: 'amadeus44200@hotmail.com', phone: '5055795240' },
        { firstName: 'Emir', lastName: 'Ozarslan', email: 'asliozaslan53@gmail.com', phone: '5337714135' },
    ],
};

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
        // Try with original seed password
        const loginRes2 = await apiPost('/auth/login', { email: userData.email, password: 'Password123!' });
        if (!loginRes2.error && loginRes2.data.user) {
            return loginRes2.data.user;
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

    // Try to login with existing admin
    let adminToken = null;
    const adminLoginRes = await apiPost('/auth/login', { email: 'admin@atlas.com', password: 'Password123!' });
    if (!adminLoginRes.error && adminLoginRes.data.access_token) {
        adminToken = adminLoginRes.data.access_token;
        console.log('  ✓ Mevcut admin hesabı ile giriş yapıldı\n');
    } else {
        // Try Atlas2024!
        const adminLoginRes2 = await apiPost('/auth/login', { email: 'admin@atlas.com', password: DEFAULT_PASSWORD });
        if (!adminLoginRes2.error && adminLoginRes2.data.access_token) {
            adminToken = adminLoginRes2.data.access_token;
            console.log('  ✓ Mevcut admin hesabı ile giriş yapıldı\n');
        } else {
            // Register new admin
            const adminRegRes = await apiPost('/auth/register', {
                email: 'admin@atlas.com',
                password: DEFAULT_PASSWORD,
                firstName: 'Atlas',
                lastName: 'Admin',
                role: 'ADMIN',
            });
            if (adminRegRes.error) {
                console.error('  ❌ Admin hesabı oluşturulamadı:', adminRegRes.data);
                process.exit(1);
            }
            const loginAfterReg = await apiPost('/auth/login', { email: 'admin@atlas.com', password: DEFAULT_PASSWORD });
            if (loginAfterReg.error) {
                console.error('  ❌ Admin giriş yapılamadı:', loginAfterReg.data);
                process.exit(1);
            }
            adminToken = loginAfterReg.data.access_token;
            console.log('  ✓ Yeni admin hesabı oluşturuldu ve giriş yapıldı\n');
        }
    }

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
    console.log(`🔑 Varsayılan Şifre: ${DEFAULT_PASSWORD}`);
    console.log('');
    console.log('👩‍🏫 Öğretmen Giriş Bilgileri:');
    for (const t of TEACHERS) {
        console.log(`  ${t.firstName} ${t.lastName.padEnd(15)} → ${t.email.padEnd(35)} Şifre: ${DEFAULT_PASSWORD}`);
    }
    console.log('');
    console.log('🎓 Öğrenci Giriş Bilgileri:');
    for (const [grade, students] of Object.entries(STUDENTS_BY_GRADE)) {
        console.log(`  ${grade}. Sınıf:`);
        for (const s of students) {
            console.log(`    ${(s.firstName + ' ' + s.lastName).padEnd(25)} → ${s.email.padEnd(40)} Şifre: ${DEFAULT_PASSWORD}`);
        }
    }
    console.log('');
    console.log('ℹ️  Giriş: E-posta + Şifre (Atlas2024!)');
    console.log('');
}

seedStudents().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
