import { Directory, File, Paths } from "expo-file-system";

import { base64ToUint8Array } from "@/utils/base64";

// Sticker images are copied out of the OS photo library into a
// folder StickerCut owns permanently. The picker's original URI
// points at a temporary OS-managed location that is not
// guaranteed to remain valid after this session, so nothing
// durable (a saved project) should ever reference it directly.
const STICKERS_DIRECTORY_NAME = "stickercut-images";

function getStickersDirectory(): Directory {
  const directory = new Directory(Paths.document, STICKERS_DIRECTORY_NAME);

  if (!directory.exists) {
    directory.create({ intermediates: true });
  }

  return directory;
}

function inferExtension(uri: string, fileName?: string | null): string {
  const nameToCheck = fileName ?? uri;
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(nameToCheck);

  return match ? match[1].toLowerCase() : "jpg";
}

/**
 * Copies a picked image into StickerCut's own persistent storage
 * and returns the new, stable file:// URI. AsyncStorage (via
 * projectStorage.ts) only ever stores this URI string as part of
 * the project's JSON metadata — the actual pixel data lives on
 * disk, never as a Base64 blob in AsyncStorage.
 */
export async function saveImageToAppStorage(
  sourceUri: string,
  fileName?: string | null,
): Promise<string> {
  const directory = getStickersDirectory();
  const extension = inferExtension(sourceUri, fileName);
  const uniqueName = `sticker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const destination = new File(directory, uniqueName);

  const source = new File(sourceUri);
  await source.copy(destination);

  return destination.uri;
}

/**
 * Persists a pasted clipboard image into StickerCut's own storage.
 *
 * expo-clipboard hands back image data as a base64-encoded data URI
 * (e.g. "data:image/png;base64,AAAA..."), not a file URI, so there
 * is nothing to File.copy() here. Instead the base64 payload is
 * decoded into raw bytes (see utils/base64.ts — Hermes has no
 * built-in `atob`, and File.write() has no base64 option) and
 * written directly. This runs synchronously, matching
 * File.write()'s own sync signature.
 */
export function saveClipboardImageToAppStorage(dataUri: string): string {
  const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUri);
  const extension = match ? match[1].toLowerCase() : "png";
  const base64Payload = match ? match[2] : dataUri;

  const bytes = base64ToUint8Array(base64Payload);

  const directory = getStickersDirectory();
  const uniqueName = `sticker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const destination = new File(directory, uniqueName);

  destination.write(bytes);

  return destination.uri;
}

/**
 * Downloads an image from a URL (e.g. a link the user copied from
 * a browser and pasted) directly into StickerCut's own storage.
 *
 * This is a plain, user-initiated download: StickerCut fetches
 * exactly the link the user pasted, from that link's own host —
 * nothing about the user or their device is sent anywhere else in
 * the process. Requires the device to be online.
 *
 * File.downloadFileAsync() names the file from the response
 * headers/URL when given a directory, so the extension and MIME
 * type are whatever the server actually reports — which is also
 * how this function tells a real image apart from a link that
 * happens to look like one but points at an HTML page or an error
 * response instead.
 */
export async function downloadImageToAppStorage(url: string): Promise<File> {
  const directory = getStickersDirectory();
  const file = await File.downloadFileAsync(url, directory);

  const looksLikeImage =
    file.type?.toLowerCase().startsWith("image/") ?? /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(file.uri);

  if (!looksLikeImage) {
    try {
      file.delete();
    } catch {
      // Best-effort cleanup only — an orphaned non-image file in
      // our own storage folder is harmless clutter, not a bug.
    }

    throw new Error("The linked file is not an image.");
  }

  return file;
}
