/// <reference lib="webworker" />
import { EpubError } from './epub/errors';
import { analyzeImageMatches, inspectEpub, processEpub } from './epub/process';
import type { WorkerProgress, WorkerRequest, WorkerResponse } from './types';

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const send = (response: WorkerResponse, transfers: Transferable[] = []) => scope.postMessage(response, transfers);
  const onProgress = (progress: WorkerProgress) => {
    send({ id: request.id, type: 'progress', progress });
  };
  try {
    if (request.type === 'inspect') {
      const result = await inspectEpub(request.buffer, onProgress);
      send({ id: request.id, type: 'result', result });
    } else if (request.type === 'match-images') {
      const result = await analyzeImageMatches(request.buffer, request.replacements ?? [], onProgress);
      send({ id: request.id, type: 'result', result });
    } else {
      const result = await processEpub(request.filename, request.buffer, request.options!, request.replacements ?? [], onProgress);
      send({ id: request.id, type: 'result', result }, [result.output]);
    }
  } catch (error) {
    const epubError = error instanceof EpubError ? error : new EpubError('INVALID_EPUB_ARCHIVE', error instanceof Error ? error.message : String(error));
    send({ id: request.id, type: 'error', error: { code: epubError.code, message: epubError.message, path: epubError.path } });
  }
};
