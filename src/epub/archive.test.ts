import { describe, expect, it } from 'vitest';
import { openArchiveSync, readFirstLocalHeader } from './archive';
import { normalizeArchivePath } from './path';
import { syntheticEpub } from '../test/fixtures';

describe('EPUB archive handling', () => {
  it('writes mimetype first and uncompressed', () => {
    const fixture = syntheticEpub();
    expect(readFirstLocalHeader(new Uint8Array(fixture))).toEqual({ firstName: 'mimetype', firstMethod: 0 });
    expect(new TextDecoder().decode(openArchiveSync(fixture).get('mimetype'))).toBe('application/epub+zip');
  });

  it('rejects archive paths that escape the root', () => {
    expect(() => normalizeArchivePath('../../secret')).toThrowError(/escapes/);
    expect(() => normalizeArchivePath('/absolute')).toThrowError(/Unsafe/);
  });
});
