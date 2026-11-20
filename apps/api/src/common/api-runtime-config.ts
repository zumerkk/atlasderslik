import { mongo } from 'mongoose';

const developmentOrigins = ['http://localhost:3000', 'https://atlasderslik.com', 'https://www.atlasderslik.com'];

/** Validate deployment settings before initializing Mongo, controllers or workers. */
export function apiRuntimeConfig(env: NodeJS.ProcessEnv) {
  const production = env.NODE_ENV === 'production';
  if (production) {
    try {
      // The constructor parses the URI without opening a database connection.
      if (!env.MONGO_URI || /[<>]/.test(env.MONGO_URI)) throw new Error();
      new mongo.MongoClient(env.MONGO_URI);
    } catch {
      throw new Error('MONGO_URI must be explicitly configured for production.');
    }
    const secret = env.JWT_SECRET?.trim();
    if (!secret || secret.length < 32 || /^(?:change[_ -]?this|replace[_ -]?me|example|placeholder)/i.test(secret)) {
      throw new Error('JWT_SECRET must be a private production secret of at least 32 characters.');
    }
  }

  const configuredOrigins = env.CORS_ORIGIN?.split(',').map(value => value.trim()).filter(Boolean) || [];
  const origins = [...new Set(configuredOrigins.length ? configuredOrigins : production ? [] : developmentOrigins)];
  if (production && (!origins.length || origins.some(value => {
    try {
      const url = new URL(value);
      return url.protocol !== 'https:' || url.origin !== value || /^(?:localhost|127\.|\[::1\])/i.test(url.hostname);
    } catch { return true; }
  }))) throw new Error('CORS_ORIGIN must list explicit production HTTPS origins without paths.');

  const rawHops = env.TRUST_PROXY_HOPS ?? '0';
  if (production && !/^[0-5]$/.test(rawHops)) throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 5.');
  return { origins, proxyHops: production ? Number(rawHops) : 0 };
}
