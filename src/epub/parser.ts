import { assertMimetype, decodeText, type ArchiveFiles } from './archive';
import { EpubError } from './errors';
import type { BookModel } from './model';
import { resolvePath } from './path';
import { elementsByLocalName, firstByLocalName, parseXml, textOf } from './xml';
import type { EffectiveProgression, EncryptionInfo, LayoutType, ManifestItem, SpineItem, WritingMode } from '../types';

const FONT_OBFUSCATION = new Set([
  'http://www.idpf.org/2008/embedding',
  'http://ns.adobe.com/pdf/enc#RC'
]);

function isTextLike(data: Uint8Array): boolean {
  const head = data.slice(0, 256);
  if (head.some((value) => value === 0)) return false;
  const text = decodeText(head).trimStart();
  return text.startsWith('<') || text.startsWith('@') || /^[\s\x20-\x7e]+$/.test(text);
}

function hasKnownBinarySignature(data: Uint8Array): boolean {
  return (
    (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) ||
    (data[0] === 0xff && data[1] === 0xd8) ||
    String.fromCharCode(...data.slice(0, 4)) === 'GIF8' ||
    String.fromCharCode(...data.slice(0, 4)) === 'RIFF' ||
    isTextLike(data)
  );
}

function parseEncryption(files: ArchiveFiles): EncryptionInfo[] {
  const data = files.get('META-INF/encryption.xml');
  if (!data) return [];
  const document = parseXml(decodeText(data), 'META-INF/encryption.xml');
  return elementsByLocalName(document, 'EncryptedData').map((entry) => {
    const method = elementsByLocalName(entry, 'EncryptionMethod')[0];
    const reference = elementsByLocalName(entry, 'CipherReference')[0];
    const path = reference?.getAttribute('URI') ? resolvePath('root', reference.getAttribute('URI')!) : '';
    const algorithm = method?.getAttribute('Algorithm') ?? '';
    const isFontObfuscation = FONT_OBFUSCATION.has(algorithm) && /\.(?:otf|ttf|woff2?)$/i.test(path);
    const target = files.get(path);
    const appearsStale = FONT_OBFUSCATION.has(algorithm) && Boolean(target && hasKnownBinarySignature(target));
    return { path, algorithm, isFontObfuscation, appearsStale };
  });
}

function getMetadataValue(document: Document, localName: string): string {
  return textOf(firstByLocalName(document, 'metadata') ?? document, localName);
}

function detectWritingMode(files: ArchiveFiles, manifest: ManifestItem[]): WritingMode {
  const candidates = manifest.filter((item) => item.mediaType === 'text/css' || /xhtml|html/.test(item.mediaType));
  const horizontalOverride = candidates.find((item) => /epub-tweaker-horizontal(?:-\d+)?\.css$/i.test(item.path));
  if (horizontalOverride) {
    const data = files.get(horizontalOverride.path);
    if (data && /writing-mode\s*:\s*horizontal-tb/i.test(decodeText(data))) return 'horizontal';
  }
  for (const item of candidates) {
    const data = files.get(item.path);
    if (!data) continue;
    const text = decodeText(data);
    if (/(?:-epub-|-webkit-)?writing-mode\s*:\s*vertical-rl/i.test(text)) return 'vertical-rl';
    if (/(?:-epub-|-webkit-)?writing-mode\s*:\s*vertical-lr/i.test(text)) return 'vertical-lr';
  }
  return candidates.length ? 'horizontal' : 'unknown';
}

function detectLayout(document: Document): LayoutType {
  for (const meta of elementsByLocalName(document, 'meta')) {
    const key = meta.getAttribute('property') || meta.getAttribute('name') || '';
    const value = (meta.textContent || meta.getAttribute('content') || '').trim().toLowerCase();
    if ((key === 'rendition:layout' || key === 'fixed-layout') && /pre-paginated|true/.test(value)) return 'fixed';
  }
  return 'reflowable';
}

export function parseBook(files: ArchiveFiles): BookModel {
  assertMimetype(files);
  const containerData = files.get('META-INF/container.xml');
  if (!containerData) throw new EpubError('EPUB_CONTAINER_MISSING', 'META-INF/container.xml is missing.', 'META-INF/container.xml');
  const container = parseXml(decodeText(containerData), 'META-INF/container.xml');
  const rootfile = firstByLocalName(container, 'rootfile');
  const packagePath = rootfile?.getAttribute('full-path');
  if (!packagePath) throw new EpubError('PACKAGE_DOCUMENT_MISSING', 'The container does not identify a package document.');
  const packageData = files.get(packagePath);
  if (!packageData) throw new EpubError('PACKAGE_DOCUMENT_MISSING', `Package document not found: ${packagePath}`, packagePath);
  const packageDocument = parseXml(decodeText(packageData), packagePath);
  const packageElement = packageDocument.documentElement;
  const version = packageElement.getAttribute('version') || '2.0';
  const majorVersion = Number.parseInt(version, 10) >= 3 ? 3 : 2;
  const manifest: ManifestItem[] = elementsByLocalName(packageDocument, 'item').map((item) => {
    const href = item.getAttribute('href') ?? '';
    return {
      id: item.getAttribute('id') ?? '',
      href,
      path: resolvePath(packagePath, href),
      mediaType: item.getAttribute('media-type') ?? '',
      properties: (item.getAttribute('properties') ?? '').split(/\s+/).filter(Boolean)
    };
  });
  const spineElement = firstByLocalName(packageDocument, 'spine');
  const spine: SpineItem[] = spineElement
    ? elementsByLocalName(spineElement, 'itemref').map((item) => ({
        idref: item.getAttribute('idref') ?? '',
        linear: item.getAttribute('linear') !== 'no',
        properties: (item.getAttribute('properties') ?? '').split(/\s+/).filter(Boolean)
      }))
    : [];
  const rawProgression = spineElement?.getAttribute('page-progression-direction');
  let progression: EffectiveProgression = rawProgression === 'rtl' || rawProgression === 'ltr' ? rawProgression : 'default';
  if (majorVersion === 2 && progression === 'default') {
    const primaryMode = elementsByLocalName(packageDocument, 'meta')
      .find((meta) => meta.getAttribute('name') === 'primary-writing-mode')
      ?.getAttribute('content');
    if (primaryMode === 'vertical-rl' || primaryMode === 'horizontal-rl') progression = 'rtl';
    else if (primaryMode === 'vertical-lr' || primaryMode === 'horizontal-lr') progression = 'ltr';
  }
  const navigationPaths = manifest
    .filter((item) => item.mediaType === 'application/x-dtbncx+xml' || item.properties.includes('nav'))
    .map((item) => item.path);
  const encryption = parseEncryption(files);
  const protectedResource = encryption.find((item) => !item.isFontObfuscation && !item.appearsStale);
  if (protectedResource) {
    throw new EpubError('DRM_PROTECTED', 'This EPUB contains DRM-protected resources. EPUB Tweaker does not remove DRM.', protectedResource.path);
  }
  return {
    files,
    packagePath,
    packageDocument,
    version,
    majorVersion,
    title: getMetadataValue(packageDocument, 'title'),
    author: getMetadataValue(packageDocument, 'creator'),
    language: getMetadataValue(packageDocument, 'language'),
    manifest,
    spine,
    writingMode: detectWritingMode(files, manifest),
    progression,
    layout: detectLayout(packageDocument),
    encryption,
    navigationPaths
  };
}
