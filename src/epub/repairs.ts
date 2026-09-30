import * as csstree from 'css-tree';
import { decodeText, encodeText } from './archive';
import type { BookModel } from './model';
import { dirname, relativePath, resolvePath, splitReference } from './path';
import { childByLocalName, elementsByLocalName, firstByLocalName, parseXml, serializeXml } from './xml';
import type { ProcessOptions, ReplacementPayload, ReportEntry, TechnicalReport, WritingMode } from '../types';

const XHTML_TYPES = new Set(['application/xhtml+xml', 'text/html']);
const XML_TYPES = new Set(['application/xhtml+xml', 'application/xml', 'text/xml', 'image/svg+xml', 'application/x-dtbncx+xml']);
const VERTICAL_CSS = `html, body { writing-mode: vertical-rl; -epub-writing-mode: vertical-rl; -webkit-writing-mode: vertical-rl; }\nimg, svg { max-inline-size: 100%; block-size: auto; }\n`;
const HORIZONTAL_CSS = `html, body { writing-mode: horizontal-tb !important; -epub-writing-mode: horizontal-tb !important; -webkit-writing-mode: horizontal-tb !important; }\nimg, svg { max-inline-size: 100%; block-size: auto; }\n`;

function report(entries: ReportEntry[], entry: ReportEntry): void {
  entries.push(entry);
}

function ensureMeta(book: BookModel, name: string, content: string): boolean {
  const metadata = firstByLocalName(book.packageDocument, 'metadata');
  if (!metadata) return false;
  const existing = elementsByLocalName(metadata, 'meta').find((meta) => meta.getAttribute('name') === name);
  if (existing) {
    if (existing.getAttribute('content') === content) return false;
    existing.setAttribute('content', content);
    return true;
  }
  const meta = book.packageDocument.createElementNS(book.packageDocument.documentElement.namespaceURI, 'meta');
  meta.setAttribute('name', name);
  meta.setAttribute('content', content);
  metadata.appendChild(meta);
  return true;
}

function setProgression(book: BookModel, direction: 'rtl' | 'ltr', entries: ReportEntry[], kind: 'repair' | 'tweak'): void {
  const spine = firstByLocalName(book.packageDocument, 'spine');
  if (book.majorVersion === 3 && spine && spine.getAttribute('page-progression-direction') !== direction) {
    const before = spine.getAttribute('page-progression-direction') || 'default';
    spine.setAttribute('page-progression-direction', direction);
    book.progression = direction;
    report(entries, {
      rule: 'page-progression', kind, path: book.packagePath,
      message: `Page progression set to ${direction.toUpperCase()}.`, before, after: direction
    });
  }
}

function setPrimaryWritingMode(book: BookModel, mode: string, entries: ReportEntry[], kind: 'repair' | 'tweak'): void {
  if (ensureMeta(book, 'primary-writing-mode', mode)) {
    report(entries, {
      rule: 'kindle-writing-mode', kind, path: book.packagePath,
      message: `Kindle primary writing mode set to ${mode}.`, after: mode
    });
  }
}

function repairNavigation(book: BookModel, entries: ReportEntry[]): void {
  let count = 0;
  for (const navPath of book.navigationPaths) {
    const bytes = book.files.get(navPath);
    if (!bytes) continue;
    const document = parseXml(decodeText(bytes), navPath);
    const elements = [...elementsByLocalName(document, 'a'), ...elementsByLocalName(document, 'content')];
    let changed = false;
    for (const element of elements) {
      const attribute = element.hasAttribute('href') ? 'href' : element.hasAttribute('src') ? 'src' : '';
      if (!attribute) continue;
      const reference = element.getAttribute(attribute)!;
      const { file, fragment } = splitReference(reference);
      if (!fragment) continue;
      let targetPath: string;
      try { targetPath = file ? resolvePath(navPath, file) : navPath; } catch { continue; }
      const target = book.files.get(targetPath);
      if (!target) continue;
      try {
        const targetDocument = parseXml(decodeText(target), targetPath);
        const body = firstByLocalName(targetDocument, 'body');
        if (body?.getAttribute('id') === fragment) {
          element.setAttribute(attribute, file || relativePath(navPath, targetPath));
          count += 1;
          changed = true;
        }
      } catch {
        // Validation reports malformed targets later.
      }
    }
    if (changed) book.files.set(navPath, encodeText(serializeXml(document)));
  }
  if (count) report(entries, { rule: 'body-anchor-navigation', kind: 'repair', path: book.navigationPaths.join(', '), message: `Repaired ${count} navigation target${count === 1 ? '' : 's'} that pointed to a body ID.`, count });
}

function removePageMap(book: BookModel, entries: ReportEntry[]): void {
  const removable = book.manifest.filter((item) => item.mediaType === 'application/oebps-page-map+xml');
  const spine = firstByLocalName(book.packageDocument, 'spine');
  const hadAttribute = Boolean(spine?.hasAttribute('page-map'));
  if (hadAttribute) spine!.removeAttribute('page-map');
  for (const item of removable) {
    const element = elementsByLocalName(book.packageDocument, 'item').find((candidate) => candidate.getAttribute('id') === item.id);
    element?.parentNode?.removeChild(element);
    book.files.delete(item.path);
  }
  if (hadAttribute || removable.length) {
    book.manifest = book.manifest.filter((item) => !removable.includes(item));
    report(entries, { rule: 'obsolete-page-map', kind: 'repair', path: book.packagePath, message: 'Removed obsolete page-map references.', count: removable.length });
  }
}

function cleanStaleEncryption(book: BookModel, entries: ReportEntry[]): void {
  if (book.encryption.length && book.encryption.every((item) => item.appearsStale && !item.isFontObfuscation)) {
    book.files.delete('META-INF/encryption.xml');
    report(entries, { rule: 'stale-encryption-metadata', kind: 'repair', path: 'META-INF/encryption.xml', message: 'Removed stale Adobe encryption metadata from demonstrably readable resources.' });
    book.encryption = [];
  }
}

function repairCss(book: BookModel, entries: ReportEntry[]): void {
  for (const item of book.manifest.filter((entry) => entry.mediaType === 'text/css')) {
    const data = book.files.get(item.path);
    if (!data) continue;
    const source = decodeText(data);
    let ast: csstree.CssNode;
    try { ast = csstree.parse(source); } catch { continue; }
    let removed = 0;
    csstree.walk(ast, {
      visit: 'Rule',
      enter(node) {
        if (node.type !== 'Rule') return;
        const selector = csstree.generate(node.prelude);
        if (!/::?(?:before|after)\b/i.test(selector) || node.block.type !== 'Block') return;
        node.block.children.forEach((child, item, list) => {
          if (child.type === 'Declaration' && /^-?(?:webkit-)?box-shadow$/i.test(child.property)) {
            list.remove(item);
            removed += 1;
          }
        });
      }
    });
    if (removed) {
      book.files.set(item.path, encodeText(`${csstree.generate(ast)}\n`));
      report(entries, { rule: 'pseudo-box-shadow', kind: 'repair', path: item.path, message: `Removed ${removed} incompatible pseudo-element box-shadow declaration${removed === 1 ? '' : 's'}.`, count: removed });
    }
  }
}

function repairSvg(book: BookModel, entries: ReportEntry[]): void {
  for (const item of book.manifest.filter((entry) => entry.mediaType === 'image/svg+xml')) {
    const data = book.files.get(item.path);
    if (!data) continue;
    const document = parseXml(decodeText(data), item.path);
    const svg = document.documentElement;
    const titles = elementsByLocalName(document, 'title').filter((title) => title.parentNode !== svg || title.childNodes.length !== 1 || !title.firstChild || title.firstChild.nodeType !== 3);
    if (!titles.length) continue;
    titles.forEach((title) => title.parentNode?.removeChild(title));
    book.files.set(item.path, encodeText(serializeXml(document)));
    report(entries, { rule: 'svg-title', kind: 'repair', path: item.path, message: `Removed ${titles.length} structurally incompatible SVG title element${titles.length === 1 ? '' : 's'}.`, count: titles.length });
  }
}

function convertProblematicChineseRuby(book: BookModel, entries: ReportEntry[]): void {
  if (!/^zh(?:-|$)/i.test(book.language)) return;
  for (const item of book.manifest.filter((entry) => XHTML_TYPES.has(entry.mediaType))) {
    const data = book.files.get(item.path);
    if (!data) continue;
    const document = parseXml(decodeText(data), item.path);
    let changed = 0;
    for (const ruby of elementsByLocalName(document, 'ruby')) {
      const annotations = elementsByLocalName(ruby, 'rt');
      const problematic = annotations.length > 1 || elementsByLocalName(ruby, 'rb').length > 0 || elementsByLocalName(ruby, 'rbc').length > 0 || elementsByLocalName(ruby, 'rtc').length > 0;
      if (!problematic) continue;
      const annotation = annotations.map((element) => element.textContent ?? '').join('');
      const base = Array.from(ruby.childNodes)
        .filter((node) => !(node.nodeType === 1 && ['rt', 'rp', 'rtc'].includes((node as Element).localName || node.nodeName)))
        .map((node) => node.textContent ?? '').join('');
      ruby.parentNode?.replaceChild(document.createTextNode(`${base}（${annotation}）`), ruby);
      changed += 1;
    }
    if (changed) {
      book.files.set(item.path, encodeText(serializeXml(document)));
      report(entries, { rule: 'chinese-ruby', kind: 'visible', path: item.path, message: `Converted ${changed} incompatible Chinese ruby annotation${changed === 1 ? '' : 's'} to readable parenthetical text.`, count: changed });
    }
  }
}

function addVerticalStyles(book: BookModel, entries: ReportEntry[]): void {
  const packageDirectory = dirname(book.packagePath);
  let cssPath = packageDirectory ? `${packageDirectory}/epub-tweaker.css` : 'epub-tweaker.css';
  let suffix = 2;
  while (book.files.has(cssPath) && decodeText(book.files.get(cssPath)!) !== VERTICAL_CSS) {
    cssPath = packageDirectory ? `${packageDirectory}/epub-tweaker-${suffix}.css` : `epub-tweaker-${suffix}.css`;
    suffix += 1;
  }
  book.files.set(cssPath, encodeText(VERTICAL_CSS));
  let manifestItem = book.manifest.find((item) => item.path === cssPath);
  if (!manifestItem) {
    const manifest = firstByLocalName(book.packageDocument, 'manifest')!;
    const usedIds = new Set(book.manifest.map((item) => item.id));
    let id = 'epub-tweaker-vertical';
    let idSuffix = 2;
    while (usedIds.has(id)) id = `epub-tweaker-vertical-${idSuffix++}`;
    const element = book.packageDocument.createElementNS(book.packageDocument.documentElement.namespaceURI, 'item');
    element.setAttribute('id', id);
    element.setAttribute('href', relativePath(book.packagePath, cssPath));
    element.setAttribute('media-type', 'text/css');
    manifest.appendChild(element);
    manifestItem = { id, href: element.getAttribute('href')!, path: cssPath, mediaType: 'text/css', properties: [] };
    book.manifest.push(manifestItem);
  }
  let linked = 0;
  for (const item of book.manifest.filter((entry) => XHTML_TYPES.has(entry.mediaType))) {
    const data = book.files.get(item.path);
    if (!data) continue;
    const document = parseXml(decodeText(data), item.path);
    const href = relativePath(item.path, cssPath);
    const exists = elementsByLocalName(document, 'link').some((link) => link.getAttribute('href') === href);
    if (exists) continue;
    const head = firstByLocalName(document, 'head');
    if (!head) continue;
    const link = document.createElementNS(document.documentElement.namespaceURI, 'link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('type', 'text/css');
    link.setAttribute('href', href);
    head.appendChild(link);
    book.files.set(item.path, encodeText(serializeXml(document)));
    linked += 1;
  }
  book.writingMode = 'vertical-rl';
  report(entries, { rule: 'vertical-layout', kind: 'tweak', path: cssPath, message: `Applied vertical right-to-left layout to ${linked} content document${linked === 1 ? '' : 's'}.`, count: linked });
}

function addHorizontalStyles(book: BookModel, entries: ReportEntry[]): void {
  const packageDirectory = dirname(book.packagePath);
  let cssPath = packageDirectory ? `${packageDirectory}/epub-tweaker-horizontal.css` : 'epub-tweaker-horizontal.css';
  let suffix = 2;
  while (book.files.has(cssPath) && decodeText(book.files.get(cssPath)!) !== HORIZONTAL_CSS) {
    cssPath = packageDirectory ? `${packageDirectory}/epub-tweaker-horizontal-${suffix}.css` : `epub-tweaker-horizontal-${suffix}.css`;
    suffix += 1;
  }
  book.files.set(cssPath, encodeText(HORIZONTAL_CSS));
  let manifestItem = book.manifest.find((item) => item.path === cssPath);
  if (!manifestItem) {
    const manifest = firstByLocalName(book.packageDocument, 'manifest')!;
    const usedIds = new Set(book.manifest.map((item) => item.id));
    let id = 'epub-tweaker-horizontal';
    let idSuffix = 2;
    while (usedIds.has(id)) id = `epub-tweaker-horizontal-${idSuffix++}`;
    const element = book.packageDocument.createElementNS(book.packageDocument.documentElement.namespaceURI, 'item');
    element.setAttribute('id', id);
    element.setAttribute('href', relativePath(book.packagePath, cssPath));
    element.setAttribute('media-type', 'text/css');
    manifest.appendChild(element);
    manifestItem = { id, href: element.getAttribute('href')!, path: cssPath, mediaType: 'text/css', properties: [] };
    book.manifest.push(manifestItem);
  }
  let linked = 0;
  for (const item of book.manifest.filter((entry) => XHTML_TYPES.has(entry.mediaType))) {
    const data = book.files.get(item.path);
    if (!data) continue;
    const document = parseXml(decodeText(data), item.path);
    const href = relativePath(item.path, cssPath);
    const exists = elementsByLocalName(document, 'link').some((link) => link.getAttribute('href') === href);
    if (exists) continue;
    const head = firstByLocalName(document, 'head');
    if (!head) continue;
    const link = document.createElementNS(document.documentElement.namespaceURI, 'link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('type', 'text/css');
    link.setAttribute('href', href);
    head.appendChild(link);
    for (const element of [document.documentElement, firstByLocalName(document, 'body')].filter(Boolean) as Element[]) {
      const existingStyle = element.getAttribute('style')?.trim() ?? '';
      const separator = existingStyle && !existingStyle.endsWith(';') ? '; ' : '';
      element.setAttribute('style', `${existingStyle}${separator}writing-mode: horizontal-tb !important; -epub-writing-mode: horizontal-tb !important; -webkit-writing-mode: horizontal-tb !important;`);
    }
    book.files.set(item.path, encodeText(serializeXml(document)));
    linked += 1;
  }
  book.writingMode = 'horizontal';
  report(entries, { rule: 'horizontal-layout', kind: 'tweak', path: cssPath, message: `Converted ${linked} vertical content document${linked === 1 ? '' : 's'} to horizontal layout.`, count: linked });
}

function applyJapaneseMode(book: BookModel, entries: ReportEntry[]): void {
  if (book.language !== 'ja') {
    const language = firstByLocalName(firstByLocalName(book.packageDocument, 'metadata') ?? book.packageDocument, 'language');
    const before = book.language || 'unset';
    if (language) language.textContent = 'ja';
    else {
      const metadata = firstByLocalName(book.packageDocument, 'metadata')!;
      const element = book.packageDocument.createElementNS('http://purl.org/dc/elements/1.1/', 'dc:language');
      element.textContent = 'ja';
      metadata.appendChild(element);
    }
    book.language = 'ja';
    report(entries, { rule: 'japanese-mode', kind: 'tweak', path: book.packagePath, message: 'Set the primary publication language to Japanese.', before, after: 'ja' });
  }
}

function applyImageReplacements(book: BookModel, entries: ReportEntry[], replacements: ReplacementPayload[], mappings: Record<string, string>): void {
  for (const replacement of replacements) {
    const target = mappings[replacement.name];
    if (!target || !book.files.has(target)) continue;
    book.files.set(target, new Uint8Array(replacement.data));
    report(entries, { rule: 'image-replacement', kind: 'tweak', path: target, message: `Replaced image locally with ${replacement.name}.` });
  }
}

function normalizeTextResources(book: BookModel, entries: ReportEntry[]): void {
  let count = 0;
  const paths = new Set<string>([book.packagePath, 'META-INF/container.xml']);
  for (const item of book.manifest) if (XML_TYPES.has(item.mediaType)) paths.add(item.path);
  for (const path of paths) {
    const data = book.files.get(path);
    if (!data) continue;
    const document = path === book.packagePath ? book.packageDocument : parseXml(decodeText(data), path);
    const normalized = encodeText(serializeXml(document));
    const original = data;
    const differs = original.length !== normalized.length || original.some((value, index) => value !== normalized[index]);
    book.files.set(path, normalized);
    if (differs) count += 1;
  }
  if (count) report(entries, { rule: 'utf8-normalization', kind: 'repair', path: 'text resources', message: `Normalized ${count} XML/XHTML resource${count === 1 ? '' : 's'} to UTF-8.`, count });
}

export function applyRepairs(
  book: BookModel,
  options: ProcessOptions,
  replacements: ReplacementPayload[] = []
): TechnicalReport {
  const entries: ReportEntry[] = [];
  const before = { language: book.language, writingMode: book.writingMode, progression: book.progression };
  repairNavigation(book, entries);
  removePageMap(book, entries);
  cleanStaleEncryption(book, entries);
  repairCss(book, entries);
  repairSvg(book, entries);
  convertProblematicChineseRuby(book, entries);
  applyImageReplacements(book, entries, replacements, options.imageMappings);
  if (options.japaneseMode) applyJapaneseMode(book, entries);
  const canConvertHorizontal = options.horizontal && book.layout !== 'fixed';
  const canConvertVertical = options.vertical && !options.horizontal && book.layout !== 'fixed';
  if ((options.vertical || options.horizontal) && book.layout === 'fixed') {
    report(entries, { rule: 'vertical-fixed-layout', kind: 'warning', path: book.packagePath, message: 'Layout conversion was skipped because the publication uses fixed layout.', code: 'LAYOUT_FIXED_LAYOUT_SKIPPED' });
  }
  if (canConvertVertical && book.writingMode !== 'vertical-rl') addVerticalStyles(book, entries);
  if (canConvertHorizontal && book.writingMode !== 'horizontal') addHorizontalStyles(book, entries);
  const effectiveMode: WritingMode = canConvertHorizontal ? 'horizontal' : canConvertVertical ? 'vertical-rl' : book.writingMode;
  const desiredProgression = options.progression === 'auto'
    ? (canConvertHorizontal ? 'ltr' : effectiveMode === 'vertical-rl' ? 'rtl' : book.progression)
    : options.progression;
  if (desiredProgression === 'rtl' || desiredProgression === 'ltr') {
    const kind = options.progression === 'auto' && !canConvertVertical && !canConvertHorizontal ? 'repair' : 'tweak';
    setProgression(book, desiredProgression, entries, kind);
    if (book.majorVersion === 2) {
      const previous = book.progression;
      const spine = firstByLocalName(book.packageDocument, 'spine');
      const hadUnsupportedDirection = Boolean(spine?.hasAttribute('page-progression-direction'));
      spine?.removeAttribute('page-progression-direction');
      const kindleMode = effectiveMode === 'vertical-rl' ? 'vertical-rl' : desiredProgression === 'rtl' ? 'horizontal-rl' : 'horizontal-lr';
      const metadataChanged = ensureMeta(book, 'primary-writing-mode', kindleMode);
      book.progression = desiredProgression;
      if (previous !== desiredProgression || hadUnsupportedDirection || metadataChanged) {
        report(entries, { rule: 'page-progression', kind, path: book.packagePath, message: `Kindle page progression set to ${desiredProgression.toUpperCase()}.`, before: previous, after: desiredProgression });
      }
    }
  }
  if (effectiveMode === 'vertical-rl') setPrimaryWritingMode(book, 'vertical-rl', entries, canConvertVertical ? 'tweak' : 'repair');
  else if (canConvertHorizontal) setPrimaryWritingMode(book, 'horizontal-lr', entries, 'tweak');
  else if (options.japaneseMode) setPrimaryWritingMode(book, book.progression === 'rtl' ? 'horizontal-rl' : 'horizontal-lr', entries, 'tweak');
  normalizeTextResources(book, entries);
  return {
    version: book.version,
    packagePath: book.packagePath,
    languageBefore: before.language,
    languageAfter: book.language,
    writingModeBefore: before.writingMode,
    writingModeAfter: book.writingMode,
    progressionBefore: before.progression,
    progressionAfter: book.progression,
    contentDocuments: book.manifest.filter((item) => XHTML_TYPES.has(item.mediaType)).length,
    stylesheets: book.manifest.filter((item) => item.mediaType === 'text/css').length,
    images: book.manifest.filter((item) => item.mediaType.startsWith('image/')).length,
    entries,
    validationChecks: []
  };
}
