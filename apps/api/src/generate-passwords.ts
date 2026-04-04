/**
 * Atlas Derslik — Benzersiz Şifre Oluşturucu
 * Her öğrenci, öğretmen ve veli için benzersiz şifre oluşturur.
 * Sonuçları konsola tablo olarak ve CSV dosyası olarak yazdırır.
 *
 * Usage: cd apps/api && npx ts-node src/generate-passwords.ts
 */

import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb+srv://atlasderslik:2002%2E2002@atlasderslik.7qapnxz.mongodb.net/atlas-derslik?retryWrites=true&w=majority&appName=atlasderslik';

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
        address: { type: String, default: '' },
        city: { type: String, default: '' },
        identityNumber: { type: String, default: '11111111111' },
    },
    { timestamps: true },
);

const User = mongoose.model('User', userSchema);

// ─── Şifre Oluşturucu ──────────────────────────────────────

function generatePassword(firstName: string, grade?: number): string {
    // Format: İsim + 4 rastgele rakam + özel karakter
    // Örnek: Ceren4782!, Defne9213!
    const cleanName = firstName
        .split(' ')[0] // İlk ismi al
        .charAt(0).toUpperCase() + firstName.split(' ')[0].slice(1).toLowerCase();
    const digits = Math.floor(1000 + Math.random() * 9000); // 4 haneli rastgele sayı
    const specials = ['!', '@', '#', '$'];
    const special = specials[Math.floor(Math.random() * specials.length)];
    return `${cleanName}${digits}${special}`;
}

async function main() {
    console.log('🔐 Atlas Derslik — Benzersiz Şifre Oluşturucu');
    console.log('═══════════════════════════════════════════');
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB bağlantısı kuruldu\n');

    // Admin hariç tüm kullanıcıları getir
    const users = await User.find({ role: { $ne: 'ADMIN' } }).sort({ role: 1, grade: 1, firstName: 1 }).exec();

    const credentials: { role: string; name: string; email: string; password: string; grade?: number }[] = [];

    console.log('🔄 Şifreler oluşturuluyor...\n');

    for (const user of users) {
        const password = generatePassword(user.firstName, user.grade ?? undefined);
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);

        await User.findByIdAndUpdate(user._id, { passwordHash });

        credentials.push({
            role: user.role,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            password,
            grade: user.grade ?? undefined,
        });
    }

    // ── ÖĞRETMENLER ──
    const teachers = credentials.filter(c => c.role === 'TEACHER');
    if (teachers.length) {
        console.log('👩‍🏫 ÖĞRETMENLER');
        console.log('─'.repeat(80));
        console.log('  İsim'.padEnd(25) + 'E-posta'.padEnd(35) + 'Şifre');
        console.log('─'.repeat(80));
        for (const t of teachers) {
            console.log(`  ${t.name.padEnd(23)} ${t.email.padEnd(33)} ${t.password}`);
        }
        console.log('');
    }

    // ── ÖĞRENCİLER (sınıfa göre) ──
    for (const gradeLevel of [5, 6, 7, 8]) {
        const students = credentials.filter(c => c.role === 'STUDENT' && c.grade === gradeLevel);
        if (students.length) {
            console.log(`📚 ${gradeLevel}. SINIF ÖĞRENCİLER`);
            console.log('─'.repeat(80));
            console.log('  İsim'.padEnd(25) + 'E-posta'.padEnd(45) + 'Şifre');
            console.log('─'.repeat(80));
            for (const s of students) {
                console.log(`  ${s.name.padEnd(23)} ${s.email.padEnd(43)} ${s.password}`);
            }
            console.log('');
        }
    }

    // ── VELİLER ──
    const parents = credentials.filter(c => c.role === 'PARENT');
    if (parents.length) {
        console.log('👨‍👩‍👧 VELİLER');
        console.log('─'.repeat(80));
        console.log('  İsim'.padEnd(25) + 'E-posta'.padEnd(35) + 'Şifre');
        console.log('─'.repeat(80));
        for (const p of parents) {
            console.log(`  ${p.name.padEnd(23)} ${p.email.padEnd(33)} ${p.password}`);
        }
        console.log('');
    }

    // ── CSV çıktısı ──
    const csvLines = ['Rol,İsim,E-posta,Şifre,Sınıf'];
    for (const c of credentials) {
        csvLines.push(`${c.role},"${c.name}",${c.email},${c.password},${c.grade || ''}`);
    }
    const csvPath = path.join(__dirname, '..', '..', '..', 'atlas-sifreler.csv');
    fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');
    console.log(`📄 Tüm şifreler CSV olarak kaydedildi: ${csvPath}`);

    console.log('\n═══════════════════════════════════════════');
    console.log(`✅ Toplam ${credentials.length} kullanıcı için benzersiz şifre oluşturuldu`);
    console.log('⚠️  Admin şifresi değiştirilmedi (admin@atlasderslik.com / AtlasAdmin2026!)');
    console.log('═══════════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Hata:', err);
    process.exit(1);
});
