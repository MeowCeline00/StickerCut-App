// Background-removal processing adapter.
//
// StickerObject already models this correctly (sourceUri is never
// overwritten; processedUri + backgroundRemoved carry the result), and
// the Remove BG button in editor.tsx is wired to call this function —
// but the function itself does not yet actually process pixels.
//
// WHY: producing a real transparent PNG from an arbitrary photo needs
// image segmentation (separating foreground subject from background).
// That is not something Expo's managed workflow / React Native can do
// on-device out of the box:
//   - There's no bundled on-device segmentation model in this project,
//     and adding one (e.g. via TensorFlow Lite / a custom native
//     module) requires leaving the managed Expo workflow for a custom
//     dev client — a real architecture decision, not a small tweak.
//   - The practical alternative is a REMOTE segmentation API (e.g. a
//     hosted background-removal service, or a model served from your
//     own backend). That needs:
//       1. A server-side endpoint YOU control that holds the actual
//          API key and proxies the request — never ship a third-party
//          API secret inside the client app.
//       2. Uploading the source image to that endpoint and receiving
//          back a transparent PNG (or its bytes).
//       3. Saving that PNG into this app's own persistent storage
//          (see src/utils/imageStorage.ts, which already has the
//          pattern createStickerFromImportedImage uses for sourceUri)
//          so it survives project reopen.
//
// Until that backend piece exists, this function deliberately THROWS
// rather than returning a fake "success" — see BackgroundRemovalUnavailableError.
// editor.tsx's handleRemoveBackground catches this and shows the user
// an honest message instead of marking backgroundRemoved: true.

export interface RemoveBackgroundResult {
  uri: string;
  width: number;
  height: number;
}

export class BackgroundRemovalUnavailableError extends Error {
  constructor() {
    super(
      "Background removal needs a server-side segmentation service " +
        "that isn't connected yet. A production build would upload " +
        "the image to your own backend (which holds the actual " +
        "provider API key) and save the returned transparent PNG " +
        "locally — see src/image/removeBackground.ts for details.",
    );

    this.name = "BackgroundRemovalUnavailableError";
  }
}

/**
 * Attempts to remove the background from the image at `sourceUri` and
 * return a transparent PNG.
 *
 * NOT YET IMPLEMENTED — always rejects with
 * BackgroundRemovalUnavailableError. This function exists so the UI
 * (the Remove BG button, its loading state, and its error handling)
 * is already correctly wired: turning background removal on in the
 * future should only require replacing this function's body with a
 * real network call, with no editor.tsx changes needed.
 */
export async function removeImageBackground(
  sourceUri: string,
): Promise<RemoveBackgroundResult> {
  void sourceUri;

  throw new BackgroundRemovalUnavailableError();
}
