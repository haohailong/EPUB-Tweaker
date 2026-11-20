import type { BookInfo, ProcessOptions } from '../types';

export function outputFilename(input: string, info: Pick<BookInfo, 'layout' | 'writingMode' | 'progression' | 'language'>, options: ProcessOptions): string {
  if (options.outputName?.trim()) {
    const safe = options.outputName.trim().replace(/[\\/:*?"<>|\0]/g, '-');
    return safe.toLowerCase().endsWith('.epub') ? safe : `${safe}.epub`;
  }
  const english = options.outputLanguage === 'en';
  const mode = info.layout === 'fixed' ? (english ? 'Fixed' : '固定版面')
    : info.writingMode === 'horizontal' ? (english ? 'Horizontal' : options.outputLanguage === 'zh-Hant' ? '橫排' : '横排')
      : info.writingMode.startsWith('vertical') ? (english ? 'Vertical' : '直排') : (english ? 'Unknown' : '版式未知');
  const direction = info.progression !== 'default' ? info.progression.toUpperCase()
    : info.writingMode === 'vertical-rl' ? 'RTL' : info.writingMode === 'horizontal' || info.writingMode === 'vertical-lr' ? 'LTR' : 'AUTO';
  const language = (info.language || 'UND').toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'UND';
  const base = input.replace(/\.epub$/i, '').replace(/(?:(?:-fixed|-tweaked)|-(?:Horizontal|Vertical|Fixed|Unknown|横排|橫排|直排|竖排|固定版面|版式未知)-(?:LTR|RTL|AUTO)-[A-Z]{2,3}(?:-[A-Z0-9]{2,8})*)+$/gi, '');
  return `${base}-${mode}-${direction}-${language}.epub`;
}
