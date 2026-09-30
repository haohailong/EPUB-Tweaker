import { describe, expect, it } from 'vitest';
import { imageDimensions, matchImages } from './images';

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width); view.setUint32(20, height);
  return bytes;
}

describe('local image matching', () => {
  it('reads dimensions and finds the closest aspect ratio without using filenames', async () => {
    expect(imageDimensions(png(600, 824))).toEqual({ width: 600, height: 824 });
    const files = new Map([['Images/x.png', png(600, 824)], ['Images/y.png', png(800, 800)]]);
    const replacement = png(2400, 3296);
    const matches = await matchImages(files, [
      { path: 'Images/x.png', mediaType: 'image/png' }, { path: 'Images/y.png', mediaType: 'image/png' }
    ], [{ name: 'totally-different-name.png', type: 'image/png', data: Uint8Array.from(replacement).buffer }]);
    expect(matches[0].originalPath).toBe('Images/x.png');
    expect(matches[0].confidence).toBeGreaterThan(0.85);
  });
});
