// CRITICAL FIX 3 renamed this module to StickerTransformOverlay.tsx —
// it renders the resize/rotation handles too, not just "selection."
// This file is kept only as a compatibility re-export because this
// session has no file-delete capability on the linked device (no
// device_bash / shell access, only the stage-file/commit-file bridge).
// Nothing in the app imports from this path anymore (StickerItem.tsx
// imports StickerTransformOverlay.tsx directly) — this file is safe to
// delete by hand from the project folder whenever convenient.
export * from "./StickerTransformOverlay";
