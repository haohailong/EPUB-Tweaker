# EPUB Tweaker

<p align="center">
  <img src="public/icon.svg" width="96" height="96" alt="EPUB Tweaker icon">
</p>

[Source code](https://github.com/haohailong/EPUB-Tweaker) · [Report an issue](https://github.com/haohailong/EPUB-Tweaker/issues)

EPUB Tweaker is a privacy-first Progressive Web App that repairs known EPUB compatibility problems and optionally fine-tunes presentation while preserving the input EPUB major version. Its first compatibility profile targets Send to Kindle ingestion, but the parser, unified book model, rule engine, and validator are separated so other profiles can be added later.

**Files are processed on this device. Nothing is uploaded.** There is no backend, account, analytics endpoint, telemetry, or remote book-asset fetch. After the app shell has been cached, processing works offline.

EPUB Tweaker is not affiliated with or endorsed by Amazon.

## How to use

1. Open EPUB Tweaker in a current browser.
2. Choose the layout, Japanese Mode, and page-progression options you want. The default keeps the original layout and progression.
3. Drag one or more `.epub` files onto the page, or select **Choose Files**.
4. Review the detected title, EPUB version, language, layout, and progression.
5. Optionally select local high-resolution replacement images or customize the output name on a book card.
6. Select **Process EPUB** for one book or **Process All** for a batch.
7. Review the repair report, then download the new `-tweaked.epub` file. The original file is never overwritten.

All processing stays inside the browser. Do not close or reload the page while a large book is being processed.

## Features

- EPUB 2.x and EPUB 3.x inspection with automatic version detection
- Version-preserving output (EPUB 2 remains EPUB 2; EPUB 3 remains EPUB 3)
- Browser Web Worker processing so large archives do not block the interface
- ZIP path traversal, entry-size, compressed-size, and expanded-size safeguards
- Correct EPUB ZIP output: `mimetype` is first, exact, and stored uncompressed
- UTF-8 normalization through structured XML parsing and serialization
- EPUB 2 NCX and EPUB 3 Navigation Document body-anchor repair
- Send to Kindle E016 mitigation for optional language attributes, image-only fixed-canvas SVG cover pages, and fixed-page spread hints inside otherwise reflowable EPUBs
- Obsolete `page-map`, stale Adobe encryption residue, incompatible SVG-title, and specific pseudo-element `box-shadow` cleanup
- DRM detection without circumvention; standard IDPF/Adobe font obfuscation is preserved
- Compatibility conversion for structurally problematic Chinese ruby; Japanese ruby is preserved
- Explicit horizontal-to-`vertical-rl` and vertical-to-horizontal transformations
- Standards-compatible `writing-mode` declarations added alongside legacy EPUB/WebKit-prefixed CSS
- Auto, RTL, and LTR page progression controls; vertical Auto explicitly produces RTL and horizontal conversion defaults to LTR
- Independent Japanese Mode
- Local image replacement matching using dimensions, aspect ratio, and perceptual hashing when browser canvas APIs are available
- Batch processing and ZIP download for multiple output EPUBs
- English, Traditional Chinese, and Simplified Chinese UI
- System light/dark mode, keyboard-accessible controls, reduced-motion support
- Installable PWA with an offline application shell and update prompt
- Human-readable and copyable technical reports
- Mandatory post-processing validation before any output is offered as successful

## Architecture

```text
React UI
  └─ Web Worker
      ├─ guarded ZIP reader
      ├─ container + package parser
      ├─ EPUB 2 / EPUB 3 boundaries
      ├─ unified BookModel
      ├─ common + version-aware repairs
      ├─ deterministic ZIP serializer
      └─ post-processing validator
```

XML, XHTML, OPF, NCX, navigation documents, and SVG are parsed as structured documents with `@xmldom/xmldom`. CSS is parsed with `css-tree`; repair rules do not use regex-only CSS editing. `fflate` provides ZIP read/write support.

The worker never evaluates scripts from an EPUB, the UI never inserts book markup into the application DOM, and external references in books are never followed automatically.

## Processing options

Layout, Japanese Mode, and page progression controls are always visible on the home screen and apply to every unprocessed book. Per-book image replacement and output filename controls appear directly on each selected-file card.

### Vertical layout

“Convert horizontal text to vertical” adds a small dedicated stylesheet and links it from reflowable content documents. It sets `writing-mode: vertical-rl` without changing the publication to fixed layout. When progression is Auto, EPUB 3 receives standard `page-progression-direction="rtl"`; EPUB 2 remains EPUB 2 and receives Kindle-compatible `primary-writing-mode` metadata. Existing vertical books are not needlessly restyled.

### Horizontal layout

“Vertical → horizontal” adds a late, explicit `horizontal-tb` override while preserving document structure, links, images, ruby, and navigation. With progression set to Auto, the result explicitly uses LTR page progression and Kindle-compatible `horizontal-lr` metadata. Fixed-layout publications are not transformed.

### Japanese Mode

Japanese Mode changes the primary publication language to `ja` and maintains compatible writing-mode metadata. It does not itself enable vertical layout. Japanese ruby is preserved. This mode can help Kindle honor vertical RTL books when Amazon's Traditional Chinese conversion path does not; changing the language metadata can also change the device's font and typography choices.

### Page progression

- **Auto:** vertical-right-to-left content becomes RTL; otherwise an existing valid direction is preserved and an absent direction remains absent.
- **Right to left / Left to right:** explicitly overrides Auto.

Language alone is never used as proof of progression direction.

### Image replacement

Select local replacement images after selecting an EPUB. Matching does not depend on filenames. High-confidence unique matches are selected automatically; uncertain matches remain unchecked for manual confirmation. Comparison and replacement happen locally. The app never downloads images from Google Play Books or any other reading service, and it never enlarges or recompresses supplied images.

## Output files

The default output name is `Original Name-tweaked.epub`. Existing `-fixed` and `-tweaked` suffixes are normalized so repeated processing does not produce stacked suffixes. The original file is never overwritten.

Browsers do not expose the source file’s parent folder to a normal PWA, so an ordinary file input or drag-and-drop cannot silently write a sibling file into that folder. Downloads use the browser’s configured download location (or its save prompt). This keeps the File System Access API optional and maintains Safari/iOS compatibility.

## DRM policy

EPUB Tweaker does not remove or bypass DRM. If an encrypted content resource is detected, processing stops with `DRM_PROTECTED`. Standard font obfuscation is retained. An encryption file is removed only when every referenced resource is demonstrably readable and the listed Adobe method is stale residue.

## Validation

Before download, the generated EPUB is reopened and checked for:

- first, exact, uncompressed `mimetype`
- valid container and package documents
- unique manifest IDs and existing manifest resources
- valid spine references
- resolvable EPUB 2 NCX and EPUB 3 navigation targets
- parseable XML/XHTML/SVG and CSS
- internal `href` and `src` targets and fragments
- consistent UTF-8 serialized text resources

The validator is intentionally not a reimplementation of Kindle Previewer. The app repairs known compatibility problems and produces an EPUB that satisfies EPUB Tweaker’s validated Kindle-safe profile; it cannot guarantee acceptance by Amazon’s conversion service.

## Supported browsers

- Current Safari on iPhone, iPad, and macOS
- Installed iOS/iPadOS PWA mode
- Current Chromium browsers
- Current Firefox where the required Worker, Blob, and ZIP-memory capacity are available

Standard file inputs are always available; the File System Access API is not required. Desktop drag-and-drop is supported. Perceptual image hashing uses `OffscreenCanvas` and `createImageBitmap` when present and falls back to dimension/aspect matching otherwise.

## Development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Run the automated unit and end-to-end synthetic EPUB corpus:

```bash
npm test
```

Type-check and create a production PWA build:

```bash
npm run build
npm run preview
```

The build output is `dist/`. Deploy that directory to any static HTTPS host. The service worker scope assumes the app is hosted at the domain root; if deploying below a path, set Vite’s `base` and the manifest `start_url`/`scope` to that path.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhaohailong%2FEPUB-Tweaker)

The repository includes `vercel.json` with the Vite framework preset, `npm run build`, the `dist` output directory, SPA fallback routing, and PWA cache headers. To connect it manually:

1. Open the Vercel dashboard and select **New Project**.
2. Import `haohailong/EPUB-Tweaker` from GitHub.
3. Keep the detected Vite settings and select **Deploy**. No environment variables or backend services are required.

Future pushes to `main` will trigger production deployments after the GitHub repository is connected. Pull requests receive preview deployments.

## Test corpus

Tests synthesize redistributable EPUB fixtures in memory; no commercial books are included. The corpus covers EPUB 2 and 3, NCX/nav body anchors, UTF-8 serialization, missing manifest/spine resources, progression and both layout transformations, Chinese/Japanese ruby behavior, page-map cleanup, stale versus real encryption, SVG, CSS pseudo-elements, prefixed writing modes, reflowable spine spread cleanup, system-language selection, image matching, ZIP ordering/compression, output validation, and second-pass idempotence.

If Java is available in CI, EPUBCheck can be added as an extra development validation layer over generated EPUB 3 fixtures. It is not bundled into the browser app.

## Current limitations

- The app intentionally performs conservative repairs. Ambiguous missing references and malformed XML are reported rather than guessed.
- Image matching confidence is strongest when perceptual canvas APIs are available. Similar illustrations with identical proportions may require manual confirmation.
- Very large books are rejected at 200 MB compressed, 100 MB per entry, or 600 MB total expanded size to protect mobile browsers.
- Font obfuscation is preserved; the current pipeline does not modify obfuscated fonts.
- The validator checks internal consistency but does not run Amazon’s private conversion engine.
- Amazon's current Traditional Chinese publishing guidance requires horizontal LTR content and says vertical/RTL Traditional Chinese is unsupported. EPUB Tweaker warns on this combination; Japanese Mode may work around device behavior, while horizontal conversion is the most conservative Send to Kindle option.

## Technical references

Implementation decisions follow the current [W3C EPUB 3.3 specification](https://www.w3.org/TR/epub-33/) for OCF/package/navigation behavior and the current [Amazon Kindle Publishing Guidelines](https://kdp.amazon.com/en_US/help/topic/GU72M65VRFPH43L6), including Amazon’s [navigation guidance](https://kdp.amazon.com/en_US/help/topic/GY3AD8C6C6GAG42N) and [Traditional Chinese publishing limitations](https://kdp.amazon.com/en_US/help/topic/G27T64E65VM6JWKK). The source code independently implements the specified behavior; it is not a line-by-line port of an unlicensed converter.

## Author and acknowledgement

Created by [Hailong Hao](https://github.com/haohailong). Inspired by James Hong from the Facebook group [電子書閱讀器討論區](https://www.facebook.com/groups/ereaderfamily).
