#!/usr/bin/env node
'use strict';

// Disposable local MongoDB + real Nest routes/models. Only the payment provider
// and the rate-counter storage are replaced. Never connects to a merchant bank.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const apiRequire = createRequire(path.join(root, 'apps/api/package.json'));
const runtime = path.join(root, '.atlas-local/runtime');
if (!fs.existsSync(path.join(runtime, 'node_modules/mongodb-memory-server/package.json'))) {
    fs.mkdirSync(runtime, { recursive: true });
    execFileSync('npm', ['install', '--prefix', runtime, '--ignore-scripts', '--no-audit', '--no-fund', 'mongodb-memory-server@11.2.0'], { stdio: 'inherit' });
}
apiRequire('ts-node').register({ project: path.join(root, 'apps/api/tsconfig.json'), transpileOnly: true });
apiRequire('reflect-metadata');
const { MongoMemoryServer } = require(path.join(runtime, 'node_modules/mongodb-memory-server'));
const mongoose = apiRequire('mongoose');
const request = apiRequire('supertest');
const results = [];
const checked = label => { results.push(label); console.log(`PASS ${label}`); };

async function main() {
    const mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1', dbName: 'atlas_commerce_verify' },
        binary: { version: '8.2.6', downloadDir: path.join(root, '.atlas-local/mongodb-binaries') } });
    let app;
    try {
        const uri = mongo.getUri('atlas_commerce_verify');
        const parsed = new URL(uri);
        assert.equal(parsed.hostname, '127.0.0.1'); assert.equal(parsed.pathname, '/atlas_commerce_verify');
        Object.assign(process.env, { NODE_ENV: 'test', MONGO_URI: uri, JWT_SECRET: 'fixture-only-auth-secret-never-use-outside-verification',
            OPENAI_API_KEY: '', ATLAS_OPENAI_BUDGET_USD: '1', GROQ_API_KEY: '', HUGGINGFACE_API_KEY: '',
            IYZICO_API_KEY: 'fixture-only-provider-api', IYZICO_SECRET_KEY: 'fixture-only-provider-secret', IYZICO_BASE_URL: 'https://api.iyzipay.com',
            PAYMENT_CALLBACK_URL: 'https://api.fixture.test/payment/provider-callback', FRONTEND_URL: 'https://web.fixture.test',
            MERCHANT_TITLE: 'Yerel Kontrol Kurumu', MERCHANT_TAX_NUMBER: '1234567890', MERCHANT_TAX_OFFICE: 'Kontrol',
            MERCHANT_ADDRESS: 'Yalnız test verisi olan kurgu adres', MERCHANT_EMAIL: 'support@fixture.test', MERCHANT_PHONE: '+905551234567' });
        const { Test } = apiRequire('@nestjs/testing');
        const { ValidationPipe } = apiRequire('@nestjs/common');
        const { getConnectionToken, getModelToken } = apiRequire('@nestjs/mongoose');
        const { ConfigService } = apiRequire('@nestjs/config');
        const { getStorageToken } = apiRequire('@nestjs/throttler');
        const { AppModule } = require(path.join(root, 'apps/api/src/app.module.ts'));
        const { PaymentService, paymentSignature, normalizeSignaturePrice } = require(path.join(root, 'apps/api/src/payment/payment.service.ts'));
        const { OpenAiBudgetService } = require(path.join(root, 'apps/api/src/gamification/openai-budget.service.ts'));
        const module = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(getStorageToken()).useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 60, isBlocked: false, timeToBlockExpire: 0 }) }).compile();
        app = module.createNestApplication({ logger: false });
        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));
        await app.listen(0, '127.0.0.1');
        const model = name => app.get(getModelToken(name));
        const User = model('User'), Grade = model('Grade'), Package = model('Package'), Order = model('Order'), Enrollment = model('StudentEnrollment');
        const password = 'Fixture-Account-2026!';
        const passwordHash = await apiRequire('bcrypt').hash(password, 4);
        const addUser = (name, role, more = {}) => User.create({ email: `${name}@fixture.test`, firstName: name, lastName: 'Kontrol', passwordHash, role, isActive: true, grade: 6, ...more });
        const parent = await addUser('veli', 'PARENT');
        const student = await addUser('ogrenci', 'STUDENT', { parentId: parent._id });
        const peer = await addUser('diger', 'STUDENT');
        const admin = await addUser('yonetici', 'ADMIN');
        const teacher = await addUser('ogretmen', 'TEACHER');
        const users = { student, parent, peer, admin, teacher }, tokens = {};
        const http = request(app.getHttpServer());
        async function call(method, route, role, body, expected = 200) {
            let req = http[method](route);
            if (role) req = req.set('Authorization', `Bearer ${tokens[role]}`);
            if (body !== undefined) req = req.send(body);
            const res = await req;
            assert.equal(res.status, expected, `${method.toUpperCase()} ${route}: ${JSON.stringify(res.body)}`);
            return res;
        }
        for (const [role, user] of Object.entries(users)) {
            const res = await call('post', '/auth/login', null, { email: user.email, password }, 201);
            tokens[role] = res.body.access_token;
        }
        checked('real login for five account roles and isolated database');
        await call('get', '/atlas-ai/budget', null, undefined, 401);
        await call('get', '/atlas-ai/budget', 'student', undefined, 403);
        const readBudget = async () => (await call('get', '/atlas-ai/budget', 'admin')).body;
        const initialBudget = await readBudget();
        assert.equal(initialBudget.state, 'not-started');
        assert.equal(initialBudget.providerConfigured, false);
        const connection = app.get(getConnectionToken());
        const budget = app.get(OpenAiBudgetService);
        const anotherInstance = new OpenAiBudgetService(connection, app.get(ConfigService));
        const concurrent = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => (i % 2 ? budget : anotherInstance).reserve(400_000)));
        assert.equal(concurrent.filter(row => row.status === 'fulfilled').length, 2);
        assert.ok(concurrent.every(row => row.status === 'fulfilled' || row.reason.getStatus() === 429));
        await budget.reserve(200_000);
        const spent = await readBudget();
        assert.equal(spent.state, 'exhausted');
        assert.equal(spent.accountedUsd, 1);
        assert.equal(spent.requests, 3);
        assert.equal(Date.parse(spent.endsAt) - Date.parse(spent.startedAt), 30 * 86400 * 1000);
        await anotherInstance.settle(400_000, 100_000);
        assert.equal((await readBudget()).remainingUsd, .3);
        await connection.db.collection('atlas_openai_budget').updateOne({ _id: 'atlas-openai-trial' }, { $set: { endsAt: new Date(0) } });
        await assert.rejects(budget.reserve(1), error => error.getStatus() === 429);
        assert.equal((await readBudget()).state, 'expired');
        checked('admin-only shared OpenAI budget, atomic reservations and no automatic renewal');
        const signup = { firstName: 'Yeni', lastName: 'Hesap', email: '  YENI@fixture.test ', password, role: 'STUDENT', grade: 6, termsAccepted: true, privacyAccepted: true };
        await call('post', '/auth/register', null, { ...signup, role: 'TEACHER' }, 400);
        await call('post', '/auth/register', null, { ...signup, parentId: String(parent._id) }, 400);
        await call('post', '/auth/register', null, { ...signup, grade: 6.5 }, 400);
        await call('post', '/auth/register', null, { ...signup, termsAccepted: false }, 400);
        const customer = (await call('post', '/auth/register', null, signup, 201)).body;
        assert.ok(customer.access_token); assert.equal(customer.user.email, 'yeni@fixture.test');
        assert.equal(customer.user.passwordHash, undefined); assert.equal(customer.user.sessionVersion, undefined);
        assert.equal(await Enrollment.countDocuments({ studentId: customer.user._id }), 0);
        tokens.newStudent = customer.access_token;
        await call('post', '/auth/register', null, { ...signup, email: 'YeNi@fixture.test' }, 409);
        const { grade: ignoredGrade, ...parentSignup } = signup;
        const customerParent = (await call('post', '/auth/register', null, { ...parentSignup, email: 'yeniveli@fixture.test', role: 'PARENT' }, 201)).body;
        tokens.newParent = customerParent.access_token;
        const childInput = { firstName: 'Bağlı', lastName: 'Öğrenci', email: 'yenicocuk@fixture.test', password, grade: 6, guardianConsent: true };
        await call('post', '/auth/students', 'student', childInput, 403);
        await call('post', '/auth/students', 'newParent', { ...childInput, email: peer.email }, 409);
        assert.equal((await User.findById(peer._id)).parentId, undefined);
        const child = (await call('post', '/auth/students', 'newParent', childInput, 201)).body;
        assert.equal(String(child.parentId), String(customerParent.user._id)); assert.equal(child.passwordHash, undefined);
        assert.ok((await call('get', '/payment/students', 'newParent')).body.some(row => row._id === child._id));
        await call('patch', '/auth/profile', 'newStudent', { role: 'ADMIN' }, 400);
        await call('post', '/auth/change-password', 'newStudent', { currentPassword: 'wrong', newPassword: 'Customer-New-2026!' }, 400);
        const refreshed = (await call('post', '/auth/change-password', 'newStudent', { currentPassword: password, newPassword: 'Customer-New-2026!' }, 201)).body;
        await call('get', '/auth/profile', 'newStudent', undefined, 401);
        tokens.newStudent = refreshed.access_token;
        await call('get', '/auth/profile', 'newStudent');
        await call('post', '/auth/login', null, { email: 'yeni@fixture.test', password }, 401);
        await call('post', '/auth/login', null, { email: 'YENI@fixture.test', password: 'Customer-New-2026!' }, 201);
        checked('strict self signup, normalized identity, parent-created child consent, safe responses and old-session revocation');
        const { StudentEnrollmentSchema, enrollmentAccessState } = require(path.join(root, 'apps/api/src/education/schemas/student-enrollment.schema.ts'));
        const AccessFixture = Enrollment.db.model('CommerceAccessFixture', StudentEnrollmentSchema.clone(), 'commerce_access_verification');
        const past = new Date(Date.now() - 60000), future = new Date(Date.now() + 60000);
        const grant = (more = {}) => ({ orderId: new mongoose.Types.ObjectId(), startsAt: past, expiresAt: future, environment: 'live', unlimited: false, ...more });
        const fixtures = [
            { name: 'legacy', allowed: true },
            { name: 'manual', accessSource: 'manual', allowed: true },
            { name: 'live', accessSource: 'package', packageGrants: [grant()], allowed: true },
            { name: 'expired', accessSource: 'package', packageGrants: [grant({ expiresAt: past })], allowed: false },
            { name: 'future', accessSource: 'package', packageGrants: [grant({ startsAt: future })], allowed: false },
            { name: 'sandbox', accessSource: 'package', packageGrants: [grant({ environment: 'sandbox' })], allowed: false },
            { name: 'revoked', accessSource: 'package', packageGrants: [grant({ revokedAt: past })], allowed: false },
            { name: 'missing-expiry', accessSource: 'package', packageGrants: [grant({ expiresAt: undefined })], allowed: false },
            { name: 'unknown-source', accessSource: 'invalid', packageGrants: [grant()], allowed: false },
            { name: 'lifetime', accessSource: 'package', packageGrants: [grant({ expiresAt: undefined, unlimited: true })], allowed: true },
            { name: 'union', accessSource: 'package', packageGrants: [grant({ expiresAt: past }), grant()], allowed: true },
            { name: 'manual-expired', accessSource: 'manual', packageGrants: [grant({ expiresAt: past })], allowed: true },
            { name: 'empty-package', accessSource: 'package', packageGrants: [], allowed: false },
            { name: 'null-revocation', accessSource: 'package', packageGrants: [grant({ revokedAt: null })], allowed: false },
        ].map(row => ({ _id: new mongoose.Types.ObjectId(), studentId: new mongoose.Types.ObjectId(), gradeId: new mongoose.Types.ObjectId(), ...row }));
        await AccessFixture.collection.insertMany(fixtures);
        const expectedAccessIds = fixtures.filter(row => row.allowed).map(row => String(row._id)).sort();
        assert.deepEqual((await AccessFixture.find().lean()).map(row => String(row._id)).sort(), expectedAccessIds);
        assert.equal(await AccessFixture.countDocuments(), expectedAccessIds.length);
        assert.equal((await AccessFixture.distinct('studentId')).length, expectedAccessIds.length);
        assert.deepEqual((await AccessFixture.aggregate([{ $project: { _id: 1 } }])).map(row => String(row._id)).sort(), expectedAccessIds);
        for (const row of fixtures) {
            assert.equal(!!await AccessFixture.findById(row._id), row.allowed, `findById ${row.name}`);
            assert.equal(!!await AccessFixture.exists({ _id: row._id }), row.allowed, `exists ${row.name}`);
            assert.equal(enrollmentAccessState(row).accessGranted, row.allowed, `admin inspection ${row.name}`);
        }
        assert.equal((await AccessFixture.find().setOptions({ includeExpiredEnrollments: true })).length, fixtures.length);
        const expiredFixture = fixtures.find(row => row.name === 'expired');
        await AccessFixture.updateOne({ _id: expiredFixture._id }, { $push: { packageGrants: grant() } });
        assert.ok(await AccessFixture.exists({ _id: expiredFixture._id }));
        checked('all enrollment query methods enforce expiry, start date, revocation, live environment and union/lifetime grants');
        const grade = await Grade.create({ level: 6, label: 'Yerel Kontrol', isActive: true });
        const grade7 = await Grade.create({ level: 7, label: 'Başka Seviye', isActive: true });
        const Subject = model('Subject'), Unit = model('Unit'), Topic = model('Topic');
        const subject = await Subject.create({ name: 'Matematik', gradeLevel: 6, gradeId: grade._id, isActive: true,
            zoomUrl: 'https://meeting.fixture.test/private', zoomMeetingId: 'fixture-private-id', zoomPasscode: 'fixture-private-secret' });
        const unit = await Unit.create({ name: 'Kontrol Ünitesi', subjectId: subject._id });
        const topic = await Topic.create({ name: 'Kontrol Konusu', unitId: unit._id });
        await model('TeacherAssignment').create({ teacherId: teacher._id, gradeId: grade._id, subjectId: subject._id });
        const question = await model('Question').create({ text: '2+2?', options: ['3', '4', '5', '6'], correctAnswer: 1,
            gradeLevel: 6, subjectId: subject._id, unitId: unit._id, topicId: topic._id, teacherId: teacher._id });
        const exam = await model('Test').create({ title: 'Kontrol Sınavı', gradeLevel: 6, subjectId: subject._id,
            teacherId: teacher._id, questionIds: [question._id], duration: 20, isActive: true });
        const publicSubjects = await call('get', '/education/subjects/all');
        assert.ok(!JSON.stringify(publicSubjects.body).includes('fixture-private'));
        await call('get', `/education/tests/${exam._id}`, 'student', undefined, 403);
        checked('public catalog contains no meeting credentials and unentitled tests are denied');

        await call('get', '/packages/admin', null, undefined, 401);
        await call('post', '/packages', 'student', { name: 'Yetkisiz' }, 403);
        let pkg = (await call('post', '/packages', 'admin', { name: 'Kontrol Paketi', description: 'Yalnızca otomatik doğrulama için kullanılır.', price: 99.5 }, 201)).body;
        assert.equal(pkg.isActive, false);
        await call('get', `/packages/${pkg._id}`, null, undefined, 404);
        await call('patch', `/packages/${pkg._id}`, 'admin', { isActive: true }, 400);
        await call('patch', `/packages/${pkg._id}`, 'admin', { gradeIds: [String(grade._id), String(grade7._id)], isActive: true }, 400);
        await call('patch', `/packages/${pkg._id}`, 'admin', { price: 12.345 }, 400);
        await call('patch', `/packages/${pkg._id}`, 'admin', { $set: { price: 1 } }, 400);
        pkg = (await call('patch', `/packages/${pkg._id}`, 'admin', { gradeIds: [String(grade._id)], isActive: true })).body;
        assert.ok((await call('get', '/packages')).body.some(item => item._id === pkg._id));
        checked('draft, publication, price/class validation, unknown operators and admin package access');

        const service = app.get(PaymentService), checkout = new Map(); let initializations = 0;
        service.iyzipay = {
            checkoutFormInitialize: { create: (input, cb) => {
                initializations++; const token = `fixture-token-${randomUUID()}`; checkout.set(token, { input, mode: 'success' });
                setTimeout(() => cb(null, { status: 'success', conversationId: input.conversationId, token, tokenExpireTime: 1800,
                    paymentPageUrl: `https://api.iyzipay.com/checkoutform/${token}`, signature: paymentSignature(process.env.IYZICO_SECRET_KEY, [input.conversationId, token]) }), 10);
            } },
            checkoutForm: { retrieve: ({ token }, cb) => {
                const item = checkout.get(token); if (!item) return cb(new Error('fixture checkout missing'));
                const input = item.input, r = { status: 'success', paymentStatus: 'SUCCESS', token, paymentId: `fixture-${input.conversationId}`, currency: 'TRY',
                    basketId: input.basketId, conversationId: input.conversationId, paidPrice: input.paidPrice, price: input.price, installment: 1,
                    fraudStatus: item.mode === 'review' ? 0 : 1,
                    itemTransactions: [{ itemId: input.basketItems[0].id, price: input.price, paidPrice: input.paidPrice, paymentTransactionId: `tx-${input.conversationId}` }] };
                r.signature = paymentSignature(process.env.IYZICO_SECRET_KEY, [r.paymentStatus, r.paymentId, r.currency, r.basketId, r.conversationId,
                    normalizeSignaturePrice(r.paidPrice), normalizeSignaturePrice(r.price), r.token]);
                if (item.mode === 'tampered') r.signature = '0'.repeat(64);
                cb(null, r);
            } },
        };
        const dto = (packageId = pkg._id) => ({ packageId, identityNumber: '10000000146', phone: '+905551234567', city: 'İstanbul', address: 'Yalnızca fixture için kurgu fatura adresi',
            termsAccepted: true, privacyAccepted: true, salesAgreementAccepted: true });
        const readiness = (await call('get', '/payment/admin/readiness', 'admin')).body;
        assert.equal(readiness.canAcceptPayments, true); assert.equal(readiness.checks.merchantInformation, true);
        await call('post', '/payment/initialize', 'student', { ...dto(), price: 0.01 }, 400);
        await call('post', '/payment/initialize', 'student', { ...dto(), identityNumber: '11111111111' }, 400);
        for (const field of ['termsAccepted', 'privacyAccepted', 'salesAgreementAccepted']) {
            const unchecked = { ...dto() }; delete unchecked[field];
            await call('post', '/payment/initialize', 'student', unchecked, 400);
            await call('post', '/payment/initialize', 'student', { ...dto(), [field]: false }, 400);
        }
        await call('post', '/payment/initialize', 'parent', { ...dto(), studentId: String(peer._id) }, 403);
        const classlessPackage = await Package.create({ name: 'Eski sınıfsız paket', description: 'Yalnız geçici doğrulama verisidir.', price: 9.9,
            period: 'monthly', isActive: true, gradeIds: [] });
        await call('get', `/packages/${classlessPackage._id}`, null, undefined, 404);
        await call('post', '/payment/initialize', 'student', dto(classlessPackage._id), 400);
        assert.equal(initializations, 0);
        await call('get', '/cart', null, undefined, 401);
        await call('get', '/cart', 'teacher', undefined, 403);
        let studentCart = (await call('get', '/cart', 'student')).body;
        assert.equal(studentCart.item, null);
        await call('put', '/cart/item', 'student', { packageId: String(pkg._id), revision: studentCart.revision, amount: 0.01 }, 400);
        studentCart = (await call('put', '/cart/item', 'student', { packageId: String(pkg._id), revision: studentCart.revision })).body;
        assert.equal(studentCart.quote.amount, 99.5);
        await call('put', '/cart/item', 'student', { packageId: String(pkg._id), revision: studentCart.revision - 1 }, 409);
        let parentCart = (await call('get', '/cart', 'parent')).body;
        await call('put', '/cart/item', 'parent', { packageId: String(pkg._id), studentId: String(peer._id), revision: parentCart.revision }, 403);
        parentCart = (await call('put', '/cart/item', 'parent', { packageId: String(pkg._id), studentId: String(student._id), revision: parentCart.revision })).body;
        const cartBilling = { identityNumber: dto().identityNumber, phone: dto().phone, city: dto().city, address: dto().address,
            termsAccepted: true, privacyAccepted: true, salesAgreementAccepted: true };
        await Package.updateOne({ _id: pkg._id }, { $set: { price: 100 } });
        assert.equal((await call('get', '/cart', 'student')).body.quoteChanged, true);
        await call('post', '/cart/checkout', 'student', { ...cartBilling, revision: studentCart.revision }, 409);
        assert.equal(initializations, 0);
        await Package.updateOne({ _id: pkg._id }, { $set: { price: 99.5 } });
        studentCart = (await call('put', '/cart/item', 'student', { packageId: String(pkg._id), revision: studentCart.revision })).body;
        await call('post', '/cart/checkout', 'student', { ...cartBilling, privacyAccepted: false, revision: studentCart.revision }, 400);
        checked('authenticated account-owned cart, family selection, server totals, stale revisions and changed-price consent');
        const race = await Promise.all([
            http.post('/cart/checkout').set('Authorization', `Bearer ${tokens.student}`).send({ ...cartBilling, revision: studentCart.revision }),
            http.post('/cart/checkout').set('Authorization', `Bearer ${tokens.parent}`).send({ ...cartBilling, revision: parentCart.revision }),
        ]);
        assert.deepEqual(race.map(res => res.status).sort(), [201, 409]); assert.equal(initializations, 1);
        const started = race.find(res => res.status === 201).body;
        const payer = race[0].status === 201 ? 'student' : 'parent';
        let order = await Order.findById(started.orderId).select('+iyzicoToken').exec();
        const token = order.iyzicoToken;
        assert.equal(order.amount, 99.5); assert.equal(order.sellerSnapshot.complete, true);
        assert.ok(order.privacyAcceptedAt); assert.ok(order.salesAgreementAcceptedAt); assert.ok(order.cartId);
        assert.equal(order.packageDescription, pkg.description);
        const savedCart = (await call('get', '/cart', payer)).body;
        assert.equal(savedCart.orderId, String(order._id)); assert.ok(!JSON.stringify(savedCart).includes(token));
        assert.equal(await Enrollment.countDocuments({ studentId: student._id }), 0);
        await call('post', `/payment/orders/${order._id}/resume`, payer, {}, 201);
        checked('authoritative price, buyer validation and cross-payer concurrent checkout deduplication');

        await Promise.all([1, 2, 3].map(() => http.post('/payment/provider-callback').type('form').send({ token }).expect(303)));
        order = await Order.findById(order._id);
        assert.equal(order.status, 'COMPLETED'); assert.equal(order.fulfillmentStatus, 'FULFILLED');
        assert.equal((await call('get', '/cart', payer)).body.item, null);
        let enrollment = await Enrollment.findOne({ studentId: student._id, gradeId: grade._id });
        assert.equal(enrollment.accessSource, 'package'); assert.equal(enrollment.packageGrants.length, 1);
        const paidAt = order.paidAt.toISOString(), validUntil = order.validUntil.toISOString();
        await call('post', `/payment/admin/orders/${order._id}/reconcile`, 'admin', {}, 201);
        order = await Order.findById(order._id); enrollment = await Enrollment.findOne({ studentId: student._id });
        assert.equal(order.paidAt.toISOString(), paidAt); assert.equal(order.validUntil.toISOString(), validUntil); assert.equal(enrollment.packageGrants.length, 1);
        await call('post', '/payment/initialize', payer, { ...dto(), ...(payer === 'parent' ? { studentId: String(student._id) } : {}) }, 409);
        checked('signed callbacks, single live grant, stable dates, fulfillment retry and active-package duplicate protection');

        const detail = (await call('get', `/payment/orders/${order._id}`, 'student')).body;
        assert.ok(!JSON.stringify(detail).includes(token)); assert.ok(!JSON.stringify(detail).includes('fixture-only-provider-secret'));
        await call('get', `/payment/orders/${order._id}`, 'peer', undefined, 404);
        await call('get', `/payment/my-orders?studentId=${peer._id}`, 'parent', undefined, 403);
        assert.ok((await call('get', `/payment/my-orders?studentId=${student._id}`, 'parent')).body.items.some(item => item._id === String(order._id)));
        await call('post', `/payment/orders/${order._id}/refund-request`, payer, { reason: 'Yalnız yerel talep akışını doğrulamak için.' }, 201);
        assert.equal((await Order.findById(order._id)).refundRequestStatus, 'REQUESTED');
        assert.equal((await Order.findById(order._id)).status, 'COMPLETED');
        checked('private order projection, linked-family history and refund request without moving money');

        const accessibleExam = (await call('get', `/education/tests/${exam._id}`, 'student')).body;
        assert.ok(!JSON.stringify(accessibleExam).includes('correctAnswer'));
        await call('delete', `/education/student-enrollments/${enrollment._id}`, 'admin', undefined, 409);
        await Enrollment.updateOne({ _id: enrollment._id }, { $set: { 'packageGrants.$[].expiresAt': new Date(Date.now() - 1000) } });
        await Order.updateOne({ _id: order._id }, { $set: { validUntil: new Date(Date.now() - 1000) } });
        assert.equal(await Enrollment.findById(enrollment._id), null);
        const noActivePackage = await call('get', '/payment/active-package', 'student');
        assert.ok(noActivePackage.text === '' || noActivePackage.text === 'null');
        await call('get', `/education/tests/${exam._id}`, 'student', undefined, 403);
        const adminRows = (await call('get', '/education/student-enrollments', 'admin')).body;
        assert.equal(adminRows.find(row => row._id === String(enrollment._id)).accessGranted, false);
        checked('paid access expiry enforced by course queries, tests and admin inspection; paid grant deletion protected');

        const renew = (await call('post', '/payment/initialize', 'student', dto(), 201)).body;
        let second = await Order.findById(renew.orderId).select('+iyzicoToken');
        await User.updateOne({ _id: student._id }, { $set: { grade: 7 } });
        await http.post('/payment/provider-callback').type('form').send({ token: second.iyzicoToken }).expect(303);
        second = await Order.findById(second._id);
        assert.equal(second.status, 'COMPLETED'); assert.equal(second.fulfillmentStatus, 'FAILED');
        await User.updateOne({ _id: student._id }, { $set: { grade: 6 } });
        await call('post', `/payment/admin/orders/${second._id}/reconcile`, 'admin', {}, 201);
        assert.equal((await Order.findById(second._id)).fulfillmentStatus, 'FULFILLED');
        assert.equal((await Enrollment.findOne({ studentId: student._id })).packageGrants.length, 2);
        checked('expired package renewal and captured payment retained during class-change fulfillment failure/recovery');

        const cancelled = (await call('post', '/payment/initialize', 'peer', dto(), 201)).body;
        const cancelledRaw = await Order.findById(cancelled.orderId).select('+iyzicoToken');
        await call('post', `/payment/orders/${cancelled.orderId}/cancel`, 'peer', {}, 201);
        assert.equal((await Order.findById(cancelled.orderId)).status, 'CANCELLED');
        const sessionsBeforeRetry = initializations;
        await call('post', '/payment/initialize', 'peer', dto(), 409);
        assert.equal(initializations, sessionsBeforeRetry);
        checkout.get(cancelledRaw.iyzicoToken).mode = 'tampered';
        await http.post('/payment/provider-callback').type('form').send({ token: cancelledRaw.iyzicoToken }).expect(303);
        assert.equal(await Enrollment.findOne({ studentId: peer._id }), null);
        checkout.get(cancelledRaw.iyzicoToken).mode = 'success';
        await http.post('/payment/provider-callback').type('form').send({ token: cancelledRaw.iyzicoToken }).expect(303);
        assert.equal((await Order.findById(cancelled.orderId)).status, 'COMPLETED');
        checked('tampered provider proof grants nothing and a genuine late payment survives local cancellation');

        const sandboxUser = await addUser('test-odemesi', 'STUDENT');
        const res = await call('post', '/auth/login', null, { email: sandboxUser.email, password }, 201); tokens.sandbox = res.body.access_token;
        process.env.IYZICO_BASE_URL = 'https://sandbox-api.iyzipay.com';
        process.env.IYZICO_API_KEY = 'sandbox-fixture-key';
        const sandbox = (await call('post', '/payment/initialize', 'sandbox', dto(), 201)).body;
        const sandboxRaw = await Order.findById(sandbox.orderId).select('+iyzicoToken');
        await http.post('/payment/provider-callback').type('form').send({ token: sandboxRaw.iyzicoToken }).expect(303);
        assert.equal((await Order.findById(sandbox.orderId)).fulfillmentStatus, 'SKIPPED_SANDBOX');
        assert.equal(await Enrollment.findOne({ studentId: sandboxUser._id }), null);
        checked('sandbox payment is recorded independently and grants no live classes');

        const institutionalStudent = await addUser('kurum-kaydi', 'STUDENT');
        const expiredInstitutional = await Enrollment.create({ studentId: institutionalStudent._id, gradeId: grade._id,
            accessSource: 'package', packageGrants: [grant({ expiresAt: past })] });
        await call('post', '/education/student-enrollments', 'admin', { studentId: String(institutionalStudent._id), gradeId: String(grade._id) }, 201);
        const institutional = await Enrollment.findById(expiredInstitutional._id);
        assert.equal(institutional.accessSource, 'manual');
        assert.equal(institutional.packageGrants.length, 1);
        await call('post', '/education/student-enrollments', 'admin', { studentId: String(institutionalStudent._id), gradeId: String(grade._id) }, 409);
        await call('post', '/education/student-enrollments', 'admin', { studentId: String(institutionalStudent._id), gradeId: String(grade7._id) }, 400);
        await call('post', '/education/student-enrollments', 'admin', { studentId: String(institutionalStudent._id), gradeId: String(grade._id), accessSource: 'manual' }, 400);
        await call('delete', `/education/student-enrollments/${institutional._id}`, 'admin');
        assert.equal(await Enrollment.findById(institutional._id).setOptions({ includeExpiredEnrollments: true }), null);
        checked('explicit institution access preserves expired payment history and validates duplicate/class/unknown-field rules');

        const page = (await call('get', '/payment/admin/orders?page=1&pageSize=1', 'admin')).body;
        assert.equal(page.items.length, 1); assert.ok(page.pagination.total > 1); assert.equal(page.summary.liveRevenue, 298.5); assert.equal(page.summary.sandboxRevenue, 99.5);
        const live = (await call('get', '/payment/admin/orders?environment=live&pageSize=1', 'admin')).body;
        assert.equal(live.pagination.total, 3); assert.equal(live.summary.liveRevenue, 298.5);
        const statistics = (await call('get', '/statistics/admin', 'admin')).body;
        assert.equal(statistics.totalRevenue, 298.5);
        assert.equal(statistics.totalUsers, await User.countDocuments());
        assert.equal(statistics.activeSubscriptions, 2);
        await call('get', '/payment/admin/orders?from=2026-02-30', 'admin', undefined, 400);
        checked('server pagination and whole-filter revenue totals exclude sandbox from real income');

        const sessionsBeforeAccountLifecycle = initializations;
        const accountHistory = await Order.create({ user: customer.user._id, beneficiary: customer.user._id,
            package: pkg._id, packageName: pkg.name, packagePeriod: pkg.period, amount: 99.5, currency: 'TRY',
            paymentEnvironment: 'live', status: 'FAILED', failureCode: 'FIXTURE_ACCOUNT_HISTORY', gradeIds: [grade._id] });
        const tokenBeforeAdminReset = tokens.newStudent;
        const resetPassword = 'Admin-Reset-2026!';
        const adminPassword = (await call('post', `/users/${customer.user._id}/set-password`, 'admin', { password: resetPassword }, 201)).body;
        assert.equal(adminPassword.user.passwordHash, undefined); assert.equal(adminPassword.user.sessionVersion, undefined);
        await call('get', '/auth/profile', 'newStudent', undefined, 401);
        await call('post', '/auth/login', null, { email: customer.user.email, password: 'Customer-New-2026!' }, 401);
        tokens.newStudent = (await call('post', '/auth/login', null, { email: customer.user.email, password: resetPassword }, 201)).body.access_token;
        await call('get', '/auth/profile', 'newStudent');
        const tokenBeforeClosure = tokens.newStudent;
        const closedCustomer = (await call('delete', `/users/${customer.user._id}`, 'admin')).body;
        assert.equal(closedCustomer.isActive, false); assert.equal(closedCustomer.passwordHash, undefined);
        const retainedCustomer = await User.findById(customer.user._id);
        assert.ok(retainedCustomer); assert.equal(retainedCustomer.isActive, false);
        assert.ok(await Order.exists({ _id: accountHistory._id, user: retainedCustomer._id }));
        await call('get', '/auth/profile', 'newStudent', undefined, 401);
        await call('post', '/auth/login', null, { email: customer.user.email, password: resetPassword }, 401);
        const reactivatedCustomer = (await call('patch', `/users/${customer.user._id}/status`, 'admin', { isActive: true })).body;
        assert.equal(reactivatedCustomer.isActive, true); assert.equal(reactivatedCustomer.passwordHash, undefined);
        tokens.oldCustomerPassword = tokenBeforeAdminReset; tokens.oldCustomerClosure = tokenBeforeClosure;
        await call('get', '/auth/profile', 'oldCustomerPassword', undefined, 401);
        await call('get', '/auth/profile', 'oldCustomerClosure', undefined, 401);
        tokens.newStudent = (await call('post', '/auth/login', null, { email: customer.user.email, password: resetPassword }, 201)).body.access_token;
        await call('get', '/auth/profile', 'newStudent');
        assert.ok((await call('get', '/payment/my-orders', 'newStudent')).body.items.some(row => row._id === String(accountHistory._id)));
        const protectedAdmin = await addUser('korunan-ust-yonetici', 'SUPERADMIN');
        await call('patch', `/users/${protectedAdmin._id}/status`, 'admin', { isActive: false }, 403);
        await call('delete', `/users/${protectedAdmin._id}`, 'admin', undefined, 403);
        await call('post', `/users/${protectedAdmin._id}/set-password`, 'admin', { password: resetPassword }, 403);
        await call('patch', `/users/${protectedAdmin._id}`, 'admin', { firstName: 'Yetkisiz Değişiklik' }, 403);
        const protectedAdminAfter = await User.findById(protectedAdmin._id);
        assert.equal(protectedAdminAfter.isActive, true); assert.equal(protectedAdminAfter.firstName, protectedAdmin.firstName);
        assert.equal(protectedAdminAfter.passwordHash, protectedAdmin.passwordHash);
        assert.equal(initializations, sessionsBeforeAccountLifecycle);
        checked('admin password reset and soft closure revoke old sessions, preserve account/order history, reactivate safely and protect SUPERADMIN');

        // Keep this isolated paid scenario after the established revenue assertions.
        // All provider methods still use the signed in-process fixture above.
        process.env.IYZICO_BASE_URL = 'https://api.iyzipay.com';
        process.env.IYZICO_API_KEY = 'fixture-only-provider-api';
        const sharedStudent = await addUser('ortak-paket-yedinci', 'STUDENT', { grade: 7 });
        const uncoveredStudent = await addUser('ortak-paket-sekizinci', 'STUDENT', { grade: 8 });
        for (const [role, user] of [['sharedStudent', sharedStudent], ['uncoveredStudent', uncoveredStudent]]) {
            const login = await call('post', '/auth/login', null, { email: user.email, password }, 201);
            tokens[role] = login.body.access_token;
        }
        const sharedPackage = (await call('post', '/packages', 'admin', {
            name: 'Çok Seviyeli Kontrol Paketi', description: 'Yalnız geçici testte öğrenciye uygun tek sınıfı açan eğitim paketi.',
            price: 99.5, period: 'monthly', isActive: true, gradePolicy: 'student-level',
            gradeIds: [String(grade._id), String(grade7._id)], features: ['Canlı ders', 'Koçluk ve ders erişimi'],
        }, 201)).body;
        assert.equal(sharedPackage.gradePolicy, 'student-level');
        assert.equal((await call('get', `/packages/${sharedPackage._id}`)).body.gradePolicy, 'student-level');
        const beforeSharedSessions = initializations;
        const uncoveredContext = (await call('get', `/payment/checkout-context/${sharedPackage._id}`, 'uncoveredStudent')).body;
        assert.equal(uncoveredContext.eligibility.canPurchase, false);
        assert.match(uncoveredContext.eligibility.reason, /sınıf seviyesine uygun/);
        assert.deepEqual(uncoveredContext.resolvedGradeIds, []);
        await call('post', '/payment/initialize', 'uncoveredStudent', dto(sharedPackage._id), 400);
        let uncoveredCart = (await call('get', '/cart', 'uncoveredStudent')).body;
        uncoveredCart = (await call('put', '/cart/item', 'uncoveredStudent', {
            packageId: sharedPackage._id, revision: uncoveredCart.revision,
        })).body;
        assert.equal(uncoveredCart.canPurchase, false); assert.equal(uncoveredCart.canCheckout, false);
        await call('post', '/cart/checkout', 'uncoveredStudent', { ...cartBilling, revision: uncoveredCart.revision }, 409);
        assert.equal(initializations, beforeSharedSessions);
        assert.equal(await Order.countDocuments({ user: uncoveredStudent._id }), 0);
        assert.equal(await Enrollment.countDocuments({ studentId: uncoveredStudent._id }), 0);

        const sharedContext = (await call('get', `/payment/checkout-context/${sharedPackage._id}`, 'sharedStudent')).body;
        assert.equal(sharedContext.eligibility.canPurchase, true);
        assert.deepEqual(sharedContext.resolvedGradeIds, [String(grade7._id)]);
        let sharedCart = (await call('get', '/cart', 'sharedStudent')).body;
        sharedCart = (await call('put', '/cart/item', 'sharedStudent', {
            packageId: sharedPackage._id, revision: sharedCart.revision,
        })).body;
        assert.equal(sharedCart.canCheckout, true);
        const sharedCheckout = (await call('post', '/cart/checkout', 'sharedStudent', {
            ...cartBilling, revision: sharedCart.revision,
        }, 201)).body;
        assert.equal(initializations, beforeSharedSessions + 1);
        let sharedOrder = await Order.findById(sharedCheckout.orderId).select('+iyzicoToken');
        assert.equal(sharedOrder.packageGradePolicy, 'student-level');
        assert.deepEqual(sharedOrder.gradeIds.map(String), [String(grade7._id)]);
        assert.equal(String(sharedOrder.beneficiary), String(sharedStudent._id));
        assert.equal(sharedOrder.cartRevision, sharedCart.revision);
        assert.ok(sharedOrder.termsAcceptedAt instanceof Date);
        assert.ok(sharedOrder.privacyAcceptedAt instanceof Date);
        assert.ok(sharedOrder.salesAgreementAcceptedAt instanceof Date);
        assert.equal(sharedOrder.termsVersion, sharedContext.legalVersions.terms);
        assert.equal(sharedOrder.privacyVersion, sharedContext.legalVersions.privacy);
        assert.equal(sharedOrder.salesAgreementVersion, sharedContext.legalVersions.salesAgreement);
        assert.equal(sharedOrder.preInformationVersion, sharedContext.legalVersions.preInformation);
        assert.equal(sharedOrder.packageDescription, sharedPackage.description);
        assert.deepEqual(sharedOrder.packageFeatures, sharedPackage.features);
        assert.equal(await Enrollment.countDocuments({ studentId: sharedStudent._id }), 0);
        const sharedToken = sharedOrder.iyzicoToken;
        // Fulfillment must use the purchased target, even if a later catalog edit
        // changes the same offer to a different fixed class and different promises.
        await call('patch', `/packages/${sharedPackage._id}`, 'admin', {
            gradePolicy: 'fixed', gradeIds: [String(grade._id)], features: ['Sonradan değişen paket kapsamı'],
        });
        await http.post('/payment/provider-callback').type('form').send({ token: sharedToken }).expect(303);
        sharedOrder = await Order.findById(sharedCheckout.orderId);
        assert.equal(sharedOrder.status, 'COMPLETED'); assert.equal(sharedOrder.fulfillmentStatus, 'FULFILLED');
        assert.equal(sharedOrder.packageGradePolicy, 'student-level');
        assert.deepEqual(sharedOrder.gradeIds.map(String), [String(grade7._id)]);
        assert.deepEqual(sharedOrder.packageFeatures, sharedPackage.features);
        const sharedEnrollments = await Enrollment.find({ studentId: sharedStudent._id });
        assert.equal(sharedEnrollments.length, 1);
        assert.equal(String(sharedEnrollments[0].gradeId), String(grade7._id));
        assert.equal(sharedEnrollments[0].accessSource, 'package');
        assert.equal(sharedEnrollments[0].packageGrants.length, 1);
        assert.equal(String(sharedEnrollments[0].packageGrants[0].orderId), String(sharedOrder._id));
        assert.equal(sharedEnrollments[0].packageGrants[0].environment, 'live');
        assert.equal(await Enrollment.exists({ studentId: sharedStudent._id, gradeId: grade._id }), null);
        await call('get', `/education/tests/${exam._id}`, 'sharedStudent', undefined, 403);
        assert.equal((await call('get', '/cart', 'sharedStudent')).body.item, null);
        const sharedDetail = (await call('get', `/payment/orders/${sharedOrder._id}`, 'sharedStudent')).body;
        assert.equal(sharedDetail.packageGradePolicy, 'student-level');
        assert.deepEqual(sharedDetail.gradeIds.map(String), [String(grade7._id)]);
        assert.equal(sharedDetail.privacyVersion, sharedContext.legalVersions.privacy);
        assert.ok(!JSON.stringify(sharedDetail).includes(sharedToken));
        checked('student-level package grants only the purchased level, blocks missing coverage before provider calls and preserves legal/scope snapshots');

        const sayisalGrade = await Grade.create({ level: 8, label: 'Fixture Sayısal', isActive: true });
        const sozelGrade = await Grade.create({ level: 8, label: 'Fixture Sözel', isActive: true });
        const boundMath = await Subject.create({ name: 'Fixture Bağlı Matematik', gradeLevel: 8, gradeId: sayisalGrade._id, isActive: true });
        const globalMath = await Subject.create({ name: 'Fixture Ortak Matematik', gradeLevel: 8, isActive: true });
        const globalTurkce = await Subject.create({ name: 'Fixture Ortak Türkçe', gradeLevel: 8, isActive: true });
        const globalSosyal = await Subject.create({ name: 'Fixture Ortak Sosyal', gradeLevel: 8, isActive: true });
        const foreignSubject = await Subject.create({ name: 'Fixture Sözel Dersi', gradeLevel: 8, gradeId: sozelGrade._id, isActive: true });
        await model('TeacherAssignment').create({ teacherId: teacher._id, gradeId: sayisalGrade._id, subjectId: globalMath._id });
        // A bad teacher assignment must never override an explicit foreign subject.
        await model('TeacherAssignment').create({ teacherId: teacher._id, gradeId: sayisalGrade._id, subjectId: foreignSubject._id });
        await User.updateOne({ _id: uncoveredStudent._id }, { $set: { parentId: parent._id } });
        const sayisalPackage = (await call('post', '/packages', 'admin', { name: 'Fixture Sayısal Paket',
            description: 'Yalnız geçici kontrolde matematik cohort erişimi sağlar.', price: 99.5, isActive: true, gradeIds: [String(sayisalGrade._id)] }, 201)).body;
        let sayisalCart = (await call('get', '/cart', 'uncoveredStudent')).body;
        sayisalCart = (await call('put', '/cart/item', 'uncoveredStudent', { packageId: sayisalPackage._id, revision: sayisalCart.revision })).body;
        const sayisalCheckout = (await call('post', '/cart/checkout', 'uncoveredStudent', { ...cartBilling, revision: sayisalCart.revision }, 201)).body;
        const sayisalOrder = await Order.findById(sayisalCheckout.orderId).select('+iyzicoToken');
        await http.post('/payment/provider-callback').type('form').send({ token: sayisalOrder.iyzicoToken }).expect(303);
        assert.equal((await Order.findById(sayisalOrder._id)).fulfillmentStatus, 'FULFILLED');
        const scopeCases = [
            { key: 'bound-math', subject: boundMath }, { key: 'teacher-bound-math', subject: globalMath },
            { key: 'global-turkce', subject: globalTurkce }, { key: 'global-sosyal', subject: globalSosyal },
            { key: 'foreign-subject', subject: foreignSubject },
            { key: 'foreign-class', subject: globalMath, gradeId: sozelGrade._id },
            { key: 'own-class', subject: globalMath, gradeId: sayisalGrade._id },
        ];
        const scopeRows = new Map();
        for (const item of scopeCases) {
            const base = { title: `scope-${item.key}`, teacherId: teacher._id, subjectId: item.subject._id, gradeLevel: 8,
                ...(item.gradeId ? { gradeId: item.gradeId } : {}) };
            const assignment = await model('Assignment').create({ ...base, dueDate: new Date(Date.now() + 86400000), attachments: ['data:application/pdf;base64,VGVzdA=='] });
            const video = await model('Video').create({ ...base, videoUrl: 'https://fixture.test/video' });
            const liveClass = await model('LiveClass').create({ ...base, url: 'https://fixture.test/meeting', startTime: new Date(Date.now() + 3600000) });
            const test = item.gradeId ? null : await model('Test').create({ ...base, questionIds: [], isActive: true });
            scopeRows.set(item.key, { assignment, video, liveClass, test });
        }
        const visibleTitles = ['scope-bound-math', 'scope-teacher-bound-math', 'scope-own-class'].sort();
        const titles = rows => rows.filter(row => row.title?.startsWith('scope-')).map(row => row.title).sort();
        for (const route of ['/education/videos', '/education/assignments', '/education/student/assignments', '/education/live-classes/student']) {
            assert.deepEqual(titles((await call('get', route, 'uncoveredStudent')).body), visibleTitles);
        }
        const scopeDashboard = (await call('get', '/education/student/dashboard', 'uncoveredStudent')).body;
        for (const key of ['videos', 'assignments', 'liveClasses']) assert.deepEqual(titles(scopeDashboard[key]), visibleTitles);
        const scopeCalendar = (await call('get', '/education/calendar/events?gradeLevel=8', 'uncoveredStudent')).body;
        assert.deepEqual(titles(scopeCalendar.assignments), visibleTitles); assert.deepEqual(titles(scopeCalendar.liveClasses), visibleTitles);
        const parentScope = (await call('get', '/education/parent/dashboard', 'parent')).body.students.find(row => row.student._id === String(uncoveredStudent._id));
        assert.deepEqual(titles(parentScope.assignments), visibleTitles);
        const scopeCourses = (await call('get', '/education/student/courses', 'uncoveredStudent')).body;
        assert.ok(scopeCourses.some(row => row.subjectId?._id === String(globalMath._id)));
        assert.ok(!scopeCourses.some(row => row.subjectId?._id === String(foreignSubject._id)));
        for (const route of ['/education/tests/student/available', '/education/tests']) {
            assert.deepEqual(titles((await call('get', route, 'uncoveredStudent')).body), ['scope-bound-math', 'scope-teacher-bound-math'].sort());
        }
        for (const key of ['bound-math', 'teacher-bound-math']) await call('get', `/education/tests/${scopeRows.get(key).test._id}`, 'uncoveredStudent');
        for (const key of ['global-turkce', 'global-sosyal', 'foreign-subject', 'foreign-class']) {
            const row = scopeRows.get(key);
            if (row.test) await call('get', `/education/tests/${row.test._id}`, 'uncoveredStudent', undefined, 403);
            await call('get', `/education/assignments/${row.assignment._id}/attachment/0`, 'uncoveredStudent', undefined, 403);
            await call('post', `/education/videos/${row.video._id}/view`, 'uncoveredStudent', {}, 403);
            await call('post', '/education/assignments/submit', 'uncoveredStudent', { assignmentId: String(row.assignment._id), note: 'denied fixture' }, 403);
        }
        const legacyAssignmentId = new mongoose.Types.ObjectId();
        await model('Assignment').collection.insertOne({ _id: legacyAssignmentId, title: 'scope-subjectless', gradeLevel: 8,
            teacherId: teacher._id, dueDate: new Date(Date.now() + 86400000), attachments: ['data:application/pdf;base64,VGVzdA=='] });
        await call('get', `/education/assignments/${legacyAssignmentId}/attachment/0`, 'uncoveredStudent', undefined, 403);
        assert.ok(!(await call('get', '/education/student/assignments', 'uncoveredStudent')).body.some(row => row._id === String(legacyAssignmentId)));
        const manualUnion = await Enrollment.create({ studentId: uncoveredStudent._id, gradeId: sozelGrade._id, accessSource: 'manual' });
        await call('get', `/education/tests/${scopeRows.get('global-turkce').test._id}`, 'uncoveredStudent');
        await call('get', `/education/tests/${scopeRows.get('global-sosyal').test._id}`, 'uncoveredStudent');
        await call('get', `/education/assignments/${legacyAssignmentId}/attachment/0`, 'uncoveredStudent');
        await Enrollment.updateOne({ _id: manualUnion._id }, { $unset: { accessSource: 1 } });
        await call('get', `/education/tests/${scopeRows.get('global-turkce').test._id}`, 'uncoveredStudent');
        await Enrollment.updateOne({ studentId: uncoveredStudent._id, gradeId: sayisalGrade._id }, { $set: { 'packageGrants.$[].expiresAt': new Date(Date.now() - 1000) } });
        await call('get', `/education/tests/${scopeRows.get('bound-math').test._id}`, 'uncoveredStudent', undefined, 403);
        await call('get', `/education/assignments/${scopeRows.get('own-class').assignment._id}/attachment/0`, 'uncoveredStudent', undefined, 403);
        await call('get', `/education/tests/${scopeRows.get('global-turkce').test._id}`, 'uncoveredStudent');
        checked('paid cohort subject boundaries across content, lists, dashboard, calendar and parent; exact teacher binding and independent manual/legacy access survive');

        await User.updateOne({ _id: admin._id }, { $set: { role: 'STUDENT' } });
        await call('get', '/packages/admin', 'admin', undefined, 403); await call('get', '/payment/admin/orders', 'admin', undefined, 403);
        await call('get', '/education/student-enrollments', 'admin', undefined, 403);
        await call('post', '/education/student-enrollments', 'admin', { studentId: String(sandboxUser._id), gradeId: String(grade._id) }, 403);
        await call('delete', `/education/student-enrollments/${enrollment._id}`, 'admin', undefined, 403);
        await User.updateOne({ _id: admin._id }, { $set: { role: 'ADMIN', isActive: false } });
        await call('get', '/payment/admin/readiness', 'admin', undefined, 401);
        await call('get', '/education/student-enrollments', 'admin', undefined, 401);
        await User.updateOne({ _id: admin._id }, { $set: { isActive: true } });
        await call('delete', `/packages/${pkg._id}`, 'admin');
        await call('get', `/packages/${pkg._id}`, null, undefined, 404);
        assert.ok(await Order.findById(order._id)); assert.ok((await call('get', `/payment/orders/${order._id}`, 'student')).body.packageName);
        checked('stale admin sessions revoked immediately and archived packages preserve order history');
        console.log(JSON.stringify({ passed: results.length, actualProviderCalls: 0, disposableDatabase: true }));
    } finally {
        if (app) await app.close();
        await mongo.stop();
    }
}
main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
