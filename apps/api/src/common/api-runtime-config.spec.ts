import { apiRuntimeConfig } from './api-runtime-config';

const production = {
  NODE_ENV: 'production', MONGO_URI: 'mongodb://localhost:27017/runtime_fixture',
  JWT_SECRET: 'runtime-fixture-secret-not-for-deploy-0123456789', CORS_ORIGIN: 'https://atlas.example.test',
};

describe('API production environment', () => {
  it('rejects unsafe or missing settings without returning a credential in the error', () => {
    expect(() => apiRuntimeConfig({ ...production, MONGO_URI: 'invalid-fixture-credential' })).toThrow(/^MONGO_URI must be explicitly configured for production\.$/);
    expect(() => apiRuntimeConfig({ ...production, JWT_SECRET: 'change_this_to_a_secure_random_string' })).toThrow('JWT_SECRET');
    expect(() => apiRuntimeConfig({ ...production, CORS_ORIGIN: undefined })).toThrow('CORS_ORIGIN');
    expect(() => apiRuntimeConfig({ ...production, CORS_ORIGIN: 'https://atlas.example.test/path' })).toThrow('CORS_ORIGIN');
    expect(() => apiRuntimeConfig({ ...production, TRUST_PROXY_HOPS: 'true' })).toThrow('TRUST_PROXY_HOPS');
  });
  it('trims origin entries and only trusts explicitly configured proxy hops', () => {
    expect(apiRuntimeConfig({ ...production, CORS_ORIGIN: ' https://atlas.example.test , https://atlas.example.test ' })).toEqual({ origins: ['https://atlas.example.test'], proxyHops: 0 });
    expect(apiRuntimeConfig({ ...production, TRUST_PROXY_HOPS: '1' }).proxyHops).toBe(1);
  });
});
