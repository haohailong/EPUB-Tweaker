import { describe, expect, it } from 'vitest';
import { resolveLanguage } from './i18n';

describe('system language resolution', () => {
  it('uses the first system language instead of any later fallback language', () => {
    expect(resolveLanguage('system', ['en-AU', 'zh-Hant-TW'])).toBe('en');
  });

  it('recognizes Traditional and Simplified Chinese when each is preferred', () => {
    expect(resolveLanguage('system', ['zh-HK', 'en-AU'])).toBe('zh-Hant');
    expect(resolveLanguage('system', ['zh-CN', 'en-AU'])).toBe('zh-Hans');
  });

  it('keeps an explicit language choice', () => {
    expect(resolveLanguage('zh-Hant', ['en-AU'])).toBe('zh-Hant');
  });
});
