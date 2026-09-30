export type EpubErrorCode =
  | 'INVALID_EPUB_ARCHIVE'
  | 'EPUB_CONTAINER_MISSING'
  | 'PACKAGE_DOCUMENT_MISSING'
  | 'MANIFEST_RESOURCE_MISSING'
  | 'SPINE_RESOURCE_MISSING'
  | 'DRM_PROTECTED'
  | 'UNSUPPORTED_ENCRYPTION'
  | 'XML_PARSE_FAILED'
  | 'ZIP_PATH_TRAVERSAL'
  | 'ZIP_BOMB_LIMIT'
  | 'POST_VALIDATION_FAILED';

export class EpubError extends Error {
  constructor(
    public readonly code: EpubErrorCode,
    message: string,
    public readonly path?: string
  ) {
    super(message);
    this.name = 'EpubError';
  }
}
