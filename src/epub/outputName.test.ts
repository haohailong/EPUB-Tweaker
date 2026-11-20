import { describe, expect, it } from 'vitest';
import { outputFilename } from './outputName';

const info = { layout: 'reflowable' as const, writingMode: 'horizontal' as const, progression: 'ltr' as const, language: 'ja' };
const options = { vertical: false, horizontal: true, japaneseMode: true, progression: 'auto' as const, imageMappings: {} };
describe('descriptive output names', () => {
  it('uses actual output attributes and interface language', () => {
    expect(outputFilename('Book.epub', info, { ...options, outputLanguage: 'en' })).toBe('Book-Horizontal-LTR-JA.epub');
    expect(outputFilename('書名.epub', info, { ...options, outputLanguage: 'zh-Hant' })).toBe('書名-橫排-LTR-JA.epub');
    expect(outputFilename('书名.epub', { ...info, writingMode: 'vertical-rl', progression: 'rtl' }, options)).toBe('书名-直排-RTL-JA.epub');
  });
  it.each(['Book-tweaked.epub', 'Book-fixed-tweaked.epub', 'Book-直排-RTL-ZH-TW.epub', 'Book-Horizontal-LTR-JA.epub'])('replaces known suffixes: %s', (name) => {
    expect(outputFilename(name, info, { ...options, outputLanguage: 'en' })).toBe('Book-Horizontal-LTR-JA.epub');
  });
  it('preserves and sanitizes custom names', () => {
    expect(outputFilename('Book.epub', info, { ...options, outputName: 'My/Book' })).toBe('My-Book.epub');
  });
});
