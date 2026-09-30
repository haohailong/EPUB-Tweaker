import type { Language, ResolvedLanguage } from './types';

const en = {
  tagline: 'Repair and fine-tune EPUB files for better e-reader compatibility.',
  language: 'Language', system: 'System Default', english: 'English', traditional: '繁體中文', simplified: '简体中文', sourceCode: 'View source on GitHub',
  stepOne: 'Step One', stepTwo: 'Step Two', stepThree: 'Step Three',
  drop: 'Drop EPUB files here', choose: 'Choose Files', dropHint: 'or use the button below', privacy: 'Files are processed on this device. Nothing is uploaded.',
  selectedFiles: 'Selected files', processAll: 'Process All', downloadAll: 'Download All', clearFinished: 'Clear processed files',
  title: 'Title', author: 'Author', filename: 'Filename', version: 'EPUB version', bookLanguage: 'Language', layout: 'Layout', writingMode: 'Writing mode', progression: 'Page progression', size: 'Size',
  advanced: 'Advanced Options', processingOptions: 'Processing Options', optionsApplyAll: 'These options apply to every unprocessed EPUB.', resourcesAndOutput: 'Resources and output', layoutOptions: 'Layout', preserveLayout: 'Keep original', vertical: 'Horizontal → vertical', horizontalTransform: 'Vertical → horizontal', japanese: 'Japanese mode', japaneseHelp: 'Makes the e-reader treat the book as Japanese. Font and typography options available on the device may change.',
  progressionAuto: 'Auto (recommended)', progressionRtl: 'Right to left', progressionLtr: 'Left to right', resources: 'Resources', replaceImages: 'Replace low-resolution images', chooseImages: 'Choose replacement images', imagesHelp: 'Matching uses dimensions, aspect ratio and perceptual similarity on this device. Filenames do not need to match.',
  output: 'Output', outputName: 'Output filename (optional)', outputHelp: 'A new -tweaked EPUB is downloaded without overwriting the original. The browser controls its save location.', process: 'Process EPUB', remove: 'Remove', download: 'Download EPUB',
  statusInspecting: 'Inspecting', statusReady: 'Ready', statusMatching: 'Matching images', statusProcessing: 'Processing', statusRepaired: 'Repaired', statusUnchanged: 'No changes needed', statusError: 'Error', statusDrm: 'DRM protected',
  phaseOpening: 'Opening EPUB', phaseParsing: 'Parsing EPUB', phaseRepairing: 'Repairing compatibility', phaseNormalizing: 'Normalizing content', phaseRebuilding: 'Rebuilding EPUB', phaseValidating: 'Validating output', phaseDone: 'Complete',
  repairSummary: '{count} compatibility fixes applied', noChanges: 'No compatibility changes were needed. The validated EPUB is ready.', intentionalTweaks: 'Intentional tweaks', warnings: 'Warnings', visibleChanges: 'Visible-content changes', automaticRepairs: 'Automatic repairs',
  technical: 'Technical details', copyLog: 'Copy Log', copied: 'Copied', validation: 'Output validation', beforeAfter: '{before} → {after}',
  validationSuccess: 'All {count} post-processing checks passed.', ruleNavigation: 'Repaired navigation targets', rulePageMap: 'Removed obsolete page-map', ruleStaleEncryption: 'Removed stale encryption metadata', ruleCss: 'Removed incompatible pseudo-element styling', ruleSvg: 'Normalized incompatible SVG titles', ruleRuby: 'Converted incompatible Chinese ruby to parenthetical text', ruleVertical: 'Applied vertical right-to-left layout', ruleHorizontal: 'Converted vertical text to horizontal layout', ruleVerticalSkipped: 'Skipped layout conversion for fixed-layout publication', ruleJapanese: 'Set publication language to Japanese', ruleImage: 'Replaced image with a local high-resolution file', ruleUtf8: 'Normalized text resources to UTF-8', ruleProgression: 'Updated page progression', ruleWritingMode: 'Updated Kindle writing-mode metadata',
  errorInvalid: 'The file is not a valid EPUB archive.', errorContainer: 'META-INF/container.xml is missing.', errorPackage: 'The package document is missing.', errorManifest: 'A referenced manifest resource is missing.', errorSpine: 'A spine reference is invalid.', errorDrm: 'This EPUB contains DRM-protected resources. EPUB Tweaker does not remove DRM.', errorXml: 'An XML resource is malformed and cannot be safely repaired.', errorUnsafe: 'The archive contains an unsafe path.', errorTooLarge: 'The archive exceeds the safe processing limits.', errorValidation: 'The generated EPUB did not pass post-processing validation.',
  imageMatches: 'Image matches', confidence: 'Confidence', original: 'Original', replacement: 'Replacement', automatic: 'Applied automatically', confirm: 'Confirm replacement', noMatch: 'No reliable match found',
  settings: 'Settings', clearData: 'Clear local data', clearDataHelp: 'Clears saved preferences and app caches. It never deletes files on your device.', clearDone: 'Local app data cleared.', close: 'Close',
  updateReady: 'A new version is ready.', update: 'Update now', dismiss: 'Later',
  installHelp: 'Works offline after the app is cached or installed.', empty: 'Add one or more EPUB files to begin.', invalidType: 'Only .epub files can be added.',
  errorPrefix: 'Could not process this EPUB', retry: 'Try again', removeFile: 'Remove file',
  reflowable: 'Reflowable', fixed: 'Fixed layout', unknown: 'Unknown', horizontal: 'Horizontal', verticalRl: 'Vertical, right to left', verticalLr: 'Vertical, left to right', default: 'Default', rtl: 'Right to left', ltr: 'Left to right',
  footer: 'EPUB Tweaker runs entirely in your browser. It does not remove DRM and is not affiliated with or endorsed by Amazon.', copyright: '© {year}', inspiredPrefix: 'Inspired by James Hong from the Facebook group', inspiredGroup: '電子書閱讀器討論區', inspiredSuffix: '.'
};

const zhHant: typeof en = {
  tagline: '修復並微調 EPUB，提升電子閱讀器相容性。',
  language: '語言', system: '跟隨系統', english: 'English', traditional: '繁體中文', simplified: '简体中文', sourceCode: '在 GitHub 查看原始碼',
  stepOne: '第一步', stepTwo: '第二步', stepThree: '第三步',
  drop: '將 EPUB 檔案拖到這裡', choose: '選擇檔案', dropHint: '或使用下方按鈕', privacy: '檔案只在此裝置上處理，不會上傳。',
  selectedFiles: '已選檔案', processAll: '全部處理', downloadAll: '全部下載', clearFinished: '清理已處理檔案',
  title: '書名', author: '作者', filename: '檔名', version: 'EPUB 版本', bookLanguage: '語言', layout: '版面', writingMode: '書寫模式', progression: '翻頁方向', size: '大小',
  advanced: '進階選項', processingOptions: '處理選項', optionsApplyAll: '以下選項會套用到所有尚未處理的 EPUB。', resourcesAndOutput: '資源與輸出', layoutOptions: '版面', preserveLayout: '保留原版面', vertical: '橫排 → 直排', horizontalTransform: '直排 → 橫排', japanese: '日文模式', japaneseHelp: '讓電子閱讀器將本書視為日文書。裝置上的字型與排版選項可能改變。',
  progressionAuto: '自動（建議）', progressionRtl: '由右至左', progressionLtr: '由左至右', resources: '資源', replaceImages: '替換低解析度圖片', chooseImages: '選擇替換圖片', imagesHelp: '只在此裝置上以尺寸、長寬比與感知相似度配對；檔名無需相同。',
  output: '輸出', outputName: '輸出檔名（選填）', outputHelp: '會下載新的 -tweaked EPUB，不會覆蓋原檔；儲存位置由瀏覽器決定。', process: '處理 EPUB', remove: '移除', download: '下載 EPUB',
  statusInspecting: '正在檢查', statusReady: '就緒', statusMatching: '正在配對圖片', statusProcessing: '正在處理', statusRepaired: '已修復', statusUnchanged: '無需修改', statusError: '錯誤', statusDrm: '受 DRM 保護',
  phaseOpening: '正在開啟 EPUB', phaseParsing: '正在解析 EPUB', phaseRepairing: '正在修復相容性', phaseNormalizing: '正在正規化內容', phaseRebuilding: '正在重建 EPUB', phaseValidating: '正在驗證輸出', phaseDone: '完成',
  repairSummary: '已套用 {count} 項相容性修復', noChanges: '不需要相容性修改；已驗證的 EPUB 可以下載。', intentionalTweaks: '刻意調整', warnings: '警告', visibleChanges: '可見內容變更', automaticRepairs: '自動修復',
  technical: '技術細節', copyLog: '複製記錄', copied: '已複製', validation: '輸出驗證', beforeAfter: '{before} → {after}',
  validationSuccess: '已通過全部 {count} 項後處理驗證。', ruleNavigation: '修復導覽目標', rulePageMap: '移除過時 page-map', ruleStaleEncryption: '移除失效的加密中繼資料', ruleCss: '移除不相容的偽元素樣式', ruleSvg: '正規化不相容的 SVG 標題', ruleRuby: '將不相容的中文注音轉為括號文字', ruleVertical: '套用由右至左的直排版面', ruleHorizontal: '將直排文字轉為橫排版面', ruleVerticalSkipped: '固定版面出版物已略過版面轉換', ruleJapanese: '將出版語言設為日文', ruleImage: '以本機高解析度檔案替換圖片', ruleUtf8: '將文字資源正規化為 UTF-8', ruleProgression: '更新翻頁方向', ruleWritingMode: '更新 Kindle 書寫模式中繼資料',
  errorInvalid: '檔案不是有效的 EPUB 封裝。', errorContainer: '缺少 META-INF/container.xml。', errorPackage: '缺少書籍套件文件。', errorManifest: '找不到清單所參照的資源。', errorSpine: '閱讀順序參照無效。', errorDrm: '此 EPUB 含有受 DRM 保護的資源。EPUB Tweaker 不會移除 DRM。', errorXml: 'XML 資源格式錯誤，無法安全修復。', errorUnsafe: '壓縮檔含有不安全的路徑。', errorTooLarge: '壓縮檔超出安全處理上限。', errorValidation: '產生的 EPUB 未通過後處理驗證。',
  imageMatches: '圖片配對', confidence: '信心度', original: '原圖', replacement: '替換圖', automatic: '自動套用', confirm: '確認替換', noMatch: '找不到可靠配對',
  settings: '設定', clearData: '清除本機資料', clearDataHelp: '清除已儲存偏好與 App 快取，不會刪除裝置上的檔案。', clearDone: '已清除本機 App 資料。', close: '關閉',
  updateReady: '新版本已可使用。', update: '立即更新', dismiss: '稍後',
  installHelp: 'App 快取或安裝後可離線使用。', empty: '加入一個或多個 EPUB 檔案即可開始。', invalidType: '只能加入 .epub 檔案。',
  errorPrefix: '無法處理此 EPUB', retry: '重試', removeFile: '移除檔案',
  reflowable: '可重排', fixed: '固定版面', unknown: '未知', horizontal: '橫排', verticalRl: '直排，由右至左', verticalLr: '直排，由左至右', default: '預設', rtl: '由右至左', ltr: '由左至右',
  footer: 'EPUB Tweaker 完全在瀏覽器中運作，不會移除 DRM，亦不隸屬於 Amazon 或獲其認可。', copyright: '© {year}', inspiredPrefix: '靈感來自 Facebook 群組', inspiredGroup: '電子書閱讀器討論區', inspiredSuffix: '的 James Hong 兄。'
};

const zhHans: typeof en = {
  tagline: '修复并微调 EPUB，提升电子阅读器兼容性。',
  language: '语言', system: '跟随系统', english: 'English', traditional: '繁體中文', simplified: '简体中文', sourceCode: '在 GitHub 查看源代码',
  stepOne: '第一步', stepTwo: '第二步', stepThree: '第三步',
  drop: '将 EPUB 文件拖到这里', choose: '选择文件', dropHint: '或使用下方按钮', privacy: '文件只在此设备上处理，不会上传。',
  selectedFiles: '已选文件', processAll: '全部处理', downloadAll: '全部下载', clearFinished: '清理已处理文件',
  title: '书名', author: '作者', filename: '文件名', version: 'EPUB 版本', bookLanguage: '语言', layout: '版式', writingMode: '书写模式', progression: '翻页方向', size: '大小',
  advanced: '高级选项', processingOptions: '处理选项', optionsApplyAll: '以下选项会应用到所有尚未处理的 EPUB。', resourcesAndOutput: '资源与输出', layoutOptions: '版式', preserveLayout: '保留原版式', vertical: '横排 → 竖排', horizontalTransform: '竖排 → 横排', japanese: '日文模式', japaneseHelp: '让电子阅读器将本书视为日文书。设备上的字体与排版选项可能改变。',
  progressionAuto: '自动（推荐）', progressionRtl: '从右到左', progressionLtr: '从左到右', resources: '资源', replaceImages: '替换低分辨率图片', chooseImages: '选择替换图片', imagesHelp: '只在此设备上按尺寸、宽高比和感知相似度匹配；文件名无需相同。',
  output: '输出', outputName: '输出文件名（可选）', outputHelp: '会下载新的 -tweaked EPUB，不会覆盖原文件；保存位置由浏览器决定。', process: '处理 EPUB', remove: '移除', download: '下载 EPUB',
  statusInspecting: '正在检查', statusReady: '就绪', statusMatching: '正在匹配图片', statusProcessing: '正在处理', statusRepaired: '已修复', statusUnchanged: '无需修改', statusError: '错误', statusDrm: '受 DRM 保护',
  phaseOpening: '正在打开 EPUB', phaseParsing: '正在解析 EPUB', phaseRepairing: '正在修复兼容性', phaseNormalizing: '正在规范化内容', phaseRebuilding: '正在重建 EPUB', phaseValidating: '正在验证输出', phaseDone: '完成',
  repairSummary: '已应用 {count} 项兼容性修复', noChanges: '不需要兼容性修改；已验证的 EPUB 可以下载。', intentionalTweaks: '主动调整', warnings: '警告', visibleChanges: '可见内容变更', automaticRepairs: '自动修复',
  technical: '技术细节', copyLog: '复制日志', copied: '已复制', validation: '输出验证', beforeAfter: '{before} → {after}',
  validationSuccess: '已通过全部 {count} 项后处理验证。', ruleNavigation: '修复导航目标', rulePageMap: '移除过时 page-map', ruleStaleEncryption: '移除失效的加密元数据', ruleCss: '移除不兼容的伪元素样式', ruleSvg: '规范化不兼容的 SVG 标题', ruleRuby: '将不兼容的中文注音转为括号文字', ruleVertical: '应用从右到左的竖排版式', ruleHorizontal: '将竖排文字转换为横排版式', ruleVerticalSkipped: '固定版式出版物已跳过版式转换', ruleJapanese: '将出版语言设为日文', ruleImage: '用本地高分辨率文件替换图片', ruleUtf8: '将文字资源规范化为 UTF-8', ruleProgression: '更新翻页方向', ruleWritingMode: '更新 Kindle 书写模式元数据',
  errorInvalid: '文件不是有效的 EPUB 封装。', errorContainer: '缺少 META-INF/container.xml。', errorPackage: '缺少书籍包文件。', errorManifest: '找不到清单所引用的资源。', errorSpine: '阅读顺序引用无效。', errorDrm: '此 EPUB 含有受 DRM 保护的资源。EPUB Tweaker 不会移除 DRM。', errorXml: 'XML 资源格式错误，无法安全修复。', errorUnsafe: '压缩包中含有不安全的路径。', errorTooLarge: '压缩包超出安全处理上限。', errorValidation: '生成的 EPUB 未通过后处理验证。',
  imageMatches: '图片匹配', confidence: '置信度', original: '原图', replacement: '替换图', automatic: '自动应用', confirm: '确认替换', noMatch: '未找到可靠匹配',
  settings: '设置', clearData: '清除本地数据', clearDataHelp: '清除已保存的偏好与 App 缓存，不会删除设备上的文件。', clearDone: '已清除本地 App 数据。', close: '关闭',
  updateReady: '新版本已可使用。', update: '立即更新', dismiss: '稍后',
  installHelp: 'App 缓存或安装后可离线使用。', empty: '添加一个或多个 EPUB 文件即可开始。', invalidType: '只能添加 .epub 文件。',
  errorPrefix: '无法处理此 EPUB', retry: '重试', removeFile: '移除文件',
  reflowable: '可重排', fixed: '固定版式', unknown: '未知', horizontal: '横排', verticalRl: '竖排，从右到左', verticalLr: '竖排，从左到右', default: '默认', rtl: '从右到左', ltr: '从左到右',
  footer: 'EPUB Tweaker 完全在浏览器中运行，不会移除 DRM，也不隶属于 Amazon 或受其认可。', copyright: '© {year}', inspiredPrefix: '灵感来自 Facebook 群组', inspiredGroup: '電子書閱讀器討論區', inspiredSuffix: '的 James Hong 兄。'
};

const resources: Record<ResolvedLanguage, typeof en> = { en, 'zh-Hant': zhHant, 'zh-Hans': zhHans };
export type TranslationKey = keyof typeof en;

export function resolveLanguage(choice: Language): ResolvedLanguage {
  if (choice !== 'system') return choice;
  const languages = typeof navigator === 'undefined' ? ['en'] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const value of languages) {
    const normalized = value.toLowerCase();
    if (/^zh-(tw|hk|mo|hant)/.test(normalized) || normalized.includes('hant')) return 'zh-Hant';
    if (/^zh-(cn|sg|hans)/.test(normalized) || normalized.includes('hans') || normalized === 'zh') return 'zh-Hans';
  }
  return 'en';
}

export function translator(language: ResolvedLanguage) {
  return (key: TranslationKey, values?: Record<string, string | number>): string => {
    let text = resources[language][key] || resources.en[key];
    if (values) for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value));
    return text;
  };
}
