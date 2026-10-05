import type { FileStatus, ProcessOptions, ProcessResult } from './types';

export interface QueueItemState {
  status: FileStatus;
  options: ProcessOptions;
  infoAvailable: boolean;
  result?: ProcessResult;
  resultOptions?: ProcessOptions;
  lastAttemptOptions?: ProcessOptions;
}

export function snapshotOptions(options: ProcessOptions): ProcessOptions {
  return { ...options, imageMappings: { ...options.imageMappings } };
}

function optionsSignature(options: ProcessOptions): string {
  return JSON.stringify({
    vertical: options.vertical,
    horizontal: options.horizontal,
    japaneseMode: options.japaneseMode,
    progression: options.progression,
    outputName: options.outputName?.trim() ?? '',
    imageMappings: Object.entries(options.imageMappings).sort(([left], [right]) => left.localeCompare(right))
  });
}

export function optionsEqual(left: ProcessOptions | undefined, right: ProcessOptions | undefined): boolean {
  return Boolean(left && right && optionsSignature(left) === optionsSignature(right));
}

export function hasCurrentResult(item: QueueItemState): boolean {
  return Boolean(item.result && optionsEqual(item.options, item.resultOptions));
}

export function optionsChangedSinceAttempt(item: QueueItemState): boolean {
  return Boolean(item.lastAttemptOptions && !hasCurrentResult(item) && !optionsEqual(item.options, item.lastAttemptOptions));
}

export function shouldProcess(item: QueueItemState): boolean {
  if (['inspecting', 'matching', 'processing'].includes(item.status) || !item.infoAvailable) return false;
  if (hasCurrentResult(item)) return false;
  if (!item.lastAttemptOptions) return item.status === 'ready' || item.status === 'error';
  return optionsChangedSinceAttempt(item);
}
