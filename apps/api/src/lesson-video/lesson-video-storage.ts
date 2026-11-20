import { accessSync, constants, existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/** /proc/self/mountinfo encodes spaces, tabs and backslashes as octal escapes. */
export function hasPersistentVideoMount(mount: string, mountInfo: string): boolean {
  return mount !== '/' && mountInfo.split('\n').some(line => {
    const [fields, description] = line.split(' - ');
    const path = fields.split(' ')[4]?.replace(/\\([0-7]{3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
    return path === mount && !!description && !/^(?:tmpfs|ramfs|overlay) /.test(description);
  });
}

function inside(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return !!path && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

export function videoStorageRoot(production: boolean, directory?: string, mountPoint?: string): string | null {
  if (!production) return resolve(directory || join(process.cwd(), '.atlas-media', 'videos'));
  if (!directory || !mountPoint || !isAbsolute(directory) || !isAbsolute(mountPoint)) return null;
  try {
    const root = resolve(directory);
    const mount = realpathSync(mountPoint);
    // A separate Linux volume is required in production; no working-directory fallback.
    if (!inside(mount, root) || !hasPersistentVideoMount(mount, readFileSync('/proc/self/mountinfo', 'utf8'))) return null;
    let existing = root;
    while (!existsSync(existing)) existing = dirname(existing);
    const actual = realpathSync(existing);
    if (actual !== mount ? !inside(mount, actual) : existing === root) return null;
    if (!statSync(actual).isDirectory()) return null;
    accessSync(actual, constants.W_OK | constants.X_OK);
    return root;
  } catch { return null; }
}
