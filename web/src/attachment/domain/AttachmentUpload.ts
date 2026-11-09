export const MAX_ATTACHMENT_BYTES = 1_048_576;
/** Base64 text of 1 MB is 1398104 characters; longer text is refused before it is decoded. */
export const MAX_BASE64_LENGTH = 1_398_104;
export const MAX_ATTACHMENT_FILES_PER_TASK = 10;
export const MAX_ATTACHMENT_NAME_LENGTH = 150;
export const UNSUPPORTED_MESSAGE = '지원 파일: PDF·이미지·TXT·CSV·XLSX·DOCX, 최대 1MB';
export const TOO_LARGE_MESSAGE = '첨부파일은 1MB 이하여야 합니다.';
export const TOO_MANY_MESSAGE = '업무당 첨부파일은 10개까지 가능합니다.';

const ALLOWED_NAME = /\.(pdf|png|jpe?g|webp|txt|csv|xlsx|docx)$/i;
const BASE64_TEXT = /^[A-Za-z0-9+/]+=*$/;

export class InvalidAttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAttachmentError';
  }
}

export function isAllowedAttachmentName(name: string): boolean {
  return ALLOWED_NAME.test(name);
}

/**
 * A file offered for upload, already checked. The rules are the legacy ones, in the legacy order: name (separators and
 * line breaks become '_', cut to 150 characters, extension allow-list), content (present, at most 1398104 characters,
 * base64 alphabet), then the decoded size (1..1048576 bytes). `content` is the canonical base64 of the decoded bytes.
 * The extension allow-list is the only file-type check; the content is never inspected.
 */
export class AttachmentUpload {
  readonly name: string;
  readonly size: number;
  readonly content: string;

  private constructor(name: string, size: number, content: string) {
    this.name = name;
    this.size = size;
    this.content = content;
  }

  static from(rawName: unknown, rawContent: unknown): AttachmentUpload {
    const name = String(rawName || '').replace(/[\\/\r\n]/g, '_').slice(0, MAX_ATTACHMENT_NAME_LENGTH);
    const content = String(rawContent || '');
    if (!isAllowedAttachmentName(name) || content === '' || content.length > MAX_BASE64_LENGTH || !BASE64_TEXT.test(content)) {
      throw new InvalidAttachmentError(UNSUPPORTED_MESSAGE);
    }
    const bytes = Buffer.from(content, 'base64');
    if (bytes.length === 0 || bytes.length > MAX_ATTACHMENT_BYTES) throw new InvalidAttachmentError(TOO_LARGE_MESSAGE);
    return new AttachmentUpload(name, bytes.length, bytes.toString('base64'));
  }
}

export function decodeAttachmentContent(content: string): Uint8Array {
  return new Uint8Array(Buffer.from(content, 'base64'));
}
