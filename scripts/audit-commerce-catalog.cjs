#!/usr/bin/env node
'use strict';

// Read-only public API audit. Does not read secrets, sign in, change prices,
// publish products, enroll students or initialize a payment.
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const values = { allLevelPackages: [] };
for (let i = 0; i < args.length; i++) {
    const flag = args[i], value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Değer eksik: ${flag}`);
    if (flag === '--api') values.api = value;
    else if (flag === '--output') values.output = value;
    else if (flag === '--all-level-package' && /^[a-f\d]{24}$/i.test(value)) values.allLevelPackages.push(value.toLowerCase());
    else throw new Error(`Geçersiz seçenek: ${flag}`);
}

async function main() {
    if (!values.api) throw new Error('Kullanım: node scripts/audit-commerce-catalog.cjs --api https://api.example.com [--output rapor.json] [--all-level-package PAKET_ID]');
    const base = new URL(values.api);
    if (base.username || base.password || base.search || base.hash || base.pathname !== '/' || !['http:', 'https:'].includes(base.protocol)
        || (base.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) throw new Error('API kök adresi HTTPS veya yerel HTTP olmalıdır; kimlik/sorgu bilgisi içermemelidir.');
    async function get(route) {
        const response = await fetch(new URL(route, base), { redirect: 'error', signal: AbortSignal.timeout(60000) });
        if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error(`${route}: Katalog yanıtı liste değil.`);
        return data;
    }
    const [packages, grades] = await Promise.all([get('/packages/active'), get('/education/grades')]);
    const levels = Array.from({ length: 8 }, (_, i) => i + 1).map(level => ({ level,
        candidates: grades.filter(grade => grade.isActive === true && grade.level === level).map(grade => ({ id: String(grade._id), label: String(grade.label || '') })),
    }));
    const reports = packages.map(pkg => {
        const ids = Array.isArray(pkg.gradeIds) ? pkg.gradeIds.map(String) : [];
        const selected = ids.map(id => grades.find(grade => String(grade._id) === id));
        const policy = pkg.gradePolicy || 'fixed';
        const issues = [];
        if (!ids.length) issues.push('Ders erişimi için sınıf eşleştirmesi yok.');
        if (selected.some(grade => !grade || grade.isActive !== true || !Number.isInteger(grade.level) || grade.level < 1 || grade.level > 8)) issues.push('Silinmiş/pasif veya 1–8 dışında sınıf seçimi var.');
        if (new Set(ids).size !== ids.length) issues.push('Tekrarlanan sınıf seçimi var.');
        const chosenLevels = selected.filter(Boolean).map(grade => grade.level);
        if (policy === 'fixed' && new Set(chosenLevels).size > 1) issues.push('Sabit kapsam birden fazla seviyeyi içeriyor.');
        else if (policy === 'student-level' && new Set(chosenLevels).size !== chosenLevels.length) issues.push('Öğrenci seviyesine göre kapsamda aynı seviye için birden fazla şube var.');
        else if (!['fixed', 'student-level'].includes(policy)) issues.push('Sınıf kapsamı politikası geçersiz.');
        if (!Number.isFinite(pkg.price) || pkg.price <= 0 || Math.abs(pkg.price * 100 - Math.round(pkg.price * 100)) > 1e-6) issues.push('Geçerli satış fiyatı yok.');
        if (!['monthly', 'yearly', 'one-time'].includes(pkg.period)) issues.push('Geçerli erişim dönemi yok.');
        const requestedAllLevels = values.allLevelPackages.includes(String(pkg._id).toLowerCase());
        return { id: String(pkg._id), name: pkg.name, currentPrice: pkg.price, currentPeriod: pkg.period,
            currentGradePolicy: policy, currentGradeIds: ids, selectedLevels: [...new Set(chosenLevels)].sort(), issues,
            ...(requestedAllLevels ? { requestedGradePolicy: 'student-level', requestedLevels: levels.map(row => row.level),
                uncoveredLevels: levels.filter(row => !chosenLevels.includes(row.level)).map(row => row.level),
                configurationReview: levels.map(row => ({ level: row.level,
                    // Candidate suggestions never automatically modify classes or package grants.
                    suggestedGradeId: row.candidates.length === 1 ? row.candidates[0].id : null,
                    state: !row.candidates.length ? 'CLASS_MISSING' : row.candidates.length > 1 ? 'CLASS_SELECTION_REQUIRED' : 'REVIEW_CANDIDATE',
                    candidates: row.candidates })),
            } : {}),
        };
    });
    const report = { checkedAt: new Date().toISOString(), api: base.origin, readOnly: true, mutations: 0,
        scope: 'Yalnız herkese açık aktif paketler. Taslak/pasif katalog, ders içeriği ve iyzico yetkileri bu raporla doğrulanmaz.',
        pricesChanged: false, paymentsAttempted: 0, levels,
        missingClassLevels: levels.filter(row => !row.candidates.length).map(row => row.level),
        packageCount: reports.length, packageScopeIssues: reports.filter(row => row.issues.length).length,
        packages: reports,
    };
    if (values.output) {
        const output = path.resolve(values.output);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    }
    console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
