// DEAD FILE — not imported anywhere in the app. editor.tsx used to
// render this as a "Done" sheet; it was replaced by the real
// projectId-based Preview screen (see app/preview.tsx) and all usage
// was removed from editor.tsx. Per CRITICAL FIX 11 ("do not add
// ExportSheet, extra buttons, or future functions unless the Figma
// version has them and they work"), this component should not come
// back unless a real, working export flow is being built to match an
// actual Figma screen.
//
// This file (and ExportSheet.styles.ts) could not be deleted this pass
// — this session has no file-delete capability on the linked device
// (no shell access, only the stage-file/commit-file bridge). Both are
// safe to delete by hand from the project folder at any time.
export {};
