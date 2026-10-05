import { describe, expect, it } from 'vitest';
import { hasCurrentResult, optionsChangedSinceAttempt, optionsChangedWithoutEffect, processingOptions, shouldProcess, snapshotOptions, type QueueItemState } from './queueState';
import type { BookInfo, ProcessOptions, ProcessResult } from './types';

const base: ProcessOptions = { vertical: false, horizontal: false, japaneseMode: false, progression: 'auto', imageMappings: {} };

function book(update: Partial<BookInfo> = {}): BookInfo {
  return {
    title: 'Book', author: '', language: 'zh-TW', version: '3.0', majorVersion: 3,
    packagePath: 'OEBPS/content.opf', writingMode: 'vertical-rl', progression: 'rtl', layout: 'reflowable',
    contentDocuments: 1, stylesheets: 1, images: 0, imageResources: [], encryptedResources: 0,
    ...update
  };
}

function result(info: BookInfo): ProcessResult {
  return { info, output: new ArrayBuffer(0), outputName: 'book-tweaked.epub', changed: true, report: {} as ProcessResult['report'] };
}

function state(update: Partial<QueueItemState> = {}): QueueItemState {
  return { status: 'ready', options: snapshotOptions(base), info: book(), ...update };
}

describe('file queue processing state', () => {
  it('processes a newly inspected file once even when the layout is preserved', () => {
    expect(shouldProcess(state())).toBe(true);
  });

  it('does not reprocess when preserve layout keeps the successful converted layout', () => {
    const converted = book({ writingMode: 'horizontal', progression: 'ltr' });
    const completed = state({
      status: 'repaired', result: result(converted),
      resultOptions: { ...base, horizontal: true }, lastAttemptOptions: { ...base, horizontal: true }
    });
    expect(hasCurrentResult(completed)).toBe(true);
    expect(optionsChangedWithoutEffect(completed)).toBe(true);
    expect(shouldProcess(completed)).toBe(false);
    expect(processingOptions(completed)).toMatchObject({ horizontal: true, vertical: false, progression: 'ltr' });
  });

  it('treats auto and an explicit direction as equivalent when the effective direction is unchanged', () => {
    const horizontalSource = book({ writingMode: 'horizontal', progression: 'default' });
    const completed = state({
      info: horizontalSource,
      options: { ...base, progression: 'auto' },
      result: result(book({ writingMode: 'horizontal', progression: 'ltr' })),
      resultOptions: { ...base, progression: 'ltr' }, lastAttemptOptions: { ...base, progression: 'ltr' }
    });
    expect(hasCurrentResult(completed)).toBe(true);
    expect(optionsChangedWithoutEffect(completed)).toBe(true);
    expect(shouldProcess(completed)).toBe(false);
  });

  it('reprocesses when the effective writing mode changes', () => {
    const completed = state({
      status: 'repaired', options: { ...base, horizontal: true }, result: result(book()),
      resultOptions: snapshotOptions(base), lastAttemptOptions: snapshotOptions(base)
    });
    expect(hasCurrentResult(completed)).toBe(false);
    expect(optionsChangedSinceAttempt(completed)).toBe(true);
    expect(shouldProcess(completed)).toBe(true);
  });

  it('rebuilds from the original while retaining the last successful layout', () => {
    const converted = book({ writingMode: 'horizontal', progression: 'ltr' });
    const completed = state({
      options: { ...base, japaneseMode: true }, result: result(converted),
      resultOptions: { ...base, horizontal: true }, lastAttemptOptions: { ...base, horizontal: true }
    });
    expect(processingOptions(completed)).toMatchObject({ horizontal: true, vertical: false, japaneseMode: true, progression: 'ltr' });
  });

  it('does not retry a failed attempt with unchanged options', () => {
    const failed = state({ status: 'error', lastAttemptOptions: snapshotOptions(base) });
    expect(shouldProcess(failed)).toBe(false);
    expect(shouldProcess({ ...failed, options: { ...base, japaneseMode: true } })).toBe(true);
  });

  it('uses a matching previous success instead of reprocessing it', () => {
    const previous = result(book());
    const changed = { ...base, japaneseMode: true };
    const restored = state({ status: 'error', result: previous, resultOptions: snapshotOptions(base), lastAttemptOptions: changed });
    expect(hasCurrentResult(restored)).toBe(true);
    expect(shouldProcess(restored)).toBe(false);
  });

  it('does not send an inspection failure into processing', () => {
    expect(shouldProcess({ ...state({ status: 'error' }), info: undefined })).toBe(false);
  });
});
