import type { BookInfo, ImageMatch, ProcessOptions, ProcessResult, ReplacementPayload, WorkerProgress, WorkerRequest, WorkerResponse } from './types';

interface Pending<T> {
  resolve: (value: T) => void;
  reject: (error: Error & { code?: string }) => void;
  progress?: (progress: WorkerProgress) => void;
}

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const pending = new Map<string, Pending<unknown>>();

worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
  const response = event.data;
  const entry = pending.get(response.id);
  if (!entry) return;
  if (response.type === 'progress') {
    entry.progress?.(response.progress);
    return;
  }
  pending.delete(response.id);
  if (response.type === 'error') {
    const error = Object.assign(new Error(response.error.message), { code: response.error.code, path: response.error.path });
    entry.reject(error);
  } else {
    entry.resolve(response.result);
  }
};

function request<T>(payload: Omit<WorkerRequest, 'id'>, transfer: Transferable[], onProgress?: (progress: WorkerProgress) => void): Promise<T> {
  const id = crypto.randomUUID();
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject, progress: onProgress });
    worker.postMessage({ ...payload, id }, transfer);
  });
}

export async function inspectFile(file: File, onProgress?: (progress: WorkerProgress) => void): Promise<BookInfo> {
  const buffer = await file.arrayBuffer();
  return request<BookInfo>({ type: 'inspect', filename: file.name, buffer }, [buffer], onProgress);
}

async function replacementPayloads(files: File[]): Promise<ReplacementPayload[]> {
  return Promise.all(files.map(async (file) => ({ name: file.name, type: file.type, data: await file.arrayBuffer() })));
}

export async function matchFileImages(file: File, replacements: File[], onProgress?: (progress: WorkerProgress) => void): Promise<ImageMatch[]> {
  const buffer = await file.arrayBuffer();
  const payloads = await replacementPayloads(replacements);
  const transfers = [buffer, ...payloads.map((item) => item.data)];
  return request<ImageMatch[]>({ type: 'match-images', filename: file.name, buffer, replacements: payloads }, transfers, onProgress);
}

export async function processFile(
  file: File,
  options: ProcessOptions,
  replacements: File[],
  onProgress?: (progress: WorkerProgress) => void
): Promise<ProcessResult> {
  const buffer = await file.arrayBuffer();
  const payloads = await replacementPayloads(replacements);
  const transfers = [buffer, ...payloads.map((item) => item.data)];
  return request<ProcessResult>({ type: 'process', filename: file.name, buffer, options, replacements: payloads }, transfers, onProgress);
}
