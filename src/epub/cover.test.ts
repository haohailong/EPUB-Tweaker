import { describe, expect, it } from 'vitest';
import { syntheticEpub } from '../test/fixtures';
import { createEpubArchive, decodeText, openArchiveSync } from './archive';
import { processEpub } from './process';
import { parseBook } from './parser';

const options = { vertical: false, horizontal: false, japaneseMode: false, progression: 'auto' as const, imageMappings: {}, coverReplacement: 'new.png' };
// Valid one-pixel PNG, with no copyrighted fixture content.
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ZkAAAAASUVORK5CYII='), (character) => character.charCodeAt(0));
const replacement = { name: 'new.png', type: 'image/png', data: png.buffer };

describe('cover upload', () => {
  it.each([2, 3] as const)('adds a cover and first spine page to EPUB %s with no cover', async (version) => {
    const result = await processEpub('book.epub', syntheticEpub({ version }), options, [replacement]);
    const files = openArchiveSync(result.output);
    const book = parseBook(files);
    const meta = decodeText(files.get('OEBPS/content.opf')!);
    expect(meta).toContain('name="cover"');
    expect(meta).toContain('type="cover"');
    expect(book.spine[0].idref).toMatch(/^epub-tweaker-cover/);
    expect(book.spine).toHaveLength(2);
    expect(result.report.entries.some((entry) => entry.rule === 'cover-replacement')).toBe(true);
    if (version === 3) expect(book.manifest.filter((item) => item.properties.includes('cover-image'))).toHaveLength(1);
    else expect(meta).not.toContain('properties="cover-image"');
  });

  it('updates an existing cover page without adding another reading-order page', async () => {
    const input = syntheticEpub({ svgCoverPage: true });
    const result = await processEpub('book.epub', input, options, [replacement]);
    const files = openArchiveSync(result.output);
    const book = parseBook(files);
    const image = book.manifest.find((item) => item.properties.includes('cover-image'))!;
    expect(image.path).toMatch(/epub-tweaker-cover.*\.png$/);
    expect(decodeText(files.get('OEBPS/cover.xhtml')!)).toContain('epub-tweaker-cover.png');
    expect(book.spine).toHaveLength(2);
    expect(files.get(image.path)).toEqual(png);
  });

  it('recognizes an unmarked cover referenced by an EPUB guide', async () => {
    const files = openArchiveSync(syntheticEpub({ svgCoverPage: true }));
    const opf = decodeText(files.get('OEBPS/content.opf')!).replace(' properties="cover-image"', '').replace('</package>', '<guide><reference type="cover" href="cover.xhtml"/></guide></package>');
    files.set('OEBPS/content.opf', new TextEncoder().encode(opf));
    const result = await processEpub('book.epub', Uint8Array.from(createEpubArchive(files)).buffer, options, [replacement]);
    expect(parseBook(openArchiveSync(result.output)).spine).toHaveLength(2);
  });

  it('rejects a non-image payload even when named PNG', async () => {
    await expect(processEpub('book.epub', syntheticEpub(), options, [{ ...replacement, data: new TextEncoder().encode('not an image').buffer }])).rejects.toMatchObject({ code: 'INVALID_COVER_IMAGE' });
  });
});
