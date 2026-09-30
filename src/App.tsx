import { useEffect, useMemo, useRef, useState } from 'react';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { resolveLanguage, translator, type TranslationKey } from './i18n';
import { inspectFile, matchFileImages, processFile } from './workerClient';
import type { BookInfo, FileStatus, ImageMatch, Language, ProcessOptions, ProcessResult, Progression, ReportEntry, WorkerProgress } from './types';

interface AppProps {
  onRegisterUpdate: (callback: () => void) => void;
  updateApp: () => void;
}

interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  info?: BookInfo;
  progress?: WorkerProgress;
  error?: { code?: string; message: string };
  options: ProcessOptions;
  replacements: File[];
  matches: ImageMatch[];
  result?: ProcessResult;
  downloaded?: boolean;
  copied?: boolean;
}

const DEFAULT_OPTIONS: ProcessOptions = { vertical: false, horizontal: false, japaneseMode: false, progression: 'auto', imageMappings: {} };
const GITHUB_URL = 'https://github.com/haohailong/EPUB-Tweaker';
const FACEBOOK_GROUP_URL = 'https://www.facebook.com/groups/ereaderfamily';

const statusKeys: Record<FileStatus, TranslationKey> = {
  inspecting: 'statusInspecting', ready: 'statusReady', matching: 'statusMatching', processing: 'statusProcessing', repaired: 'statusRepaired', unchanged: 'statusUnchanged', error: 'statusError', drm: 'statusDrm'
};

const phaseKeys: Record<WorkerProgress['phase'], TranslationKey> = {
  opening: 'phaseOpening', parsing: 'phaseParsing', repairing: 'phaseRepairing', normalizing: 'phaseNormalizing', rebuilding: 'phaseRebuilding', validating: 'phaseValidating', done: 'phaseDone'
};

const ruleKeys: Record<string, TranslationKey> = {
  'body-anchor-navigation': 'ruleNavigation', 'obsolete-page-map': 'rulePageMap', 'stale-encryption-metadata': 'ruleStaleEncryption',
  'pseudo-box-shadow': 'ruleCss', 'svg-title': 'ruleSvg', 'chinese-ruby': 'ruleRuby', 'vertical-layout': 'ruleVertical', 'horizontal-layout': 'ruleHorizontal',
  'kindle-language-metadata': 'ruleKindleLanguage', 'reflowable-svg-page': 'ruleReflowableSvgPage', 'reflowable-page-spread': 'ruleReflowableSpread', 'standard-writing-mode': 'ruleStandardWritingMode', 'kindle-vertical-chinese': 'ruleKindleVerticalChinese',
  'japanese-mode': 'ruleJapanese', 'image-replacement': 'ruleImage', 'utf8-normalization': 'ruleUtf8', 'page-progression': 'ruleProgression', 'kindle-writing-mode': 'ruleWritingMode',
  'vertical-fixed-layout': 'ruleVerticalSkipped'
};

const errorKeys: Record<string, TranslationKey> = {
  INVALID_EPUB_ARCHIVE: 'errorInvalid', EPUB_CONTAINER_MISSING: 'errorContainer', PACKAGE_DOCUMENT_MISSING: 'errorPackage',
  MANIFEST_RESOURCE_MISSING: 'errorManifest', SPINE_RESOURCE_MISSING: 'errorSpine', DRM_PROTECTED: 'errorDrm',
  UNSUPPORTED_ENCRYPTION: 'errorDrm', XML_PARSE_FAILED: 'errorXml', ZIP_PATH_TRAVERSAL: 'errorUnsafe', ZIP_BOMB_LIMIT: 'errorTooLarge', POST_VALIDATION_FAILED: 'errorValidation'
};

function formatBytes(size: number, locale: string): string {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = size / 1024;
  let unit = units[0];
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

function triggerDownload(data: BlobPart, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function logText(item: FileItem): string {
  if (!item.result) return '';
  const report = item.result.report;
  return [
    'EPUB Tweaker report',
    `input: ${item.file.name}`,
    `output: ${item.result.outputName}`,
    `epub-version: ${report.version}`,
    `package-path: ${report.packagePath}`,
    `language: ${report.languageBefore || 'unset'} -> ${report.languageAfter || 'unset'}`,
    `writing-mode: ${report.writingModeBefore} -> ${report.writingModeAfter}`,
    `page-progression: ${report.progressionBefore} -> ${report.progressionAfter}`,
    `resources: content=${report.contentDocuments}, css=${report.stylesheets}, images=${report.images}`,
    '',
    ...report.entries.map((entry) => `[${entry.kind}] ${entry.rule} | ${entry.path}${entry.before || entry.after ? ` | ${entry.before ?? ''} -> ${entry.after ?? ''}` : ''}${entry.count ? ` | count=${entry.count}` : ''}${entry.code ? ` | ${entry.code}` : ''}`),
    '',
    ...report.validationChecks.map((_, index) => `validation-${index + 1}: passed`)
  ].join('\n');
}

export default function App({ onRegisterUpdate, updateApp }: AppProps) {
  const [languageChoice, setLanguageChoice] = useState<Language>(() => (localStorage.getItem('epub-tweaker-language') as Language) || 'system');
  const [items, setItems] = useState<FileItem[]>([]);
  const [globalOptions, setGlobalOptions] = useState<ProcessOptions>({ ...DEFAULT_OPTIONS, imageMappings: {} });
  const [dragging, setDragging] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [notice, setNotice] = useState('');
  const filesSection = useRef<HTMLElement>(null);
  const previousItemCount = useRef(0);
  const language = resolveLanguage(languageChoice);
  const t = useMemo(() => translator(language), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('epub-tweaker-language', languageChoice);
  }, [language, languageChoice]);
  useEffect(() => onRegisterUpdate(() => setUpdateReady(true)), [onRegisterUpdate]);
  useEffect(() => {
    if (items.length > previousItemCount.current && items.length > 0) {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      requestAnimationFrame(() => filesSection.current?.scrollIntoView({ behavior, block: 'start' }));
    }
    previousItemCount.current = items.length;
  }, [items.length]);

  const updateItem = (id: string, update: Partial<FileItem> | ((item: FileItem) => Partial<FileItem>)) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...(typeof update === 'function' ? update(item) : update) } : item));
  };

  const updateGlobalOptions = (next: Partial<Pick<ProcessOptions, 'vertical' | 'horizontal' | 'japaneseMode' | 'progression'>>) => {
    setGlobalOptions((current) => ({ ...current, ...next }));
    setItems((current) => current.map((item) => item.result ? item : {
      ...item,
      options: { ...item.options, ...next }
    }));
  };

  const inspect = async (item: FileItem) => {
    updateItem(item.id, { status: 'inspecting', error: undefined });
    try {
      const info = await inspectFile(item.file, (progress) => updateItem(item.id, { progress }));
      updateItem(item.id, { info, status: 'ready', progress: undefined });
    } catch (caught) {
      const error = caught as Error & { code?: string };
      updateItem(item.id, { status: error.code === 'DRM_PROTECTED' ? 'drm' : 'error', error: { code: error.code, message: error.message }, progress: undefined });
    }
  };

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list);
    const valid = files.filter((file) => file.name.toLowerCase().endsWith('.epub'));
    if (valid.length !== files.length) setNotice(t('invalidType'));
    const added = valid.map<FileItem>((file) => ({
      id: crypto.randomUUID(), file, status: 'inspecting', options: { ...globalOptions, imageMappings: {} }, replacements: [], matches: []
    }));
    setItems((current) => [...current, ...added]);
    added.forEach((item) => void inspect(item));
  };

  const processOne = async (item: FileItem) => {
    updateItem(item.id, { status: 'processing', error: undefined });
    try {
      const result = await processFile(item.file, item.options, item.replacements, (progress) => updateItem(item.id, { progress }));
      updateItem(item.id, { result, downloaded: false, status: result.changed ? 'repaired' : 'unchanged', progress: undefined });
    } catch (caught) {
      const error = caught as Error & { code?: string };
      updateItem(item.id, { status: error.code === 'DRM_PROTECTED' ? 'drm' : 'error', error: { code: error.code, message: error.message }, progress: undefined });
    }
  };

  const processAll = async () => {
    for (const item of items.filter((candidate) => candidate.status === 'ready' || candidate.status === 'error')) {
      await processOne(item);
    }
  };

  const selectReplacements = async (item: FileItem, files: FileList | null) => {
    if (!files?.length) return;
    const replacements = Array.from(files).filter((file) => file.type.startsWith('image/') || /\.(?:png|jpe?g|gif|webp)$/i.test(file.name));
    updateItem(item.id, { replacements, status: 'matching', matches: [] });
    try {
      const matches = await matchFileImages(item.file, replacements, (progress) => updateItem(item.id, { progress }));
      const imageMappings = Object.fromEntries(matches.filter((match) => match.automatic && match.originalPath).map((match) => [match.replacementName, match.originalPath!]));
      updateItem(item.id, (current) => ({ matches, status: 'ready', progress: undefined, options: { ...current.options, imageMappings } }));
    } catch (caught) {
      const error = caught as Error & { code?: string };
      updateItem(item.id, { status: 'error', error: { code: error.code, message: error.message }, progress: undefined });
    }
  };

  const toggleMatch = (item: FileItem, match: ImageMatch, checked: boolean) => {
    if (!match.originalPath) return;
    updateItem(item.id, (current) => {
      const mappings = { ...current.options.imageMappings };
      if (checked) mappings[match.replacementName] = match.originalPath!;
      else delete mappings[match.replacementName];
      return { options: { ...current.options, imageMappings: mappings } };
    });
  };

  const downloadAll = () => {
    const outputs = items.flatMap((item) => item.result ? [item.result] : []);
    if (outputs.length === 1) {
      triggerDownload(outputs[0].output, outputs[0].outputName, 'application/epub+zip');
      setItems((current) => current.map((item) => item.result ? { ...item, downloaded: true } : item));
      return;
    }
    const entries: Zippable = {};
    for (const result of outputs) entries[result.outputName] = [new Uint8Array(result.output), { level: 0 }];
    const readme = strToU8('Generated locally by EPUB Tweaker. No book data was uploaded.\n');
    entries['EPUB-Tweaker.txt'] = readme;
    triggerDownload(zipSync(entries), 'epub-tweaker-results.zip', 'application/zip');
    setItems((current) => current.map((item) => item.result ? { ...item, downloaded: true } : item));
  };

  const clearProcessed = () => {
    const undownloaded = items.filter((item) => item.result && !item.downloaded).length;
    if (undownloaded > 0 && !window.confirm(t('confirmClearUndownloaded', { count: undownloaded }))) return;
    setItems((current) => current.filter((item) => !item.result));
  };

  const clearLocalData = async () => {
    localStorage.removeItem('epub-tweaker-language');
    if ('caches' in window) await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
    setLanguageChoice('system');
    setNotice(t('clearDone'));
    setSettingsOpen(false);
  };

  const finished = items.filter((item) => item.result).length;
  const ready = items.some((item) => item.status === 'ready' || item.status === 'error');

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#main" aria-label="EPUB Tweaker">
          <img src="/icon.svg" alt="" /><span>EPUB Tweaker</span>
        </a>
        <div className="header-actions">
          <LanguageButtons language={language} label={t('language')} onChange={setLanguageChoice} />
          <a className="github-link" href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label={t('sourceCode')} title={t('sourceCode')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.16 1.18a10.98 10.98 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.41-2.71 5.39-5.28 5.68.41.36.78 1.06.78 2.14v3.27c0 .31.21.67.79.56A11.5 11.5 0 0 0 12 .7Z"/></svg>
          </a>
          <button className="icon-button settings-button" onClick={() => setSettingsOpen(true)} aria-label={t('settings')} title={t('settings')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.75A3.25 3.25 0 1 0 12 15.25 3.25 3.25 0 0 0 12 8.75ZM19.15 13.3a7.9 7.9 0 0 0 .05-1.3 7.9 7.9 0 0 0-.05-1.3l2-1.56-2-3.46-2.48 1a8.1 8.1 0 0 0-2.25-1.3L14.05 2h-4.1l-.37 3.38a8.1 8.1 0 0 0-2.25 1.3l-2.48-1-2 3.46 2 1.56A7.9 7.9 0 0 0 4.8 12c0 .44.02.87.05 1.3l-2 1.56 2 3.46 2.48-1a8.1 8.1 0 0 0 2.25 1.3l.37 3.38h4.1l.37-3.38a8.1 8.1 0 0 0 2.25-1.3l2.48 1 2-3.46-2-1.56Z"/></svg>
          </button>
        </div>
      </header>

      <main id="main">
        <section className={`hero ${items.length ? 'has-files' : ''}`}>
          <p className="eyebrow">EPUB 2 · EPUB 3 · PWA</p>
          <h1>EPUB Tweaker</h1>
          <p className="tagline">{t('tagline')}<small>{t('secondaryTagline')}</small></p>
          <section className="home-options" aria-labelledby="processing-options-title">
            <div className="home-options-heading"><div><p className="eyebrow">{t('stepOne')}</p><h2 id="processing-options-title">{t('processingOptions')}</h2></div><small>{t('optionsApplyAll')}</small></div>
            <div className="home-options-grid">
              <fieldset><legend>{t('layoutOptions')}</legend><div className="segmented-control">
                <label><input type="radio" name="layout-transform" checked={!globalOptions.vertical && !globalOptions.horizontal} onChange={() => updateGlobalOptions({ vertical: false, horizontal: false })} /><span>{t('preserveLayout')}</span></label>
                <label><input type="radio" name="layout-transform" checked={globalOptions.vertical} onChange={() => updateGlobalOptions({ vertical: true, horizontal: false })} /><span>{t('vertical')}</span></label>
                <label><input type="radio" name="layout-transform" checked={globalOptions.horizontal} onChange={() => updateGlobalOptions({ vertical: false, horizontal: true })} /><span>{t('horizontalTransform')}</span></label>
              </div></fieldset>
              <fieldset><legend>{t('japanese')}</legend><label className="check-row"><input type="checkbox" checked={globalOptions.japaneseMode} onChange={(event) => updateGlobalOptions({ japaneseMode: event.target.checked })} /><span>{t('japanese')}<small>{t('japaneseHelp')}</small></span></label></fieldset>
              <fieldset><legend>{t('progression')}</legend><label className="field-label">{t('progression')}<select value={globalOptions.progression} onChange={(event) => updateGlobalOptions({ progression: event.target.value as Progression })}><option value="auto">{t('progressionAuto')}</option><option value="rtl">{t('progressionRtl')}</option><option value="ltr">{t('progressionLtr')}</option></select></label></fieldset>
            </div>
          </section>
          <div
            className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
          >
            <div className="drop-illustration" aria-hidden="true"><span>e</span><i>+</i></div>
            <div className="drop-zone-heading"><p className="eyebrow">{t('stepTwo')}</p><h2>{t('drop')}</h2></div><p>{t('dropHint')}</p>
            <input id="epub-file-input" className="sr-only" aria-label={t('choose')} type="file" accept=".epub,application/epub+zip" multiple onChange={(event) => { addFiles(event.target.files ?? []); event.currentTarget.value = ''; }} />
            <label className="primary choose-label" htmlFor="epub-file-input">{t('choose')}</label>
          </div>
          <div className="privacy-note"><span aria-hidden="true">⌁</span><div><strong>{t('privacy')}</strong><small>{t('installHelp')}</small></div></div>
        </section>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label={t('close')}>×</button></div>}
        {updateReady && <div className="update-banner" role="status"><span>{t('updateReady')}</span><div><button onClick={updateApp}>{t('update')}</button><button onClick={() => setUpdateReady(false)}>{t('dismiss')}</button></div></div>}

        <section ref={filesSection} className="files-section" aria-labelledby="selected-heading">
          <div className="section-heading"><div><p className="eyebrow">{t('stepThree')}</p><h2 id="selected-heading">{t('selectedFiles')} ({items.length})</h2></div>
            {items.length > 0 && <div className="section-actions"><div className="batch-actions"><button className="secondary" disabled={!ready} onClick={() => void processAll()}>{t('processAll')}</button><button className="primary" disabled={!finished} onClick={downloadAll}>{t('downloadAll')}</button></div>{finished > 0 && <button className="danger-button clear-processed" onClick={clearProcessed}>{t('clearFinished')}</button>}</div>}
          </div>
          {!items.length && <div className="empty-state"><p>{t('empty')}</p></div>}
          <div className="file-list">
            {items.map((item, index) => (
              <FileCard key={item.id} item={item} index={index} language={language} t={t}
                onRemove={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}
                onRetry={() => void inspect({ ...item, status: 'inspecting' })}
                onProcess={() => void processOne(item)}
                onOptions={(options) => updateItem(item.id, { options })}
                onReplacements={(files) => void selectReplacements(item, files)}
                onToggleMatch={(match, checked) => toggleMatch(item, match, checked)}
                onDownload={() => { if (!item.result) return; triggerDownload(item.result.output, item.result.outputName, 'application/epub+zip'); updateItem(item.id, { downloaded: true }); }}
                onCopy={async () => { await navigator.clipboard.writeText(logText(item)); updateItem(item.id, { copied: true }); setTimeout(() => updateItem(item.id, { copied: false }), 1500); }} />
            ))}
          </div>
        </section>
      </main>

      <footer>
        <p>{t('footer')}</p>
        <p className="copyright">{t('copyright', { year: new Date().getFullYear() })} <a href={GITHUB_URL} target="_blank" rel="noreferrer">Hailong Hao</a></p>
        <p className="acknowledgement"><span className="ack-prefix">{t('inspiredPrefix')}{language === 'en' ? ' ' : null}</span><wbr/><span className="ack-tail"><a href={FACEBOOK_GROUP_URL} target="_blank" rel="noreferrer">{t('inspiredGroup')}</a>{t('inspiredSuffix')}</span></p>
      </footer>

      {settingsOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="modal-title"><h2 id="settings-title">{t('settings')}</h2><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label={t('close')}>×</button></div>
          <div className="settings-privacy"><strong>{t('privacy')}</strong><p>{t('clearDataHelp')}</p></div>
          <button className="danger-button" onClick={() => void clearLocalData()}>{t('clearData')}</button>
        </section>
      </div>}
    </div>
  );
}

function LanguageButtons({ language, label, onChange }: { language: Exclude<Language, 'system'>; label: string; onChange: (language: Language) => void }) {
  const choices = [
    { value: 'en' as const, label: 'EN' },
    { value: 'zh-Hant' as const, label: '繁' },
    { value: 'zh-Hans' as const, label: '简' }
  ];
  return <div className="language-buttons" role="group" aria-label={label} title={label}>
    {choices.map((choice) => <button key={choice.value} type="button" aria-pressed={language === choice.value} onClick={() => onChange(choice.value)}>{choice.label}</button>)}
  </div>;
}

interface CardProps {
  item: FileItem; index: number; language: string; t: ReturnType<typeof translator>;
  onRemove: () => void; onRetry: () => void; onProcess: () => void; onOptions: (options: ProcessOptions) => void;
  onReplacements: (files: FileList | null) => void; onToggleMatch: (match: ImageMatch, checked: boolean) => void; onDownload: () => void; onCopy: () => void;
}

function FileCard({ item, index, language, t, onRemove, onRetry, onProcess, onOptions, onReplacements, onToggleMatch, onDownload, onCopy }: CardProps) {
  const info = item.info;
  const translateWritingMode = (value: BookInfo['writingMode']) => t(value === 'vertical-rl' ? 'verticalRl' : value === 'vertical-lr' ? 'verticalLr' : value === 'horizontal' ? 'horizontal' : 'unknown');
  const translateProgression = (value: BookInfo['progression']) => t(value === 'rtl' ? 'rtl' : value === 'ltr' ? 'ltr' : 'default');
  const canConvertLayout = info?.layout !== 'fixed';
  const expectedWritingMode = info ? (canConvertLayout && item.options.horizontal ? 'horizontal' : canConvertLayout && item.options.vertical ? 'vertical-rl' : info.writingMode) : 'unknown';
  const expectedProgression = info ? (item.options.progression !== 'auto' ? item.options.progression : canConvertLayout && item.options.horizontal ? 'ltr' : expectedWritingMode === 'vertical-rl' ? 'rtl' : info.progression) : 'default';
  const report = item.result?.report;
  const transition = (before: string, after: string) => before === after ? (after || '—') : <span className="attribute-transition" title={t('transitionHint')} aria-label={`${before || '—'}，${t('transitionHint')}，${after || '—'}`}><span aria-hidden="true">{before || '—'}</span><span className="transition-arrow" aria-hidden="true">→</span><strong aria-hidden="true">{after || '—'}</strong></span>;
  const errorMessage = item.error?.code && errorKeys[item.error.code] ? t(errorKeys[item.error.code]) : item.error?.message;
  const reports = item.result?.report.entries ?? [];
  const group = (kind: ReportEntry['kind']) => reports.filter((entry) => entry.kind === kind);
  return <article className={`file-card status-${item.status}`}>
    <div className="card-top">
      <div className="file-number">{String(index + 1).padStart(2, '0')}</div>
      <div className="file-title"><h3>{info?.title || item.file.name}</h3>{info?.author && <p>{info.author}</p>}<span className={`status-pill ${item.status}`}>{t(statusKeys[item.status])}</span></div>
      <button className="icon-button remove-button" onClick={onRemove} aria-label={t('removeFile')}>×</button>
    </div>
    {item.progress && <div className="progress-wrap" aria-live="polite"><div className="progress-label"><span>{t(phaseKeys[item.progress.phase])}</span><span>{item.progress.percent}%</span></div><progress max="100" value={item.progress.percent} /></div>}
    {info && <dl className="book-meta">
      <div><dt>{t('filename')}</dt><dd>{item.file.name}</dd></div><div><dt>{t('version')}</dt><dd>{info.version}</dd></div><div><dt>{t('bookLanguage')}</dt><dd>{transition(report?.languageBefore ?? info.language, report?.languageAfter ?? (item.options.japaneseMode ? 'ja' : info.language))}</dd></div>
      <div><dt>{t('layout')}</dt><dd>{t(info.layout === 'fixed' ? 'fixed' : info.layout === 'reflowable' ? 'reflowable' : 'unknown')}</dd></div><div><dt>{t('writingMode')}</dt><dd>{transition(translateWritingMode(report?.writingModeBefore ?? info.writingMode), translateWritingMode(report?.writingModeAfter ?? expectedWritingMode))}</dd></div><div><dt>{t('progression')}</dt><dd>{transition(translateProgression(report?.progressionBefore ?? info.progression), translateProgression(report?.progressionAfter ?? expectedProgression))}</dd></div><div><dt>{t('size')}</dt><dd>{formatBytes(item.file.size, language)}</dd></div>
    </dl>}
    {errorMessage && <div className="error-box" role="alert"><strong>{t('errorPrefix')}</strong><p>{errorMessage}</p>{item.error?.code && <code>{item.error.code}</code>}</div>}
    {info && !item.result && <section className="card-options" aria-label={t('resourcesAndOutput')}>
      <div className="advanced-grid card-options-grid">
        <fieldset><legend>{t('resources')}</legend><p className="field-heading">{t('replaceImages')}</p><p className="help-text">{t('imagesHelp')}</p><label className="file-button"><span>{t('chooseImages')}</span><input type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple onChange={(event) => onReplacements(event.target.files)} /></label></fieldset>
        <fieldset><legend>{t('output')}</legend><label className="field-label">{t('outputName')}<input type="text" value={item.options.outputName ?? ''} onChange={(event) => onOptions({ ...item.options, outputName: event.target.value })} placeholder={item.file.name.replace(/(?:(?:-fixed|-tweaked))*\.epub$/i, '-tweaked.epub')} /></label><p className="help-text">{t('outputHelp')}</p></fieldset>
      </div>
      {item.matches.length > 0 && <div className="matches"><h4>{t('imageMatches')}</h4>{item.matches.map((match) => {
        const selected = Boolean(item.options.imageMappings[match.replacementName]);
        return <label className={`match-row ${!match.originalPath ? 'no-match' : ''}`} key={match.replacementName}><input type="checkbox" disabled={!match.originalPath} checked={selected} onChange={(event) => onToggleMatch(match, event.target.checked)} /><span><strong>{match.replacementName}</strong><small>{match.originalPath ?? t('noMatch')}</small></span><span className="dimensions">{match.originalWidth && match.originalHeight ? `${match.originalWidth} × ${match.originalHeight}` : '—'} → {match.replacementWidth && match.replacementHeight ? `${match.replacementWidth} × ${match.replacementHeight}` : '—'}</span><span className="confidence">{t('confidence')} {Math.round(match.confidence * 100)}%{match.automatic && <small>{t('automatic')}</small>}</span></label>;
      })}</div>}
    </section>}
    {!item.result && info && <div className="card-actions"><button className="primary" disabled={['processing', 'matching', 'inspecting'].includes(item.status)} onClick={onProcess}>{t('process')}</button>{item.status === 'error' && <button className="secondary" onClick={onRetry}>{t('retry')}</button>}</div>}
    {item.result && <Report item={item} t={t} group={group} onDownload={onDownload} onCopy={onCopy} />}
  </article>;
}

function Report({ item, t, group, onDownload, onCopy }: { item: FileItem; t: ReturnType<typeof translator>; group: (kind: ReportEntry['kind']) => ReportEntry[]; onDownload: () => void; onCopy: () => void }) {
  const repairs = group('repair');
  const renderEntries = (entries: ReportEntry[]) => <ul>{entries.map((entry, index) => <li key={`${entry.rule}-${entry.path}-${index}`}><span>{t(ruleKeys[entry.rule] ?? 'technical')}{entry.count ? ` (${entry.count})` : ''}</span><code>{entry.path}</code>{(entry.before || entry.after) && <small>{t('beforeAfter', { before: entry.before ?? '—', after: entry.after ?? '—' })}</small>}</li>)}</ul>;
  return <section className="report">
    <div className="report-summary"><div className="success-mark" aria-hidden="true">✓</div><div><h4>{item.result!.changed ? t('repairSummary', { count: repairs.length }) : t('statusUnchanged')}</h4><p>{item.result!.changed ? item.result!.outputName : t('noChanges')}</p></div></div>
    {repairs.length > 0 && <div className="report-group"><h5>{t('automaticRepairs')}</h5>{renderEntries(repairs)}</div>}
    {group('tweak').length > 0 && <div className="report-group"><h5>{t('intentionalTweaks')}</h5>{renderEntries(group('tweak'))}</div>}
    {group('visible').length > 0 && <div className="report-group visible"><h5>{t('visibleChanges')}</h5>{renderEntries(group('visible'))}</div>}
    {group('warning').length > 0 && <div className="report-group warning"><h5>{t('warnings')}</h5>{renderEntries(group('warning'))}</div>}
    <div className="card-actions"><button className="primary" onClick={onDownload}>{t(item.downloaded ? 'downloadAgain' : 'download')}</button></div>
    <details className="technical"><summary>{t('technical')}</summary><div className="technical-body"><dl><div><dt>{t('version')}</dt><dd>{item.result!.report.version}</dd></div><div><dt>{t('bookLanguage')}</dt><dd>{item.result!.report.languageBefore || '—'} → {item.result!.report.languageAfter || '—'}</dd></div><div><dt>{t('writingMode')}</dt><dd>{item.result!.report.writingModeBefore} → {item.result!.report.writingModeAfter}</dd></div><div><dt>{t('progression')}</dt><dd>{item.result!.report.progressionBefore} → {item.result!.report.progressionAfter}</dd></div></dl><p className="validation-pass">✓ {t('validationSuccess', { count: item.result!.report.validationChecks.length })}</p><pre>{logText(item)}</pre><button className="secondary" onClick={onCopy}>{item.copied ? t('copied') : t('copyLog')}</button></div></details>
  </section>;
}
