export type Language = 'system' | 'en' | 'zh-Hant' | 'zh-Hans';
export type ResolvedLanguage = Exclude<Language, 'system'>;
export type Progression = 'auto' | 'rtl' | 'ltr';
export type EffectiveProgression = 'default' | 'rtl' | 'ltr';
export type WritingMode = 'horizontal' | 'vertical-rl' | 'vertical-lr' | 'unknown';
export type LayoutType = 'reflowable' | 'fixed' | 'unknown';
export type FileStatus = 'inspecting' | 'ready' | 'matching' | 'processing' | 'repaired' | 'unchanged' | 'error' | 'drm';

export interface ManifestItem {
  id: string;
  href: string;
  path: string;
  mediaType: string;
  properties: string[];
}

export interface SpineItem {
  idref: string;
  linear: boolean;
  properties: string[];
}

export interface EncryptionInfo {
  path: string;
  algorithm: string;
  isFontObfuscation: boolean;
  appearsStale: boolean;
}

export interface ImageInfo {
  path: string;
  mediaType: string;
  width?: number;
  height?: number;
}

export interface BookInfo {
  title: string;
  author: string;
  language: string;
  version: string;
  majorVersion: 2 | 3;
  packagePath: string;
  writingMode: WritingMode;
  progression: EffectiveProgression;
  layout: LayoutType;
  contentDocuments: number;
  stylesheets: number;
  images: number;
  imageResources: ImageInfo[];
  encryptedResources: number;
}

export type ReportKind = 'repair' | 'tweak' | 'warning' | 'visible';

export interface ReportEntry {
  rule: string;
  kind: ReportKind;
  path: string;
  message: string;
  before?: string;
  after?: string;
  count?: number;
  code?: string;
}

export interface TechnicalReport {
  version: string;
  packagePath: string;
  languageBefore: string;
  languageAfter: string;
  writingModeBefore: WritingMode;
  writingModeAfter: WritingMode;
  progressionBefore: EffectiveProgression;
  progressionAfter: EffectiveProgression;
  contentDocuments: number;
  stylesheets: number;
  images: number;
  entries: ReportEntry[];
  validationChecks: string[];
}

export interface ProcessOptions {
  vertical: boolean;
  horizontal: boolean;
  japaneseMode: boolean;
  progression: Progression;
  outputName?: string;
  imageMappings: Record<string, string>;
}

export interface ReplacementPayload {
  name: string;
  type: string;
  data: ArrayBuffer;
}

export interface ImageMatch {
  replacementName: string;
  originalPath?: string;
  originalWidth?: number;
  originalHeight?: number;
  replacementWidth?: number;
  replacementHeight?: number;
  confidence: number;
  automatic: boolean;
}

export interface ProcessResult {
  info: BookInfo;
  output: ArrayBuffer;
  outputName: string;
  report: TechnicalReport;
  changed: boolean;
}

export interface WorkerProgress {
  phase: 'opening' | 'parsing' | 'repairing' | 'normalizing' | 'rebuilding' | 'validating' | 'done';
  percent: number;
}

export interface WorkerRequest {
  id: string;
  type: 'inspect' | 'process' | 'match-images';
  filename: string;
  buffer: ArrayBuffer;
  options?: ProcessOptions;
  replacements?: ReplacementPayload[];
}

export type WorkerResponse =
  | { id: string; type: 'progress'; progress: WorkerProgress }
  | { id: string; type: 'result'; result: BookInfo | ProcessResult | ImageMatch[] }
  | { id: string; type: 'error'; error: { code: string; message: string; path?: string } };
