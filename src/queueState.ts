import type { BookInfo, EffectiveProgression, FileStatus, ProcessOptions, ProcessResult, WritingMode } from './types';

export interface QueueItemState {
  status: FileStatus;
  options: ProcessOptions;
  info?: BookInfo;
  result?: ProcessResult;
  resultOptions?: ProcessOptions;
  lastAttemptOptions?: ProcessOptions;
}

export interface DesiredBookState {
  language: string;
  writingMode: WritingMode;
  progression: EffectiveProgression;
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

function auxiliaryOptionsSignature(options: ProcessOptions): string {
  return JSON.stringify({
    outputName: options.outputName?.trim() ?? '',
    imageMappings: Object.entries(options.imageMappings).sort(([left], [right]) => left.localeCompare(right))
  });
}

export function optionsEqual(left: ProcessOptions | undefined, right: ProcessOptions | undefined): boolean {
  return Boolean(left && right && optionsSignature(left) === optionsSignature(right));
}

function effectiveProgression(progression: EffectiveProgression, writingMode: WritingMode): EffectiveProgression {
  if (progression !== 'default') return progression;
  if (writingMode === 'vertical-rl') return 'rtl';
  if (writingMode === 'horizontal' || writingMode === 'vertical-lr') return 'ltr';
  return 'default';
}

export function desiredBookState(item: QueueItemState): DesiredBookState | undefined {
  const source = item.info;
  if (!source) return undefined;

  const canConvertLayout = source.layout !== 'fixed';
  const previous = item.result?.info;
  const writingMode = canConvertLayout && item.options.horizontal
    ? 'horizontal'
    : canConvertLayout && item.options.vertical
      ? 'vertical-rl'
      : previous?.writingMode ?? source.writingMode;

  const progression = item.options.progression !== 'auto'
    ? item.options.progression
    : canConvertLayout && item.options.horizontal
      ? 'ltr'
      : canConvertLayout && item.options.vertical
        ? 'rtl'
        : effectiveProgression(previous?.progression ?? source.progression, writingMode);

  return {
    language: item.options.japaneseMode ? 'ja' : source.language,
    writingMode,
    progression
  };
}

export function processingOptions(item: QueueItemState): ProcessOptions {
  const source = item.info;
  const target = desiredBookState(item);
  if (!source || !target) return snapshotOptions(item.options);

  const canConvertLayout = source.layout !== 'fixed';
  const horizontal = canConvertLayout && target.writingMode === 'horizontal' && source.writingMode !== 'horizontal';
  const vertical = canConvertLayout && target.writingMode === 'vertical-rl' && source.writingMode !== 'vertical-rl';
  const progression = target.progression === 'default' ? 'auto' : target.progression;

  return snapshotOptions({
    ...item.options,
    horizontal,
    vertical: vertical && !horizontal,
    progression
  });
}

export function hasCurrentResult(item: QueueItemState): boolean {
  const target = desiredBookState(item);
  const result = item.result;
  if (!target || !result || !item.resultOptions) return false;
  const actual = result.info;
  return target.language === actual.language
    && target.writingMode === actual.writingMode
    && target.progression === effectiveProgression(actual.progression, actual.writingMode)
    && auxiliaryOptionsSignature(item.options) === auxiliaryOptionsSignature(item.resultOptions);
}

export function optionsChangedWithoutEffect(item: QueueItemState): boolean {
  return Boolean(hasCurrentResult(item) && item.resultOptions && !optionsEqual(item.options, item.resultOptions));
}

export function optionsChangedSinceAttempt(item: QueueItemState): boolean {
  return Boolean(item.lastAttemptOptions && !hasCurrentResult(item) && !optionsEqual(item.options, item.lastAttemptOptions));
}

export function shouldProcess(item: QueueItemState): boolean {
  if (['inspecting', 'matching', 'processing'].includes(item.status) || !item.info) return false;
  if (hasCurrentResult(item)) return false;
  if (!item.lastAttemptOptions) return item.status === 'ready' || item.status === 'error';
  return optionsChangedSinceAttempt(item);
}
