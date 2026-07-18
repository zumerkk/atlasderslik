// String olarak kaydedilmiş ObjectId alanlarını gerçek ObjectId'ye çevirir.
// Kök neden: @Prop({ type: Types.ObjectId }) Mongoose 9'da Mixed'e düşüyordu (cast yok),
// bu yüzden submissions.assignmentId/studentId, videos/assignments.gradeId/subjectId
// gibi alanlar string kaydedildi ve ObjectId ile yapılan sorgulara eşleşmedi.
//
// Kullanım (repo kökünden):
//   NODE_PATH=apps/api/node_modules node migrate-string-ids.js           → dry-run (raporlar)
//   NODE_PATH=apps/api/node_modules node migrate-string-ids.js --apply   → uygular
// Not: Deploy tamamlandıktan sonra bir kez daha çalıştırın — eski API'nin
// deploy anına kadar string yazdığı yeni teslimler varsa onları da çevirir.
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const HEX24 = /^[0-9a-fA-F]{24}$/;

// Koleksiyon başına dönüştürülecek alanlar (şemalardaki ref alanları)
const FIELDS = {
    submissions: ['assignmentId', 'studentId'],
    assignments: ['subjectId', 'gradeId', 'teacherId', 'liveClassId'],
    videos: ['subjectId', 'gradeId', 'topicId', 'teacherId'],
    liveclasses: ['subjectId', 'gradeId', 'teacherId'],
    questions: ['subjectId', 'unitId', 'topicId', 'teacherId'],
    teacherassignments: ['gradeId', 'subjectId', 'teacherId'],
    studentenrollments: ['studentId', 'gradeId', 'assignedBy'],
    schedules: ['gradeId', 'subjectId', 'teacherId'],
    units: ['subjectId'],
    topics: ['unitId'],
    users: ['parentId'],
    tests: ['subjectId', 'teacherId'],
    testresults: ['testId', 'studentId'],
    orders: ['userId', 'packageId'],
};

function loadUri() {
    if (process.env.MONGO_URI) return process.env.MONGO_URI;
    const envFile = fs.readFileSync(path.join(__dirname, 'apps/api/.env'), 'utf8');
    const line = envFile.split('\n').find((l) => l.startsWith('MONGO_URI'));
    return line.split(/=(.*)/)[1].trim().replace(/^["']|["']$/g, '');
}

async function run() {
    await mongoose.connect(loadUri());
    const db = mongoose.connection.db;
    let totalUpdated = 0;

    for (const [collName, fields] of Object.entries(FIELDS)) {
        const coll = db.collection(collName);
        for (const field of fields) {
            // Sadece 24 haneli hex string olan değerleri hedefle
            const docs = await coll
                .find({ [field]: { $type: 'string' } })
                .project({ [field]: 1 })
                .toArray();

            // Boş / geçersiz string değerleri kaldır (ObjectId cast hatasına yol açar)
            const invalid = docs.filter((d) => !HEX24.test(d[field]));
            if (invalid.length) {
                console.log(`${collName}.${field}: ${invalid.length} geçersiz string (örn. boş) ${APPLY ? '→ kaldırılıyor' : '(dry-run)'}`);
                if (APPLY) {
                    await coll.updateMany(
                        { _id: { $in: invalid.map((d) => d._id) } },
                        { $unset: { [field]: 1 } },
                    );
                }
            }

            const targets = docs.filter((d) => HEX24.test(d[field]));
            if (!targets.length) continue;

            console.log(`${collName}.${field}: ${targets.length} string kayıt${APPLY ? ' → ObjectId\'ye çevriliyor' : ' (dry-run)'}`);
            totalUpdated += targets.length;

            if (APPLY) {
                const ops = targets.map((d) => ({
                    updateOne: {
                        filter: { _id: d._id },
                        update: { $set: { [field]: new mongoose.Types.ObjectId(d[field]) } },
                    },
                }));
                const res = await coll.bulkWrite(ops);
                console.log(`  ✓ ${res.modifiedCount} güncellendi`);
            }
        }
    }

    console.log(APPLY
        ? `\nToplam ${totalUpdated} alan ObjectId'ye çevrildi.`
        : `\nToplam ${totalUpdated} alan çevrilecek. Uygulamak için: node migrate-string-ids.js --apply`);
    process.exit(0);
}

run().catch((e) => {
    console.error('Migration hatası:', e.message);
    process.exit(1);
});
