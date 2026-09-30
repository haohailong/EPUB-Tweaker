import * as csstree from 'css-tree';
import { decodeText, openArchiveSync, readFirstLocalHeader } from './archive';
import { EpubError } from './errors';
import { parseBook } from './parser';
import { resolvePath, splitReference } from './path';
import { elementsByLocalName, parseXml } from './xml';

function allElements(document: Document): Element[] {
  const nodes = document.getElementsByTagName('*');
  const output: Element[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const item = nodes.item(index);
    if (item) output.push(item);
  }
  return output;
}

function validateReference(files: Map<string, Uint8Array>, sourcePath: string, rawReference: string, requireFragment = false): void {
  if (!rawReference || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(rawReference)) return;
  const { file, fragment } = splitReference(rawReference);
  const targetPath = file ? resolvePath(sourcePath, file) : sourcePath;
  const target = files.get(targetPath);
  if (!target) throw new EpubError('POST_VALIDATION_FAILED', `Internal reference target is missing: ${rawReference}`, sourcePath);
  if (fragment || requireFragment) {
    if (!fragment) return;
    const targetDocument = parseXml(decodeText(target), targetPath);
    if (!allElements(targetDocument).some((element) => element.getAttribute('id') === fragment || element.getAttribute('name') === fragment)) {
      throw new EpubError('POST_VALIDATION_FAILED', `Fragment target #${fragment} is missing in ${targetPath}.`, sourcePath);
    }
  }
}

export function validateOutput(buffer: ArrayBuffer): string[] {
  const header = readFirstLocalHeader(new Uint8Array(buffer));
  if (header.firstName !== 'mimetype') throw new EpubError('POST_VALIDATION_FAILED', 'mimetype is not the first ZIP entry.');
  if (header.firstMethod !== 0) throw new EpubError('POST_VALIDATION_FAILED', 'mimetype is compressed; EPUB requires it to be stored.');
  const files = openArchiveSync(buffer);
  const book = parseBook(files);
  const ids = new Set<string>();
  const itemsById = new Map<string, string>();
  for (const item of book.manifest) {
    if (!item.id || ids.has(item.id)) throw new EpubError('POST_VALIDATION_FAILED', `Manifest ID is missing or duplicated: ${item.id || '(empty)'}`, book.packagePath);
    ids.add(item.id);
    itemsById.set(item.id, item.path);
    if (!files.has(item.path)) throw new EpubError('MANIFEST_RESOURCE_MISSING', `Referenced manifest resource is missing: ${item.path}`, item.path);
  }
  for (const spineItem of book.spine) {
    if (!itemsById.has(spineItem.idref)) throw new EpubError('SPINE_RESOURCE_MISSING', `Spine reference is missing from the manifest: ${spineItem.idref}`, book.packagePath);
  }
  for (const item of book.manifest) {
    const data = files.get(item.path)!;
    if (item.mediaType === 'text/css') {
      try { csstree.parse(decodeText(data)); } catch { throw new EpubError('POST_VALIDATION_FAILED', `CSS cannot be parsed: ${item.path}`, item.path); }
      continue;
    }
    if (!/(?:xml|xhtml|html|svg|dtbncx)/.test(item.mediaType)) continue;
    const document = parseXml(decodeText(data), item.path);
    for (const element of allElements(document)) {
      for (const attribute of ['href', 'src']) {
        const reference = element.getAttribute(attribute);
        if (!reference || reference.startsWith('#')) {
          if (reference?.startsWith('#')) validateReference(files, item.path, reference);
          continue;
        }
        validateReference(files, item.path, reference);
      }
    }
  }
  for (const navPath of book.navigationPaths) {
    const data = files.get(navPath);
    if (!data) throw new EpubError('POST_VALIDATION_FAILED', `Navigation resource is missing: ${navPath}`, navPath);
    const document = parseXml(decodeText(data), navPath);
    for (const element of [...elementsByLocalName(document, 'a'), ...elementsByLocalName(document, 'content')]) {
      const reference = element.getAttribute('href') || element.getAttribute('src');
      if (reference) validateReference(files, navPath, reference);
    }
  }
  return [
    'ZIP reopened successfully',
    'mimetype is first and stored uncompressed',
    'container.xml and package document parsed',
    `${book.manifest.length} manifest resources resolved`,
    `${book.spine.length} spine references resolved`,
    'Navigation destinations resolved',
    'XML/XHTML and CSS resources parsed',
    'Internal resource references checked'
  ];
}
