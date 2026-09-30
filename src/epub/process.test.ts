import { describe, expect, it } from 'vitest';
import { createEpubArchive, decodeText, openArchiveSync, readFirstLocalHeader } from './archive';
import { inspectEpub, processEpub } from './process';
import { syntheticEpub } from '../test/fixtures';

const defaults = { vertical: false, horizontal: false, japaneseMode: false, progression: 'auto' as const, imageMappings: {} };

describe('complete EPUB processing', () => {
  it.each([2, 3] as const)('detects and preserves EPUB %s', async (version) => {
    const input = syntheticEpub({ version });
    expect((await inspectEpub(input)).majorVersion).toBe(version);
    const result = await processEpub('book.epub', input, defaults);
    expect(result.info.majorVersion).toBe(version);
    expect(readFirstLocalHeader(new Uint8Array(result.output)).firstMethod).toBe(0);
  });

  it('repairs body-anchor navigation, page-map, CSS and SVG cases', async () => {
    const input = syntheticEpub({ brokenBodyAnchor: true, pageMap: true, cssIssue: true, svgIssue: true });
    const result = await processEpub('issues.epub', input, defaults);
    const rules = result.report.entries.map((entry) => entry.rule);
    expect(rules).toEqual(expect.arrayContaining(['body-anchor-navigation', 'obsolete-page-map', 'pseudo-box-shadow', 'svg-title']));
    const files = openArchiveSync(result.output);
    expect(files.has('OEBPS/page-map.xml')).toBe(false);
    expect(decodeText(files.get('OEBPS/nav.xhtml')!)).not.toContain('#reading');
    expect(decodeText(files.get('OEBPS/style.css')!)).not.toContain('box-shadow');
  });

  it('normalizes Send to Kindle language metadata and image-only fixed-canvas cover pages', async () => {
    const input = syntheticEpub({ language: 'zh-TW', languageAttributes: true, svgCoverPage: true });
    const result = await processEpub('kindle-e016.epub', input, defaults);
    const rules = result.report.entries.map((entry) => entry.rule);
    expect(rules).toEqual(expect.arrayContaining(['kindle-language-metadata', 'reflowable-svg-page']));
    const files = openArchiveSync(result.output);
    const packageText = decodeText(files.get('OEBPS/content.opf')!);
    const coverText = decodeText(files.get('OEBPS/cover.xhtml')!);
    expect(packageText).toContain('<dc:language>zh-TW</dc:language>');
    expect(packageText).not.toContain('rendition:layout-pre-paginated');
    expect(packageText).not.toContain('properties="svg"');
    expect(files.has('OEBPS/fixed-cover.css')).toBe(false);
    expect(coverText).toContain('<img');
    expect(coverText).not.toContain('<svg');
    expect(coverText).not.toContain('name="viewport"');
  });

  it('repairs the EPUB 2 NCX body-anchor case', async () => {
    const result = await processEpub('ncx.epub', syntheticEpub({ version: 2, brokenBodyAnchor: true }), defaults);
    expect(result.report.entries.some((entry) => entry.rule === 'body-anchor-navigation')).toBe(true);
    expect(decodeText(openArchiveSync(result.output).get('OEBPS/toc.ncx')!)).not.toContain('#reading');
  });

  it('decodes declared legacy text encoding and serializes Unicode as UTF-8', async () => {
    const files = openArchiveSync(syntheticEpub());
    const latin1 = '<?xml version="1.0" encoding="iso-8859-1"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Café</title></head><body>Café</body></html>';
    files.set('OEBPS/chapter.xhtml', Uint8Array.from([...latin1].map((character) => character.charCodeAt(0))));
    const result = await processEpub('encoding.epub', Uint8Array.from(createEpubArchive(files)).buffer, defaults);
    const chapter = decodeText(openArchiveSync(result.output).get('OEBPS/chapter.xhtml')!);
    expect(chapter).toContain('Café');
    expect(chapter).toContain('encoding="UTF-8"');
  });

  it('converts problematic Chinese ruby but preserves Japanese ruby', async () => {
    const chinese = await processEpub('zh.epub', syntheticEpub({ language: 'zh-Hant', ruby: 'problematic' }), defaults);
    expect(chinese.report.entries.some((entry) => entry.rule === 'chinese-ruby' && entry.kind === 'visible')).toBe(true);
    expect(decodeText(openArchiveSync(chinese.output).get('OEBPS/chapter.xhtml')!)).toContain('漢字（hànzì）');
    const japanese = await processEpub('ja.epub', syntheticEpub({ language: 'ja', ruby: 'problematic' }), defaults);
    expect(decodeText(openArchiveSync(japanese.output).get('OEBPS/chapter.xhtml')!)).toContain('<ruby>');
  });

  it('applies vertical layout and explicit RTL progression without changing EPUB version', async () => {
    for (const version of [2, 3] as const) {
      const result = await processEpub(`v${version}.epub`, syntheticEpub({ version }), { ...defaults, vertical: true });
      expect(result.info.majorVersion).toBe(version);
      expect(result.info.writingMode).toBe('vertical-rl');
      expect(result.report.progressionAfter).toBe('rtl');
      const packageText = decodeText(openArchiveSync(result.output).get('OEBPS/content.opf')!);
      expect(packageText).toContain('primary-writing-mode');
      if (version === 3) expect(packageText).toContain('page-progression-direction="rtl"');
      else expect(packageText).not.toContain('page-progression-direction="rtl"');
    }
  });

  it('repairs progression on an already vertical book without restyling it', async () => {
    const result = await processEpub('vertical.epub', syntheticEpub({ vertical: true, language: 'zh-Hant' }), defaults);
    expect(result.report.progressionAfter).toBe('rtl');
    expect(result.report.entries.some((entry) => entry.rule === 'vertical-layout')).toBe(false);
    expect(result.report.entries.some((entry) => entry.rule === 'page-progression')).toBe(true);
  });

  it('converts vertical text to horizontal and defaults progression to LTR', async () => {
    for (const version of [2, 3] as const) {
      const result = await processEpub('vertical.epub', syntheticEpub({ version, vertical: true, progression: 'rtl', language: 'zh-Hant' }), { ...defaults, horizontal: true });
      expect(result.info.majorVersion).toBe(version);
      expect(result.info.writingMode).toBe('horizontal');
      expect(result.report.progressionAfter).toBe('ltr');
      expect(result.report.entries.some((entry) => entry.rule === 'horizontal-layout')).toBe(true);
      const files = openArchiveSync(result.output);
      const packageText = decodeText(files.get('OEBPS/content.opf')!);
      expect(packageText).toContain('primary-writing-mode');
      if (version === 3) expect(packageText).toContain('page-progression-direction="ltr"');
      else {
        expect(packageText).toContain('content="horizontal-lr"');
        expect(packageText).not.toContain('page-progression-direction');
      }
      expect(decodeText(files.get('OEBPS/chapter.xhtml')!)).toContain('writing-mode: horizontal-tb !important');
      const second = await processEpub(result.outputName, result.output, { ...defaults, horizontal: true });
      expect(second.report.entries).toHaveLength(0);
    }
  });

  it('Japanese mode changes language independently of layout', async () => {
    const result = await processEpub('book.epub', syntheticEpub({ language: 'zh-Hant' }), { ...defaults, japaneseMode: true });
    expect(result.info.language).toBe('ja');
    expect(result.info.writingMode).toBe('horizontal');
    expect(result.report.entries.some((entry) => entry.rule === 'japanese-mode')).toBe(true);
  });

  it('detects actual DRM and removes only demonstrably stale encryption residue', async () => {
    await expect(inspectEpub(syntheticEpub({ encrypted: true }))).rejects.toMatchObject({ code: 'DRM_PROTECTED' });
    const stale = await processEpub('stale.epub', syntheticEpub({ staleEncryption: true }), defaults);
    expect(stale.report.entries.some((entry) => entry.rule === 'stale-encryption-metadata')).toBe(true);
    expect(openArchiveSync(stale.output).has('META-INF/encryption.xml')).toBe(false);
  });

  it('fails output validation for missing manifest and spine references', async () => {
    await expect(processEpub('missing.epub', syntheticEpub({ missingManifest: true }), defaults)).rejects.toMatchObject({ code: 'MANIFEST_RESOURCE_MISSING' });
    await expect(processEpub('spine.epub', syntheticEpub({ missingSpine: true }), defaults)).rejects.toMatchObject({ code: 'SPINE_RESOURCE_MISSING' });
  });

  it('is idempotent after the first repair pass', async () => {
    const first = await processEpub('book.epub', syntheticEpub({ brokenBodyAnchor: true, cssIssue: true }), defaults);
    const second = await processEpub(first.outputName, first.output, defaults);
    expect(second.report.entries).toHaveLength(0);
    expect(new Uint8Array(second.output)).toEqual(new Uint8Array(first.output));
    expect(second.outputName).toBe('book-tweaked.epub');
  });
});
