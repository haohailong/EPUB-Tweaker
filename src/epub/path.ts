import { EpubError } from './errors';

export function normalizeArchivePath(input: string): string {
  const value = input.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!value || value.startsWith('/') || /^[A-Za-z]:/.test(value) || value.includes('\0')) {
    throw new EpubError('ZIP_PATH_TRAVERSAL', `Unsafe archive path: ${input}`, input);
  }
  const parts: string[] = [];
  for (const part of value.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) throw new EpubError('ZIP_PATH_TRAVERSAL', `Archive path escapes its root: ${input}`, input);
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join('/');
}

export function dirname(path: string): string {
  const index = path.lastIndexOf('/');
  return index < 0 ? '' : path.slice(0, index);
}

export function resolvePath(baseFile: string, reference: string): string {
  const withoutQuery = reference.split('#', 1)[0].split('?', 1)[0];
  if (!withoutQuery) return normalizeArchivePath(baseFile);
  const decoded = decodeURIComponent(withoutQuery);
  const base = dirname(baseFile);
  return normalizeArchivePath(base ? `${base}/${decoded}` : decoded);
}

export function splitReference(reference: string): { file: string; fragment: string } {
  const hash = reference.indexOf('#');
  if (hash < 0) return { file: reference, fragment: '' };
  return { file: reference.slice(0, hash), fragment: decodeURIComponent(reference.slice(hash + 1)) };
}

export function relativePath(fromFile: string, target: string): string {
  const from = dirname(fromFile).split('/').filter(Boolean);
  const to = target.split('/').filter(Boolean);
  while (from.length && to.length && from[0] === to[0]) {
    from.shift();
    to.shift();
  }
  return `${from.map(() => '..').join('/')}${from.length ? '/' : ''}${to.join('/')}`;
}
