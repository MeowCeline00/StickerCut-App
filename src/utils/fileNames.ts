// Shared helpers for turning a user-editable project name into (a) a
// clean project.name value and (b) a filesystem-safe export filename.
//
// These two are deliberately separate: project.name can be basically
// any trimmed string the user typed (Unicode included), while
// sanitizeFileName additionally strips characters that are invalid in
// file names on common filesystems, for use when export.tsx (Phase 5)
// builds actual output file names like "<project name>.pdf".

export const PROJECT_NAME_MAX_LENGTH = 60;

export const DEFAULT_PROJECT_NAME = "Untitled";

/**
 * Normalizes a project name as typed by the user: trims surrounding
 * whitespace, falls back to the default name when that leaves nothing,
 * and caps the length so headers/lists/export filenames stay sane.
 */
export function normalizeProjectName(rawName: string): string {
  const trimmed = rawName.trim();

  if (trimmed.length === 0) {
    return DEFAULT_PROJECT_NAME;
  }

  if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
    return trimmed.slice(0, PROJECT_NAME_MAX_LENGTH).trim();
  }

  return trimmed;
}

// Characters that are invalid (or reserved) in file names on Windows,
// macOS, and most common filesystems: < > : " / \ | ? *
// Control characters (0x00-0x1F) are also stripped.
// eslint-disable-next-line no-control-regex
const INVALID_FILE_NAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

/**
 * Converts a (already-normalized) project name into a filesystem-safe
 * file name stem, for use as the default export file name — e.g.
 * "Harry Potter Sticker Sheet" -> "Harry Potter Sticker Sheet.pdf".
 *
 * Unicode characters (accents, CJK, emoji, etc.) are preserved; only
 * the specific characters that break file names are removed. Trailing
 * dots/spaces (invalid on Windows) are also trimmed.
 */
export function sanitizeFileName(name: string): string {
  const withoutInvalidChars = name
    .replace(INVALID_FILE_NAME_CHARS, "")
    .trim();

  const withoutTrailingDots = withoutInvalidChars.replace(/[.\s]+$/, "");

  const result = withoutTrailingDots.length > 0
    ? withoutTrailingDots
    : DEFAULT_PROJECT_NAME;

  return result.length > PROJECT_NAME_MAX_LENGTH
    ? result.slice(0, PROJECT_NAME_MAX_LENGTH).trim()
    : result;
}
