import { createEpubArchive, openArchive } from './archive';
import { imageDimensions, matchImages } from './images';
import { parseBook } from './parser';
import { applyRepairs } from './repairs';
import { toBookInfo } from './model';
import { validateOutput } from './validator';
import type { BookInfo, ImageMatch, ProcessOptions, ProcessResult, ReplacementPayload, WorkerProgress } from '../types';

export type ProgressCallback = (progress: WorkerProgress) => void;

function progress(callback: ProgressCallback | undefined, phase: WorkerProgress['phase'], percent: number): void {
  callback?.({ phase, percent });
}

function outputFilename(input: string, requested?: string): string {
  if (requested?.trim()) {
    const safe = requested.trim().replace(/[\\/:*?"<>|\0]/g, '-');
    return safe.toLowerCase().endsWith('.epub') ? safe : `${safe}.epub`;
  }
  const base = input.replace(/\.epub$/i, '').replace(/(?:(?:-fixed|-tweaked))+$/i, '');
  return `${base}-tweaked.epub`;
}

export async function inspectEpub(buffer: ArrayBuffer, callback?: ProgressCallback): Promise<BookInfo> {
  progress(callback, 'opening', 10);
  const files = await openArchive(buffer);
  progress(callback, 'parsing', 70);
  const book = parseBook(files);
  const info = toBookInfo(book);
  for (const image of info.imageResources) {
    const dimensions = imageDimensions(files.get(image.path)!);
    image.width = dimensions?.width;
    image.height = dimensions?.height;
  }
  progress(callback, 'done', 100);
  return info;
}

export async function analyzeImageMatches(
  buffer: ArrayBuffer,
  replacements: ReplacementPayload[],
  callback?: ProgressCallback
): Promise<ImageMatch[]> {
  progress(callback, 'opening', 10);
  const files = await openArchive(buffer);
  const book = parseBook(files);
  progress(callback, 'parsing', 50);
  const originals = book.manifest.filter((item) => item.mediaType.startsWith('image/'));
  const matches = await matchImages(files, originals, replacements);
  progress(callback, 'done', 100);
  return matches;
}

export async function processEpub(
  filename: string,
  buffer: ArrayBuffer,
  options: ProcessOptions,
  replacements: ReplacementPayload[] = [],
  callback?: ProgressCallback
): Promise<ProcessResult> {
  progress(callback, 'opening', 5);
  const files = await openArchive(buffer);
  progress(callback, 'parsing', 20);
  const book = parseBook(files);
  progress(callback, 'repairing', 40);
  const report = applyRepairs(book, options, replacements);
  progress(callback, 'normalizing', 65);
  const outputBytes = createEpubArchive(book.files);
  const output = Uint8Array.from(outputBytes).buffer;
  progress(callback, 'validating', 82);
  report.validationChecks = validateOutput(output);
  progress(callback, 'done', 100);
  return {
    info: toBookInfo(book),
    output,
    outputName: outputFilename(filename, options.outputName),
    report,
    changed: report.entries.some((entry) => entry.kind !== 'warning')
  };
}
