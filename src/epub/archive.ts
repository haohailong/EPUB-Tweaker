import { strFromU8, strToU8, unzip, unzipSync, zipSync, type AsyncUnzipOptions, type Zippable } from 'fflate';
import { EpubError } from './errors';
import { normalizeArchivePath } from './path';

export const MAX_COMPRESSED_BYTES = 200 * 1024 * 1024;
export const MAX_ENTRY_BYTES = 100 * 1024 * 1024;
export const MAX_EXPANDED_BYTES = 600 * 1024 * 1024;
const MIME = 'application/epub+zip';

export type ArchiveFiles = Map<string, Uint8Array>;

export interface ZipHeaderInfo {
  firstName: string;
  firstMethod: number;
}

export function readFirstLocalHeader(bytes: Uint8Array): ZipHeaderInfo {
  if (bytes.length < 30 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    throw new EpubError('INVALID_EPUB_ARCHIVE', 'The file is not a valid ZIP-based EPUB.');
  }
  const method = bytes[8] | (bytes[9] << 8);
  const nameLength = bytes[26] | (bytes[27] << 8);
  const name = new TextDecoder().decode(bytes.slice(30, 30 + nameLength));
  return { firstName: name, firstMethod: method };
}

export async function openArchive(buffer: ArrayBuffer): Promise<ArchiveFiles> {
  if (buffer.byteLength > MAX_COMPRESSED_BYTES) {
    throw new EpubError('ZIP_BOMB_LIMIT', 'The EPUB exceeds the 200 MB compressed-size safety limit.');
  }
  const bytes = new Uint8Array(buffer);
  readFirstLocalHeader(bytes);
  let expanded = 0;
  const options: AsyncUnzipOptions = {
    filter(file) {
      const path = normalizeArchivePath(file.name);
      if (!path || file.originalSize > MAX_ENTRY_BYTES) {
        throw new EpubError('ZIP_BOMB_LIMIT', `Archive entry is too large: ${file.name}`, file.name);
      }
      expanded += file.originalSize;
      if (expanded > MAX_EXPANDED_BYTES) {
        throw new EpubError('ZIP_BOMB_LIMIT', 'The EPUB exceeds the 600 MB expanded-size safety limit.');
      }
      return !file.name.endsWith('/');
    }
  };
  const unzipped = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    try {
      unzip(bytes, options, (error, data) => (error ? reject(error) : resolve(data)));
    } catch (error) {
      reject(error);
    }
  });
  const files: ArchiveFiles = new Map();
  for (const [rawPath, data] of Object.entries(unzipped)) {
    const path = normalizeArchivePath(rawPath);
    if (files.has(path)) throw new EpubError('INVALID_EPUB_ARCHIVE', `Duplicate archive path: ${path}`, path);
    files.set(path, data);
  }
  return files;
}

export function openArchiveSync(buffer: ArrayBuffer): ArchiveFiles {
  if (buffer.byteLength > MAX_COMPRESSED_BYTES) throw new EpubError('ZIP_BOMB_LIMIT', 'Compressed-size limit exceeded.');
  readFirstLocalHeader(new Uint8Array(buffer));
  const raw = unzipSync(new Uint8Array(buffer), { filter: (file) => file.originalSize <= MAX_ENTRY_BYTES });
  const files: ArchiveFiles = new Map();
  let total = 0;
  for (const [rawPath, data] of Object.entries(raw)) {
    const path = normalizeArchivePath(rawPath);
    total += data.length;
    if (total > MAX_EXPANDED_BYTES) throw new EpubError('ZIP_BOMB_LIMIT', 'Expanded-size limit exceeded.');
    files.set(path, data);
  }
  return files;
}

export function decodeText(data: Uint8Array): string {
  if (data[0] === 0xff && data[1] === 0xfe) return new TextDecoder('utf-16le').decode(data);
  if (data[0] === 0xfe && data[1] === 0xff) {
    const swapped = data.slice(2);
    for (let index = 0; index + 1 < swapped.length; index += 2) {
      const value = swapped[index];
      swapped[index] = swapped[index + 1];
      swapped[index + 1] = value;
    }
    return new TextDecoder('utf-16le').decode(swapped);
  }
  const head = new TextDecoder('ascii').decode(data.slice(0, 512));
  const label = /encoding\s*=\s*["']\s*([^"']+)/i.exec(head)?.[1]?.trim();
  try {
    return new TextDecoder(label || 'utf-8', { fatal: true }).decode(data);
  } catch {
    try {
      return new TextDecoder(label || 'windows-1252').decode(data);
    } catch {
      return strFromU8(data);
    }
  }
}

export function encodeText(value: string): Uint8Array {
  return strToU8(value);
}

export function createEpubArchive(files: ArchiveFiles): Uint8Array {
  const zippable: Zippable = {};
  zippable.mimetype = [strToU8(MIME), { level: 0, mtime: new Date('1980-01-01T00:00:00Z') }];
  for (const path of [...files.keys()].filter((entry) => entry !== 'mimetype').sort()) {
    const data = files.get(path)!;
    const alreadyCompressed = /\.(?:jpe?g|png|gif|webp|avif|mp3|mp4|woff2?|otf|ttf)$/i.test(path);
    zippable[path] = [data, { level: alreadyCompressed ? 0 : 6, mtime: new Date('1980-01-01T00:00:00Z') }];
  }
  return zipSync(zippable);
}

export function assertMimetype(files: ArchiveFiles): void {
  const mimetype = files.get('mimetype');
  if (!mimetype || decodeText(mimetype) !== MIME) {
    throw new EpubError('INVALID_EPUB_ARCHIVE', 'The EPUB mimetype file is missing or invalid.', 'mimetype');
  }
}
