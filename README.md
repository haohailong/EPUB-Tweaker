# EPUB Tweaker

<p align="center">
  <img src="public/icon.svg" width="104" height="104" alt="EPUB Tweaker icon">
</p>

<p align="center">
  <strong>Repair and fine-tune EPUB files for better e-reader compatibility.</strong><br>
  <sub>Also fixes known EPUB problems that can cause Send to Kindle to reject a book or preserve it as a fixed-layout document.</sub>
</p>

<p align="center">
  English · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://epub-tweaker.olo.la/"><strong>Open the web app</strong></a>
  · <a href="https://github.com/haohailong/EPUB-Tweaker/issues">Report an issue</a>
</p>

EPUB Tweaker is a privacy-first Progressive Web App for inspecting, repairing, and adjusting EPUB 2 and EPUB 3 books. It runs entirely in the browser: books are not uploaded, no account is required, and the app can work offline after it has been cached or installed.

> EPUB Tweaker does not remove or bypass DRM. It is not affiliated with or endorsed by Amazon.

## Why use it?

EPUB files that open normally in one reader can still fail during Send to Kindle conversion, lose adjustable text, use the wrong page direction, or contain obsolete metadata left by older authoring tools. EPUB Tweaker applies conservative, explainable repairs and validates the rebuilt file before making it available for download.

It is especially useful for:

- repairing known Send to Kindle compatibility problems, including several causes related to error E016;
- converting horizontal text to vertical text, or vertical text to horizontal text;
- setting automatic, right-to-left, or left-to-right page progression;
- preparing vertical Traditional Chinese books for Kindle with either horizontal conversion or the optional Japanese Mode workaround;
- cleaning obsolete `page-map` data, stale Adobe encryption residue, incompatible SVG titles, and selected CSS problems;
- checking an EPUB and receiving a readable technical report without uploading the book.

## How to use

1. Open [EPUB Tweaker](https://epub-tweaker.olo.la/) in a current browser.
2. Choose the layout, Japanese Mode, and page-progression options. The defaults preserve the book’s existing layout and valid progression.
3. Drag one or more `.epub` files onto the page, or select **Choose Files**.
4. Review each book’s detected title, EPUB version, language, layout, and page direction, including the expected state after processing.
5. If needed, choose local replacement images or change the output filename on the book card.
6. Select **Process EPUB**, or use **Process All** for a batch.
7. Review the repair report and download the resulting `-tweaked.epub` file. The source file is never overwritten.

Keep the page open while a large book is being processed. All work happens on the device.

## Main features

- EPUB 2.x and EPUB 3.x detection, inspection, and version-preserving output
- Web Worker processing to keep the interface responsive
- Guarded ZIP reading with path-traversal and archive-size limits
- Standards-compliant EPUB ZIP output with an exact, uncompressed first `mimetype` entry
- Structured XML/XHTML/SVG and CSS processing instead of regex-only rewriting
- EPUB 2 NCX and EPUB 3 Navigation Document anchor repair
- Send to Kindle E016 mitigation for known language, SVG cover, fixed-canvas, and spread-hint problems
- Horizontal → vertical and vertical → horizontal layout conversion
- Auto, RTL, and LTR page progression; horizontal conversion defaults to LTR
- Independent Japanese Mode for Kindle compatibility experiments
- Chinese ruby compatibility conversion while preserving Japanese ruby
- Local high-resolution image replacement with dimension, aspect-ratio, and perceptual matching
- DRM detection without circumvention; supported font obfuscation is preserved
- Batch processing and ZIP download
- English, Traditional Chinese, and Simplified Chinese interface
- Light/dark system appearance, keyboard access, and reduced-motion support
- Installable PWA with offline app shell and update notification
- Mandatory post-processing validation and a copyable repair report

## Processing options

### Keep original

Preserves the current writing mode and uses the existing valid page progression. Compatibility repairs and validation still run.

### Horizontal → vertical

Adds a dedicated `vertical-rl` stylesheet to reflowable content without turning the publication into fixed layout. With page progression set to **Auto**, EPUB 3 receives RTL progression and EPUB 2 receives compatible writing-mode metadata.

### Vertical → horizontal

Adds a late `horizontal-tb` override while retaining the document structure, links, images, ruby, and navigation. With **Auto**, the output explicitly uses LTR page progression. Fixed-layout publications are not transformed.

### Japanese Mode

Changes the publication’s primary language to `ja` and maintains compatible writing-mode metadata. It does not enable vertical layout by itself. This can help Kindle honor a vertical RTL book because Amazon’s Traditional Chinese conversion path supports only horizontal LTR, but it may also change the fonts and typography selected by the device.

For the most conservative Send to Kindle result with Traditional Chinese, use **Vertical → horizontal**. Japanese Mode is an optional compatibility workaround when preserving vertical layout matters more.

### Page progression

- **Auto:** vertical right-to-left content becomes RTL; otherwise an existing valid direction is preserved.
- **Right to left / Left to right:** explicitly overrides Auto.

Language alone is never treated as proof of page direction.

## Output and privacy

The default output name is `Original Name-tweaked.epub`. Existing `-fixed` and `-tweaked` suffixes are normalized so repeated processing does not stack suffixes.

A browser PWA cannot normally write beside the source file without explicit file-system permission, so downloads go to the browser’s configured download folder or save prompt. The original EPUB is never overwritten.

There is no backend, login, analytics endpoint, telemetry, or remote book-asset fetch. EPUB scripts are never executed, book markup is never inserted into the application DOM, and external references inside a book are not followed automatically.

## DRM policy

EPUB Tweaker does not remove or bypass DRM. Processing stops with `DRM_PROTECTED` when encrypted content is detected. Standard IDPF/Adobe font obfuscation is preserved. An encryption descriptor is removed only when all referenced resources are readable and the listed Adobe method is demonstrably stale residue.

## Validation and limitations

Every generated book is reopened and checked for ZIP structure, container and package validity, manifest/spine integrity, navigation targets, parseable XML/XHTML/SVG/CSS, internal links and fragments, and consistent UTF-8 serialization.

This validator is not Amazon’s private conversion engine and does not replace Kindle Previewer or EPUBCheck. EPUB Tweaker repairs known problems and validates its own Kindle-safe profile, but no third-party app can guarantee that every file will be accepted by Send to Kindle.

Other current limits:

- ambiguous missing references and severely malformed XML are reported rather than guessed;
- fixed-layout publications are not converted into reflowable books;
- similar images may require manual matching when perceptual canvas APIs are unavailable;
- books are limited to 200 MB compressed, 100 MB per entry, and 600 MB expanded to protect mobile browsers;
- obfuscated fonts are preserved and are not modified.

## Supported browsers

- Current Safari on iPhone, iPad, and macOS, including installed PWA mode
- Current Chromium-based browsers
- Current Firefox where Worker, Blob, and sufficient ZIP-memory support are available

Desktop drag-and-drop is supported. The File System Access API is optional and is not required on Safari or iOS.

## Local development

Node.js 20 or newer is required.

```bash
git clone https://github.com/haohailong/EPUB-Tweaker.git
cd EPUB-Tweaker
npm install
npm run dev
```

Vite prints the local address, normally `http://localhost:5173`. Open it in a browser.

Run the automated test suite:

```bash
npm test
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

The production output is written to `dist/`.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhaohailong%2FEPUB-Tweaker)

The repository includes `vercel.json`; no environment variables or backend services are required.

1. Import `haohailong/EPUB-Tweaker` as a new Vercel project.
2. Keep the detected Vite build settings.
3. Deploy. Future pushes to `main` will create production deployments, and pull requests can receive previews.

For another static HTTPS host, publish `dist/`. The default service-worker scope assumes the app is hosted at the domain root.

## Architecture

```text
React UI
  └─ Web Worker
      ├─ guarded ZIP reader
      ├─ container and package parser
      ├─ EPUB 2 / EPUB 3 boundaries
      ├─ unified BookModel
      ├─ common and version-aware repair rules
      ├─ deterministic ZIP serializer
      └─ post-processing validator
```

The implementation uses `@xmldom/xmldom` for structured documents, `css-tree` for CSS, and `fflate` for ZIP input/output. Tests create redistributable EPUB fixtures in memory; no commercial books are included.

## Technical references

- [W3C EPUB 3.3](https://www.w3.org/TR/epub-33/)
- [Amazon Kindle Publishing Guidelines](https://kdp.amazon.com/en_US/help/topic/GU72M65VRFPH43L6)
- [Amazon navigation guidance](https://kdp.amazon.com/en_US/help/topic/GY3AD8C6C6GAG42N)
- [Amazon Traditional Chinese publishing limitations](https://kdp.amazon.com/en_US/help/topic/G27T64E65VM6JWKK)

## Author and acknowledgement

Created by [Hailong Hao](https://github.com/haohailong). Inspired by James Hong from the Facebook group [電子書閱讀器討論區](https://www.facebook.com/groups/ereaderfamily).
