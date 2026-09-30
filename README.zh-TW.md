# EPUB Tweaker

<p align="center">
  <img src="public/icon.svg" width="104" height="104" alt="EPUB Tweaker 圖示">
</p>

<p align="center">
  <strong>修復並微調 EPUB，提升電子閱讀器相容性。</strong><br>
  <sub>也可修復可能導致 Send to Kindle 拒收書籍，或將書籍保留為固定版面的已知 EPUB 問題。</sub>
</p>

<p align="center">
  <a href="README.md">English</a> · 繁體中文 · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://epub-tweaker.olo.la/"><strong>開啟網頁版</strong></a>
  · <a href="https://github.com/haohailong/EPUB-Tweaker/issues">回報問題</a>
  · <a href="LICENSE">MIT License</a>
</p>

EPUB Tweaker 是一款重視隱私的漸進式網頁應用程式（PWA），可檢查、修復及調整 EPUB 2 與 EPUB 3 電子書。所有處理都在瀏覽器內完成：檔案不會上傳、不需要帳號；應用程式完成快取或安裝後，也能離線運作。

> EPUB Tweaker 不會移除或繞過 DRM，亦不隸屬於 Amazon 或獲其認可。

## 為什麼使用 EPUB Tweaker？

有些 EPUB 在一般閱讀器中可以正常開啟，卻可能在 Send to Kindle 轉檔時失敗、失去可調整字級的能力、使用錯誤的翻頁方向，或帶有舊製作工具遺留的過時資料。EPUB Tweaker 會進行保守且可說明的修復，並在提供下載前重新驗證輸出檔案。

它特別適合：

- 修復已知的 Send to Kindle 相容性問題，包括數種可能引發 E016 的原因；
- 將橫排轉為直排，或將直排轉為橫排；
- 設定自動、由右至左或由左至右的翻頁方向；
- 以橫排轉換或選用「日文模式」，準備要傳送至 Kindle 的直排繁體中文書籍；
- 清理過時的 `page-map`、Adobe 加密殘留、不相容的 SVG 標題及特定 CSS 問題；
- 在不上傳書籍的情況下檢查 EPUB，並取得容易閱讀的技術報告。

## 使用方法

1. 使用新式瀏覽器開啟 [EPUB Tweaker](https://epub-tweaker.olo.la/)。
2. 選擇版式、日文模式及翻頁方向。預設會保留書籍原本的版式及有效翻頁方向。
3. 將一個或多個 `.epub` 檔案拖入頁面，或按下「選擇檔案」。
4. 查看每本書偵測到的書名、EPUB 版本、語言、版式及翻頁方向；畫面亦會顯示處理後的預期狀態。
5. 如有需要，可在書籍卡片中選擇本機替換圖片，或修改輸出檔名。
6. 按下「處理 EPUB」；批次處理時可使用「全部處理」。
7. 查看修復報告並下載新的 `-tweaked.epub` 檔案。原始檔案永遠不會被覆寫。

處理大型書籍時請保持頁面開啟。所有工作都只在目前裝置上進行。

## 主要功能

- 自動辨識及檢查 EPUB 2.x／3.x，輸出時保留原主要版本
- 使用 Web Worker 處理，避免大型壓縮檔阻塞介面
- 防範 ZIP 路徑穿越，並限制單一項目、壓縮及解壓後大小
- 產生符合規範的 EPUB ZIP：第一個項目為完全正確且未壓縮的 `mimetype`
- 以結構化方式處理 XML、XHTML、SVG 及 CSS，而非僅依賴正規表示式
- 修復 EPUB 2 NCX 與 EPUB 3 Navigation Document 的錨點
- 緩解與語言、SVG 封面、固定畫布及跨頁提示相關的已知 Send to Kindle E016 問題
- 支援橫排轉直排及直排轉橫排
- 支援自動、RTL、LTR 翻頁方向；轉為橫排時預設為 LTR
- 可獨立啟用日文模式，測試 Kindle 相容性
- 轉換有結構問題的中文注音標記（ruby），並保留日文 ruby
- 依尺寸、長寬比及感知雜湊，在本機比對高解析度替換圖片
- 偵測 DRM 但不規避；保留支援的字型混淆機制
- 批次處理並將多本輸出書籍下載為 ZIP
- 英文、繁體中文及簡體中文介面
- 跟隨系統明暗模式、支援鍵盤操作及減少動態效果
- 可安裝的 PWA、離線應用程式外殼及版本更新提示
- 輸出前強制驗證，並提供可複製的修復報告

## 處理選項

### 保留原版式

保留目前的書寫模式與有效翻頁方向，但仍會執行相容性修復及驗證。

### 橫排 → 直排

為可重排內容加入專用的 `vertical-rl` 樣式表，不會把出版品改成固定版面。當翻頁方向設為「自動」時，EPUB 3 會使用 RTL；EPUB 2 則會加入相容的書寫模式中繼資料。

### 直排 → 橫排

加入最後套用的 `horizontal-tb` 覆寫，同時保留文件結構、連結、圖片、ruby 及導覽。使用「自動」時，輸出會明確採用 LTR 翻頁方向。固定版面的出版品不會被轉換。

### 日文模式

將出版品的主要語言改為 `ja`，並維護相容的書寫模式中繼資料。它本身不會啟用直排。由於 Amazon 的繁體中文轉換路徑僅支援橫排 LTR，此模式可能讓 Kindle 將書籍視為支援直排 RTL 的日文書；但裝置所選用的字型及排版選項也可能隨之改變。

若希望繁體中文書籍獲得最保守的 Send to Kindle 相容性，建議使用「直排 → 橫排」。只有在保留直排比語言中繼資料更重要時，才將日文模式視為相容性替代方案。

### 翻頁方向

- **自動：**直排且由右至左的內容會使用 RTL；其他情況則保留原有的有效方向。
- **由右至左／由左至右：**明確覆寫自動判斷。

程式不會只根據語言來推斷翻頁方向。

## 輸出與隱私

預設輸出檔名為 `原檔名-tweaked.epub`。既有的 `-fixed` 與 `-tweaked` 後綴會先被正規化，避免重複處理後不斷疊加後綴。

一般瀏覽器 PWA 未取得明確檔案系統權限時，不能直接把檔案寫入原檔案旁，因此輸出會進入瀏覽器設定的下載位置或顯示儲存提示。原始 EPUB 永遠不會被覆寫。

本專案沒有後端、登入、分析端點、遙測或遠端書籍素材下載。程式不會執行 EPUB 內的腳本、不會把書籍標記插入應用程式 DOM，也不會自動開啟書中外部連結。

## DRM 政策

EPUB Tweaker 不會移除或繞過 DRM。偵測到加密內容資源時，處理會以 `DRM_PROTECTED` 停止。標準 IDPF／Adobe 字型混淆會被保留。只有當所有被引用的資源都能正常讀取，且列出的 Adobe 方法確定只是失效殘留時，才會移除加密描述檔。

## 驗證與限制

每個輸出檔案都會重新開啟，並檢查 ZIP 結構、container 與 package 文件、manifest／spine 完整性、導覽目標、XML／XHTML／SVG／CSS 語法、內部連結與片段，以及 UTF-8 序列化的一致性。

此驗證器不是 Amazon 的私有轉換引擎，也不能取代 Kindle Previewer 或 EPUBCheck。EPUB Tweaker 能修復已知問題並驗證自己的 Kindle 安全設定檔，但任何第三方應用程式都無法保證所有檔案一定會被 Send to Kindle 接受。

目前其他限制包括：

- 不會猜測有歧義的遺失引用或嚴重損壞的 XML，而會將問題列入報告；
- 不會把固定版面出版品轉成可重排電子書；
- 瀏覽器不支援感知畫布 API 時，相似圖片可能需要手動確認；
- 為保護行動瀏覽器，壓縮檔上限為 200 MB、單一項目 100 MB、解壓後總計 600 MB；
- 字型混淆會被保留，目前不會修改已混淆的字型。

## 支援的瀏覽器

- iPhone、iPad 及 macOS 上的新式 Safari，包括已安裝的 PWA 模式
- 新式 Chromium 系瀏覽器
- 具備 Worker、Blob 及足夠 ZIP 記憶體的新式 Firefox

桌面版支援拖放檔案。File System Access API 並非必要，因此 Safari 及 iOS 亦可使用。

## 本機開發

需要 Node.js 20 或更新版本。

```bash
git clone https://github.com/haohailong/EPUB-Tweaker.git
cd EPUB-Tweaker
npm install
npm run dev
```

Vite 會顯示本機網址，通常是 `http://localhost:5173`，在瀏覽器開啟即可。

執行自動化測試：

```bash
npm test
```

建立並預覽正式版本：

```bash
npm run build
npm run preview
```

正式輸出位於 `dist/`。

## 部署至 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhaohailong%2FEPUB-Tweaker)

儲存庫已包含 `vercel.json`，不需要環境變數或後端服務。

1. 在 Vercel 新增專案並匯入 `haohailong/EPUB-Tweaker`。
2. 保留自動偵測到的 Vite 建置設定。
3. 執行部署。之後推送至 `main` 會建立正式部署，Pull Request 則可建立預覽版本。

若使用其他靜態 HTTPS 主機，請發布 `dist/`。預設 Service Worker 範圍假設應用程式部署在網域根目錄。

## 架構

```text
React 使用者介面
  └─ Web Worker
      ├─ 受防護的 ZIP 讀取器
      ├─ container 與 package 解析器
      ├─ EPUB 2／EPUB 3 版本邊界
      ├─ 統一 BookModel
      ├─ 共用及版本專屬修復規則
      ├─ 可重現的 ZIP 序列化器
      └─ 處理後驗證器
```

本專案使用 `@xmldom/xmldom` 處理結構化文件、`css-tree` 處理 CSS、`fflate` 讀寫 ZIP。測試會在記憶體中產生可自由散布的 EPUB 樣本，不包含任何商業書籍。

## 技術參考

- [W3C EPUB 3.3](https://www.w3.org/TR/epub-33/)
- [Amazon Kindle 出版指南](https://kdp.amazon.com/en_US/help/topic/GU72M65VRFPH43L6)
- [Amazon 導覽指南](https://kdp.amazon.com/en_US/help/topic/GY3AD8C6C6GAG42N)
- [Amazon 繁體中文出版限制](https://kdp.amazon.com/en_US/help/topic/G27T64E65VM6JWKK)

## 授權條款

EPUB Tweaker 是依 [MIT License](LICENSE) 發布的開放原始碼軟體。只要遵守授權條款，即可使用、複製、修改、合併、發布、散布、再授權及銷售軟體副本。

## 作者與致意

作者：[Hailong Hao](https://github.com/haohailong)。靈感來自 Facebook 群組[電子書閱讀器討論區](https://www.facebook.com/groups/ereaderfamily)的 James Hong 兄。
