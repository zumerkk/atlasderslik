#!/usr/bin/env node
// Local development stack. Mongo uses a persistent folder; stopping never deletes data.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, openSync, closeSync, chmodSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';

const script = fileURLToPath(import.meta.url);
const root = dirname(dirname(script));
const local = join(root, '.atlas-local');
const runtime = join(local, 'runtime');
const stateFile = join(local, 'state.json');
const command = process.argv[2] || 'start';
const runtimeVersion = '11.2.0';
const ports = { web: 3000, api: 3001, mongo: 27017 };
const mongoUri = `mongodb://127.0.0.1:${ports.mongo}/atlas_local`;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
for (const dir of [local, runtime, join(local, 'data'), join(local, 'logs')]) mkdirSync(dir, { recursive: true, mode: 0o700 });
chmodSync(local, 0o700);

function readState() {
  try { return JSON.parse(readFileSync(stateFile, 'utf8')); } catch { return null; }
}
function isOurProcess(state) {
  if (!Number.isInteger(state?.pid) || state.pid < 2) return false;
  try {
    const args = execFileSync('ps', ['-p', String(state.pid), '-o', 'command='], { encoding: 'utf8' });
    return args.includes(script) && args.includes('serve');
  } catch { return false; }
}
function run(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { cwd: root, stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${file} başarısız oldu (${code}).`)));
  });
}
async function ensureFree(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () => reject(new Error(`${port} portu kullanılıyor. Bu yerel kurulumu başlatmadan önce ilgili servisi kapatın.`)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}
async function health(url, timeout = 120000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(4000) }); if (response.ok) return; } catch { /* still starting */ }
    await sleep(500);
  }
  throw new Error(`${url} zamanında hazır olmadı.`);
}

async function start() {
  if (isOurProcess(readState())) {
    console.log('Atlas zaten çalışıyor. http://localhost:3000/login');
    return;
  }
  for (const port of Object.values(ports)) await ensureFree(port);
  if (!existsSync(join(runtime, 'node_modules/mongodb-memory-server/package.json'))) {
    console.log('Yerel veritabanı çalıştırıcısı kuruluyor (ilk kurulum).');
    await run('npm', ['install', '--prefix', runtime, '--ignore-scripts', '--no-audit', '--no-fund', `mongodb-memory-server@${runtimeVersion}`]);
  }
  console.log('Atlas uygulaması hazırlanıyor.');
  await run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], { cwd: join(root, 'packages/shared') });
  await run(process.execPath, [join(root, 'apps/api/node_modules/@nestjs/cli/bin/nest.js'), 'build'], { cwd: join(root, 'apps/api') });
  const output = openSync(join(local, 'logs/stack.log'), 'a', 0o600);
  const daemon = spawn(process.execPath, [script, 'serve'], { cwd: root, detached: true, stdio: ['ignore', output, output] });
  daemon.unref();
  closeSync(output);
  console.log('Yerel MongoDB, API ve web başlatılıyor. İlk MongoDB indirmesi birkaç dakika sürebilir.');
  console.log('Adres: http://localhost:3000/login');
  console.log('Durum: npm run local:status | Kapat: npm run local:stop');
  console.log('Hesaplar: .atlas-local/credentials.json | Günlük: .atlas-local/logs/stack.log');
}

async function serve() {
  const startedAt = new Date().toISOString();
  const saveState = (status, extra = {}) => writeFileSync(stateFile, JSON.stringify({ pid: process.pid, startedAt, status, ports, ...extra }, null, 2), { mode: 0o600 });
  let mongo;
  let stopping = false;
  const children = [];
  async function shutdown(code = 0) {
    if (stopping) return;
    stopping = true;
    saveState('stopping');
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    for (let attempt = 0; attempt < 40 && children.some(child => child.exitCode === null && child.signalCode === null); attempt++) await sleep(100);
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    if (mongo) await mongo.stop({ doCleanup: false });
    saveState(code ? 'failed' : 'stopped');
    process.exit(code);
  }
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
  const launch = (name, args, cwd, env) => {
    const log = openSync(join(local, 'logs', `${name}.log`), 'a', 0o600);
    const child = spawn(process.execPath, args, { cwd, env, stdio: ['ignore', log, log] });
    closeSync(log);
    children.push(child);
    child.once('error', err => { console.error(`${name}: ${err.message}`); void shutdown(1); });
    child.once('exit', code => { if (!stopping) { console.error(`${name} durdu (${code}).`); void shutdown(1); } });
    return child;
  };
  saveState('starting');
  try {
    const require = createRequire(join(runtime, 'package.json'));
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongo = await MongoMemoryServer.create({
      instance: { port: ports.mongo, portGeneration: false, ip: '127.0.0.1', dbName: 'atlas_local', dbPath: join(local, 'data'), storageEngine: 'wiredTiger', launchTimeout: 60000 },
      binary: { version: '8.2.6', downloadDir: join(local, 'mongodb-binaries') },
    });
    const secretFile = join(local, 'server-secret');
    if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(48).toString('base64url'), { mode: 0o600 });
    const env = {
      ...process.env, NODE_ENV: 'development', MONGO_URI: mongoUri, ATLAS_LOCAL_MONGO_URI: mongoUri,
      JWT_SECRET: readFileSync(secretFile, 'utf8').trim(), HOST: '127.0.0.1', PORT: String(ports.api),
      CORS_ORIGIN: 'http://localhost:3000,http://127.0.0.1:3000', FRONTEND_URL: 'http://localhost:3000',
      // A local test account must never start a real checkout.
      IYZICO_API_KEY: '', IYZICO_SECRET_KEY: '', IYZICO_BASE_URL: '',
      NEXT_TELEMETRY_DISABLED: '1',
    };
    await run(process.execPath, [join(root, 'scripts/seed-local.cjs')], { env });
    launch('api', [join(root, 'apps/api/dist/main.js')], join(root, 'apps/api'), env);
    await health(`http://127.0.0.1:${ports.api}/ping`);
    launch('web', [join(root, 'apps/web/node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(ports.web)], join(root, 'apps/web'), {
      ...env, NEXT_PUBLIC_API_URL: '/api', ATLAS_API_PROXY_URL: `http://127.0.0.1:${ports.api}`,
    });
    await health(`http://127.0.0.1:${ports.web}/login`);
    saveState('ready');
    console.log(`[${new Date().toISOString()}] Atlas hazır: http://localhost:3000/login`);
    // Child process handles keep this supervisor alive.
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Yerel kurulum başlatılamadı.');
    await shutdown(1);
  }
}

async function stop() {
  const state = readState();
  if (!isOurProcess(state)) { console.log('Bu yerel Atlas kurulumu çalışmıyor.'); return; }
  process.kill(state.pid, 'SIGTERM');
  for (let attempt = 0; attempt < 100 && isOurProcess(state); attempt++) await sleep(100);
  if (isOurProcess(state)) throw new Error('Kapanış sürüyor. Günlüğü kontrol edin.');
  console.log('Atlas kapatıldı. Veritabanı ve parolalar korundu.');
}

try {
  if (command === 'start') await start();
  else if (command === 'serve') await serve();
  else if (command === 'stop') await stop();
  else if (command === 'status') {
    const state = readState();
    console.log(JSON.stringify({ ...state, running: isOurProcess(state), url: 'http://localhost:3000/login' }, null, 2));
  } else throw new Error('Kullanım: node scripts/atlas-local.mjs start|stop|status');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
