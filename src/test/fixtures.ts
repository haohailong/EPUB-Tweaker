import { strToU8 } from 'fflate';
import { createEpubArchive, type ArchiveFiles } from '../epub/archive';

export interface FixtureOptions {
  version?: 2 | 3;
  language?: string;
  brokenBodyAnchor?: boolean;
  pageMap?: boolean;
  cssIssue?: boolean;
  svgIssue?: boolean;
  ruby?: 'problematic' | 'simple';
  encrypted?: boolean;
  staleEncryption?: boolean;
  missingManifest?: boolean;
  missingSpine?: boolean;
  vertical?: boolean;
  progression?: 'rtl' | 'ltr';
  includeImage?: boolean;
  languageAttributes?: boolean;
  svgCoverPage?: boolean;
  spineProperties?: string;
}

const enc = (value: string) => strToU8(value);

export function syntheticEpub(options: FixtureOptions = {}): ArrayBuffer {
  const version = options.version ?? 3;
  const language = options.language ?? 'en';
  const files: ArchiveFiles = new Map();
  files.set('mimetype', enc('application/epub+zip'));
  files.set('META-INF/container.xml', enc('<?xml version="1.0" encoding="UTF-8"?>\n<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'));
  const ruby = options.ruby === 'problematic'
    ? '<ruby><rb>漢</rb><rt>hàn</rt><rb>字</rb><rt>zì</rt></ruby>'
    : options.ruby === 'simple' ? '<ruby>漢<rt>かん</rt></ruby>' : 'Hello';
  const style = options.vertical ? '<style>html,body{writing-mode:vertical-rl}</style>' : '';
  const image = options.includeImage ? '<img src="cover.png" alt="cover"/>' : '';
  files.set('OEBPS/chapter.xhtml', enc(`<?xml version="1.0" encoding="UTF-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>One</title>${style}<link rel="stylesheet" type="text/css" href="style.css"/></head><body id="reading">${ruby}${image}</body></html>`));
  files.set('OEBPS/style.css', enc(options.cssIssue ? 'p::before{content:"";box-shadow:0 0 2px #000;color:red}' : 'body{line-height:1.4}\n'));
  if (options.svgCoverPage) {
    files.set('OEBPS/cover.xhtml', enc('<?xml version="1.0" encoding="UTF-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink"><head><title>Cover</title><meta name="viewport" content="width=600, height=824"/><link rel="stylesheet" href="fixed-cover.css" type="text/css"/></head><body><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 824"><image width="600" height="824" xlink:href="cover.png"/></svg></body></html>'));
    files.set('OEBPS/fixed-cover.css', enc('html,body{margin:0;padding:0;font-size:0}svg{width:100%;height:100%}'));
  }
  if (options.svgIssue) files.set('OEBPS/diagram.svg', enc('<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"><g><title><tspan>bad</tspan></title><rect width="10" height="10"/></g></svg>'));
  if (options.includeImage || options.encrypted || options.svgCoverPage) {
    const png = new Uint8Array(32);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    new DataView(png.buffer).setUint32(16, 600);
    new DataView(png.buffer).setUint32(20, 824);
    files.set('OEBPS/cover.png', png);
  }
  const navTarget = options.brokenBodyAnchor ? 'chapter.xhtml#reading' : 'chapter.xhtml';
  if (version === 3) {
    files.set('OEBPS/nav.xhtml', enc(`<?xml version="1.0" encoding="UTF-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>TOC</title></head><body><nav epub:type="toc"><ol><li><a href="${navTarget}">One</a></li></ol></nav></body></html>`));
  } else {
    files.set('OEBPS/toc.ncx', enc(`<?xml version="1.0" encoding="UTF-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><head/><docTitle><text>Fixture</text></docTitle><navMap><navPoint id="n1" playOrder="1"><navLabel><text>One</text></navLabel><content src="${navTarget}"/></navPoint></navMap></ncx>`));
  }
  if (options.pageMap) files.set('OEBPS/page-map.xml', enc('<?xml version="1.0" encoding="UTF-8"?>\n<page-map xmlns="http://www.idpf.org/2007/opf"><page name="1" href="chapter.xhtml"/></page-map>'));
  const navManifest = version === 3
    ? '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
    : '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>';
  const extraManifest = [
    options.pageMap ? '<item id="pagemap" href="page-map.xml" media-type="application/oebps-page-map+xml"/>' : '',
    options.svgIssue ? '<item id="svg" href="diagram.svg" media-type="image/svg+xml"/>' : '',
    options.includeImage || options.encrypted || options.svgCoverPage ? `<item id="cover" href="cover.png" media-type="image/png"${options.svgCoverPage ? ' properties="cover-image"' : ''}/>` : '',
    options.svgCoverPage ? '<item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml" properties="svg"/><item id="fixed-cover-css" href="fixed-cover.css" media-type="text/css"/>' : '',
    options.missingManifest ? '<item id="missing" href="not-there.xhtml" media-type="application/xhtml+xml"/>' : ''
  ].join('');
  const progression = options.progression ? ` page-progression-direction="${options.progression}"` : '';
  const pageMap = options.pageMap ? ' page-map="pagemap"' : '';
  const spineId = options.missingSpine ? 'ghost' : 'chapter';
  const languageAttributes = options.languageAttributes ? ' id="language1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="dcterms:RFC3066"' : '';
  const coverSpine = options.svgCoverPage ? '<itemref idref="cover-page" properties="rendition:layout-pre-paginated rendition:spread-none rendition:page-spread-center"/>' : '';
  const spineProperties = options.spineProperties ? ` properties="${options.spineProperties}"` : '';
  files.set('OEBPS/content.opf', enc(`<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" version="${version}.0" unique-identifier="uid"><metadata><dc:identifier id="uid">urn:uuid:fixture</dc:identifier><dc:title>Fixture Book</dc:title><dc:creator>Test Author</dc:creator><dc:language${languageAttributes}>${language}</dc:language>${options.svgCoverPage ? '<meta property="rendition:layout">reflowable</meta>' : ''}</metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="css" href="style.css" media-type="text/css"/>${navManifest}${extraManifest}</manifest><spine${version === 2 ? ' toc="ncx"' : ''}${progression}${pageMap}>${coverSpine}<itemref idref="${spineId}"${spineProperties}/></spine></package>`));
  if (options.encrypted || options.staleEncryption) {
    const algorithm = options.encrypted ? 'http://www.w3.org/2001/04/xmlenc#aes256-cbc' : 'http://ns.adobe.com/pdf/enc#RC';
    const target = options.encrypted ? 'OEBPS/cover.png' : 'OEBPS/chapter.xhtml';
    files.set('META-INF/encryption.xml', enc(`<?xml version="1.0" encoding="UTF-8"?>\n<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#"><enc:EncryptedData><enc:EncryptionMethod Algorithm="${algorithm}"/><enc:CipherData><enc:CipherReference URI="${target}"/></enc:CipherData></enc:EncryptedData></encryption>`));
  }
  return Uint8Array.from(createEpubArchive(files)).buffer;
}
