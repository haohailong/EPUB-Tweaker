import { describe, expect, it } from 'vitest';
import { hasCurrentResult, optionsChangedSinceAttempt, shouldProcess, snapshotOptions, type QueueItemState } from './queueState';
import type { ProcessOptions, ProcessResult } from './types';

const base: ProcessOptions = { vertical: false, horizontal: false, japaneseMode: false, progression: 'auto', imageMappings: {} };
const changed: ProcessOptions = { ...base, japaneseMode: true, imageMappings: {} };
const result = {} as ProcessResult;

function state(update: Partial<QueueItemState> = {}): QueueItemState {
  return { status: 'ready', options: snapshotOptions(base), infoAvailable: true, ...update };
}

describe('file queue processing state', () => {
  it('processes a newly inspected file once', () => {
    expect(shouldProcess(state())).toBe(true);
  });

  it('skips a successful result until its options change', () => {
    const completed = state({ status: 'repaired', result, resultOptions: snapshotOptions(base), lastAttemptOptions: snapshotOptions(base) });
    expect(hasCurrentResult(completed)).toBe(true);
    expect(shouldProcess(completed)).toBe(false);
    const stale = { ...completed, options: snapshotOptions(changed) };
    expect(optionsChangedSinceAttempt(stale)).toBe(true);
    expect(shouldProcess(stale)).toBe(true);
  });

  it('does not retry a failed attempt with unchanged options', () => {
    const failed = state({ status: 'error', lastAttemptOptions: snapshotOptions(base) });
    expect(shouldProcess(failed)).toBe(false);
    expect(shouldProcess({ ...failed, options: snapshotOptions(changed) })).toBe(true);
  });

  it('uses a matching previous success instead of reprocessing it', () => {
    const restored = state({
      status: 'error', result, resultOptions: snapshotOptions(base),
      lastAttemptOptions: snapshotOptions(changed), options: snapshotOptions(base)
    });
    expect(hasCurrentResult(restored)).toBe(true);
    expect(shouldProcess(restored)).toBe(false);
  });

  it('does not send an inspection failure into processing', () => {
    expect(shouldProcess(state({ status: 'error', infoAvailable: false }))).toBe(false);
  });
});
