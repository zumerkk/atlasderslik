#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const ts = createRequire(path.join(root, 'apps/web/package.json'))('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(path.join(root, 'apps/web/src/lib', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture() {
    const stored = new Map([['token', 'old-session'], ['user', '{"id":"old-user"}']]);
    const events = [], requests = [];
    const window = { location: { pathname: '/cart', search: '?packageId=aaaaaaaaaaaaaaaaaaaaaaaa', href: '' }, dispatchEvent: event => events.push(event.type) };
    const context = vm.createContext({ exports: {}, process: { env: { NEXT_PUBLIC_API_URL: 'https://fixture.test' } },
        window, localStorage: { getItem: key => stored.get(key) ?? null, removeItem: key => stored.delete(key) },
        AbortController, AbortSignal, DOMException, Event, setTimeout, clearTimeout, console,
        fetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })),
    });
    const navigation = { exports: {}, URL, URLSearchParams };
    vm.runInNewContext(compile('auth-navigation.ts'), navigation);
    context.require = name => { assert.equal(name, './auth-navigation'); return navigation.exports; };
    vm.runInContext(compile('api.ts'), context);
    return { ...context.exports, stored, window, events, requests };
}

async function main() {
    // Both successful and unauthorized late responses must remain bound to the
    // account that requested them, including when retries were enabled.
    for (const status of [200, 401]) {
        const state = fixture();
        const pending = state.apiGet('/payment/my-orders');
        assert.equal(state.requests[0].options.headers.Authorization, 'Bearer old-session');
        state.stored.set('token', 'new-session'); state.stored.set('user', '{"id":"new-user"}');
        state.requests[0].resolve(new Response('{}', { status }));
        await assert.rejects(pending, error => error.name === 'AbortError');
        assert.equal(state.requests.length, 1);
        assert.equal(state.stored.get('token'), 'new-session');
        assert.equal(state.window.location.href, ''); assert.deepEqual(state.events, []);
    }
    const state = fixture();
    const pending = state.apiGet('/cart');
    state.requests[0].resolve(new Response('{}', { status: 401 }));
    await assert.rejects(pending, /Oturum süresi doldu/);
    assert.equal(state.stored.has('token'), false); assert.equal(state.stored.has('user'), false);
    assert.deepEqual(state.events, ['atlas:auth-changed']);
    assert.equal(state.window.location.href, '/login?redirect=%2Fcart%3FpackageId%3Daaaaaaaaaaaaaaaaaaaaaaaa');
    console.log(JSON.stringify({ passed: 3, cases: ['late-success-account-switch', 'late-401-account-switch', 'expired-session-preserves-cart-intent'], networkCalls: 0 }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
