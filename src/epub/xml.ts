import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { EpubError } from './errors';

export function parseXml(source: string, path: string): Document {
  const issues: string[] = [];
  const document = new DOMParser({
    errorHandler: {
      warning: () => undefined,
      error: (message) => issues.push(String(message)),
      fatalError: (message) => issues.push(String(message))
    }
  }).parseFromString(source, 'application/xml');
  const root = document.documentElement;
  if (!root || root.nodeName === 'parsererror' || issues.length) {
    throw new EpubError('XML_PARSE_FAILED', `Malformed XML in ${path}${issues[0] ? `: ${issues[0]}` : ''}`, path);
  }
  return document;
}

export function serializeXml(document: Document, declaration = true): string {
  let output = new XMLSerializer().serializeToString(document);
  output = output.replace(/^<\?xml[^?]*\?>\s*/i, '');
  return declaration ? `<?xml version="1.0" encoding="UTF-8"?>\n${output}` : output;
}

export function elementsByLocalName(root: Document | Element, localName: string): Element[] {
  const all = root.getElementsByTagName('*');
  const result: Element[] = [];
  for (let index = 0; index < all.length; index += 1) {
    const item = all.item(index);
    if (item && (item.localName || item.nodeName.split(':').pop()) === localName) result.push(item);
  }
  return result;
}

export function firstByLocalName(root: Document | Element, localName: string): Element | undefined {
  return elementsByLocalName(root, localName)[0];
}

export function childByLocalName(root: Element, localName: string): Element | undefined {
  for (let index = 0; index < root.childNodes.length; index += 1) {
    const node = root.childNodes.item(index);
    if (node?.nodeType === 1 && ((node as Element).localName || node.nodeName.split(':').pop()) === localName) {
      return node as Element;
    }
  }
  return undefined;
}

export function textOf(root: Document | Element, localName: string): string {
  return firstByLocalName(root, localName)?.textContent?.trim() ?? '';
}

export function hasElementId(document: Document, id: string): boolean {
  const elements = document.getElementsByTagName('*');
  for (let index = 0; index < elements.length; index += 1) {
    if (elements.item(index)?.getAttribute('id') === id) return true;
  }
  return false;
}
