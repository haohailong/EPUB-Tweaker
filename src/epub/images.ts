import type { ArchiveFiles } from './archive';
import type { ImageMatch, ReplacementPayload } from '../types';

export interface Dimensions {
  width: number;
  height: number;
}

export function imageDimensions(data: Uint8Array): Dimensions | undefined {
  if (data.length >= 24 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (data.length >= 10 && String.fromCharCode(...data.slice(0, 3)) === 'GIF') {
    return { width: data[6] | (data[7] << 8), height: data[8] | (data[9] << 8) };
  }
  if (data.length >= 12 && data[0] === 0x52 && data[1] === 0x49 && data[8] === 0x57 && data[9] === 0x45) {
    const kind = String.fromCharCode(...data.slice(12, 16));
    if (kind === 'VP8X' && data.length >= 30) {
      return {
        width: 1 + data[24] + (data[25] << 8) + (data[26] << 16),
        height: 1 + data[27] + (data[28] << 8) + (data[29] << 16)
      };
    }
  }
  if (data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = data[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const length = (data[offset + 2] << 8) | data[offset + 3];
      if (length < 2) break;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return {
          height: (data[offset + 5] << 8) | data[offset + 6],
          width: (data[offset + 7] << 8) | data[offset + 8]
        };
      }
      offset += 2 + length;
    }
  }
  return undefined;
}

async function averageHash(data: Uint8Array, type: string): Promise<bigint | undefined> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') return undefined;
  try {
    const bitmap = await createImageBitmap(new Blob([data.slice().buffer], { type }));
    const canvas = new OffscreenCanvas(8, 8);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return undefined;
    context.drawImage(bitmap, 0, 0, 8, 8);
    bitmap.close();
    const pixels = context.getImageData(0, 0, 8, 8).data;
    const values: number[] = [];
    for (let index = 0; index < pixels.length; index += 4) {
      values.push(pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114);
    }
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return values.reduce((hash, value, index) => (value >= average ? hash | (1n << BigInt(index)) : hash), 0n);
  } catch {
    return undefined;
  }
}

function hashSimilarity(left?: bigint, right?: bigint): number | undefined {
  if (left === undefined || right === undefined) return undefined;
  let value = left ^ right;
  let distance = 0;
  while (value) {
    distance += Number(value & 1n);
    value >>= 1n;
  }
  return 1 - distance / 64;
}

function mimeFromName(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase();
  return extension === 'png' ? 'image/png' : extension === 'gif' ? 'image/gif' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
}

export async function matchImages(
  files: ArchiveFiles,
  originals: Array<{ path: string; mediaType: string }>,
  replacements: ReplacementPayload[]
): Promise<ImageMatch[]> {
  const originalData = await Promise.all(
    originals.map(async (item) => {
      const bytes = files.get(item.path)!;
      return { ...item, bytes, dimensions: imageDimensions(bytes), hash: await averageHash(bytes, item.mediaType) };
    })
  );
  const replacementData = await Promise.all(
    replacements.map(async (item) => {
      const bytes = new Uint8Array(item.data);
      const type = item.type || mimeFromName(item.name);
      return { ...item, bytes, type, dimensions: imageDimensions(bytes), hash: await averageHash(bytes, type) };
    })
  );
  return replacementData.map((replacement) => {
    const candidates = originalData
      .map((original) => {
        if (!replacement.dimensions || !original.dimensions) return { original, score: 0 };
        const originalRatio = original.dimensions.width / original.dimensions.height;
        const replacementRatio = replacement.dimensions.width / replacement.dimensions.height;
        const ratioScore = Math.max(0, 1 - Math.abs(Math.log(originalRatio / replacementRatio)) * 4);
        const perceptual = hashSimilarity(original.hash, replacement.hash);
        const isLarger = replacement.dimensions.width >= original.dimensions.width && replacement.dimensions.height >= original.dimensions.height;
        const score = perceptual === undefined
          ? ratioScore * 0.86 + (isLarger ? 0.05 : 0)
          : ratioScore * 0.36 + perceptual * 0.58 + (isLarger ? 0.06 : 0);
        return { original, score: Math.max(0, Math.min(1, score)) };
      })
      .sort((left, right) => right.score - left.score);
    const best = candidates[0];
    const next = candidates[1];
    const automatic = Boolean(best && best.score >= 0.92 && (!next || best.score - next.score >= 0.06));
    return {
      replacementName: replacement.name,
      originalPath: best?.score >= 0.55 ? best.original.path : undefined,
      originalWidth: best?.original.dimensions?.width,
      originalHeight: best?.original.dimensions?.height,
      replacementWidth: replacement.dimensions?.width,
      replacementHeight: replacement.dimensions?.height,
      confidence: best ? Math.round(best.score * 100) / 100 : 0,
      automatic
    };
  });
}
