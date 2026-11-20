import { decodeText, encodeText } from './archive';
import { EpubError } from './errors';
import { imageDimensions } from './images';
import type { BookModel } from './model';
import { dirname, relativePath, resolvePath, splitReference } from './path';
import { elementsByLocalName, firstByLocalName, parseXml, serializeXml } from './xml';
import type { ReplacementPayload, ReportEntry } from '../types';

export function replaceCover(book: BookModel, cover: ReplacementPayload, entries: ReportEntry[]): void {
  const data = new Uint8Array(cover.data);
  const png = data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47;
  const jpeg = data[0] === 0xff && data[1] === 0xd8;
  const dimensions = imageDimensions(data);
  if ((!png && !jpeg) || !dimensions?.width || !dimensions.height) {
    throw new EpubError('INVALID_COVER_IMAGE', 'Choose a valid JPEG or PNG cover image.');
  }
  const opf = book.packageDocument;
  const metadata = firstByLocalName(opf, 'metadata')!;
  const manifest = firstByLocalName(opf, 'manifest')!;
  const spine = firstByLocalName(opf, 'spine')!;
  const coverMeta = elementsByLocalName(metadata, 'meta').find((element) => element.getAttribute('name') === 'cover');
  let oldImage = book.manifest.find((item) => item.properties.includes('cover-image'))
    ?? book.manifest.find((item) => item.id === coverMeta?.getAttribute('content'));
  if (!oldImage) {
    const guideCover = elementsByLocalName(opf, 'reference').find((node) => node.getAttribute('type') === 'cover')?.getAttribute('href');
    const candidate = guideCover ? resolvePath(book.packagePath, splitReference(guideCover).file)
      : book.manifest.find((item) => /xhtml|html/.test(item.mediaType) && /(?:^|\/)cover\.(?:xhtml|html)$/i.test(item.path))?.path;
    if (candidate && book.files.has(candidate)) {
      const page = parseXml(decodeText(book.files.get(candidate)!), candidate);
      const image = firstByLocalName(page, 'img') ?? firstByLocalName(page, 'image');
      const reference = image?.getAttribute('src') || image?.getAttribute('href') || image?.getAttribute('xlink:href');
      if (reference && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) {
        const path = resolvePath(candidate, splitReference(reference).file);
        oldImage = book.manifest.find((item) => item.path === path && item.mediaType.startsWith('image/'));
      }
    }
  }
  const directory = dirname(book.packagePath);
  const uniquePath = (name: string, extension: string): string => {
    let index = 1;
    let path: string;
    do { path = `${directory ? `${directory}/` : ''}${name}${index === 1 ? '' : `-${index}`}.${extension}`; index += 1; } while (book.files.has(path));
    return path;
  };
  const addResource = (path: string, mediaType: string, properties: string[] = []): string => {
    let id = 'epub-tweaker-cover';
    let index = 2;
    while (book.manifest.some((item) => item.id === id)) id = `epub-tweaker-cover-${index++}`;
    const element = opf.createElementNS(opf.documentElement.namespaceURI, 'item');
    const href = relativePath(book.packagePath, path);
    element.setAttribute('id', id);
    element.setAttribute('href', href);
    element.setAttribute('media-type', mediaType);
    if (properties.length) element.setAttribute('properties', properties.join(' '));
    manifest.appendChild(element);
    book.manifest.push({ id, href, path, mediaType, properties });
    return id;
  };
  const imagePath = uniquePath('epub-tweaker-cover', png ? 'png' : 'jpg');
  book.files.set(imagePath, data);
  for (const item of book.manifest) {
    if (!item.properties.includes('cover-image')) continue;
    item.properties = item.properties.filter((value) => value !== 'cover-image');
    const element = elementsByLocalName(manifest, 'item').find((node) => node.getAttribute('id') === item.id)!;
    if (item.properties.length) element.setAttribute('properties', item.properties.join(' '));
    else element.removeAttribute('properties');
  }
  const imageId = addResource(imagePath, png ? 'image/png' : 'image/jpeg', book.majorVersion === 3 ? ['cover-image'] : []);
  const meta = coverMeta ?? opf.createElementNS(opf.documentElement.namespaceURI, 'meta');
  meta.setAttribute('name', 'cover');
  meta.setAttribute('content', imageId);
  if (!coverMeta) metadata.appendChild(meta);

  let updatedPage: string | undefined;
  for (const item of book.manifest.filter((entry) => /xhtml|html|svg/.test(entry.mediaType))) {
    const bytes = book.files.get(item.path);
    if (!bytes || !oldImage) continue;
    const document = parseXml(decodeText(bytes), item.path);
    let changed = false;
    for (const element of elementsByLocalName(document, 'img').concat(elementsByLocalName(document, 'image'))) {
      for (const attribute of ['src', 'href', 'xlink:href']) {
        const reference = element.getAttribute(attribute);
        if (!reference || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) continue;
        if (resolvePath(item.path, splitReference(reference).file) !== oldImage.path) continue;
        element.setAttribute(attribute, relativePath(item.path, imagePath));
        if (element.localName === 'img') element.setAttribute('style', 'display:block;max-width:100%;height:auto;margin:0 auto;');
        if (element.localName === 'image') {
          const svg = element.parentNode as Element;
          if (svg?.localName === 'svg' && elementsByLocalName(svg, 'image').length === 1) {
            svg.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);
            element.setAttribute('width', String(dimensions.width));
            element.setAttribute('height', String(dimensions.height));
            element.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          }
        }
        changed = true;
      }
    }
    if (changed) {
      book.files.set(item.path, encodeText(serializeXml(document)));
      if (/xhtml|html/.test(item.mediaType)) updatedPage ??= item.path;
    }
  }
  if (!updatedPage) {
    const pagePath = uniquePath('epub-tweaker-cover', 'xhtml');
    const page = parseXml('<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Cover</title></head><body style="margin:0;padding:0;text-align:center"><img alt="Cover" style="display:block;max-width:100%;height:auto;margin:0 auto;"/></body></html>', pagePath);
    firstByLocalName(page, 'img')!.setAttribute('src', relativePath(pagePath, imagePath));
    book.files.set(pagePath, encodeText(serializeXml(page)));
    const pageId = addResource(pagePath, 'application/xhtml+xml');
    const itemref = opf.createElementNS(opf.documentElement.namespaceURI, 'itemref');
    itemref.setAttribute('idref', pageId);
    spine.insertBefore(itemref, spine.firstChild);
    book.spine.unshift({ idref: pageId, linear: true, properties: [] });
    updatedPage = pagePath;
  }
  let guide = firstByLocalName(opf, 'guide');
  if (!guide) { guide = opf.createElementNS(opf.documentElement.namespaceURI, 'guide'); opf.documentElement.appendChild(guide); }
  let reference = elementsByLocalName(guide, 'reference').find((element) => element.getAttribute('type') === 'cover');
  if (!reference) { reference = opf.createElementNS(opf.documentElement.namespaceURI, 'reference'); guide.appendChild(reference); }
  reference.setAttribute('type', 'cover');
  reference.setAttribute('title', 'Cover');
  reference.setAttribute('href', relativePath(book.packagePath, updatedPage));
  entries.push({ rule: 'cover-replacement', kind: 'tweak', path: imagePath, message: 'Added or replaced the publication cover with a local image.' });
}
