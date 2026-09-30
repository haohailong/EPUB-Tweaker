import type { ArchiveFiles } from './archive';
import type { BookInfo, EffectiveProgression, EncryptionInfo, LayoutType, ManifestItem, SpineItem, WritingMode } from '../types';

export interface BookModel {
  files: ArchiveFiles;
  packagePath: string;
  packageDocument: Document;
  version: string;
  majorVersion: 2 | 3;
  title: string;
  author: string;
  language: string;
  manifest: ManifestItem[];
  spine: SpineItem[];
  writingMode: WritingMode;
  progression: EffectiveProgression;
  layout: LayoutType;
  encryption: EncryptionInfo[];
  navigationPaths: string[];
}

export function toBookInfo(book: BookModel): BookInfo {
  const contentDocuments = book.manifest.filter((item) => /xhtml|html/.test(item.mediaType)).length;
  const stylesheets = book.manifest.filter((item) => item.mediaType === 'text/css').length;
  const imageResources = book.manifest
    .filter((item) => item.mediaType.startsWith('image/'))
    .map((item) => ({ path: item.path, mediaType: item.mediaType }));
  return {
    title: book.title || 'Untitled',
    author: book.author,
    language: book.language,
    version: book.version,
    majorVersion: book.majorVersion,
    packagePath: book.packagePath,
    writingMode: book.writingMode,
    progression: book.progression,
    layout: book.layout,
    contentDocuments,
    stylesheets,
    images: imageResources.length,
    imageResources,
    encryptedResources: book.encryption.filter((item) => !item.isFontObfuscation && !item.appearsStale).length
  };
}
