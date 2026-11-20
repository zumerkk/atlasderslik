'use strict';

const { accessSync, cpSync, constants } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { basename, isAbsolute, join, resolve } = require('node:path');
const root = resolve(__dirname, '..');

if (process.argv[2] === 'api') {
  const api = join(root, 'apps/api');
  accessSync(join(api, 'dist/main.js'), constants.R_OK);
  const requireApi = createRequire(join(api, 'package.json'));
  if (!requireApi('sharp').versions.vips) throw new Error('AtlasAI image renderer is unavailable.');
  for (const name of ['AtlasSans-Regular.ttf', 'AtlasSans-Bold.ttf']) {
    const font = requireApi('fontkit').openSync(join(api, 'assets/pdf', name));
    if (!font.hasGlyphForCodePoint('ı'.codePointAt(0))) throw new Error('AtlasAI Turkish font is unavailable.');
  }
  const binaries = {
    ffmpeg: process.env.FFMPEG_PATH || requireApi('ffmpeg-static'),
    ffprobe: process.env.FFPROBE_PATH || requireApi('ffprobe-static').path,
  };
  for (const [name, executable] of Object.entries(binaries)) {
    if (typeof executable !== 'string' || !isAbsolute(executable) || spawnSync(executable, ['-version'], { stdio: 'ignore', timeout: 10000 }).status !== 0) {
      throw new Error(`${name} is not executable for this deployment platform.`);
    }
  }
  console.log('API entry point, image renderer, Turkish fonts, ffmpeg and ffprobe are ready.');
} else if (process.argv[2] === 'web') {
  const web = join(root, 'apps/web');
  const server = join(web, '.next/standalone/apps/web');
  accessSync(join(server, 'server.js'), constants.R_OK);
  const options = { recursive: true, filter: source => !basename(source).startsWith('._') };
  cpSync(join(web, '.next/static'), join(server, '.next/static'), options);
  cpSync(join(web, 'public'), join(server, 'public'), options);
  console.log('Standalone web entry point and public assets are ready.');
} else {
  throw new Error('Usage: node scripts/check-render-artifact.cjs api|web');
}
