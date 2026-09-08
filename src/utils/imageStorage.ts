import {
  Directory,
  File,
  Paths,
} from "expo-file-system";

import {
  base64ToUint8Array,
} from "@/utils/base64";

const STICKERS_DIRECTORY_NAME =
  "stickercut-images";

function getStickersDirectory(): Directory {
  const directory =
    new Directory(
      Paths.document,
      STICKERS_DIRECTORY_NAME,
    );

  if (!directory.exists) {
    directory.create({
      intermediates: true,
    });
  }

  return directory;
}

function createUniqueName(
  extension: string,
): string {
  const safeExtension =
    extension
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase() || "png";

  return `sticker_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.${safeExtension}`;
}

function inferExtensionFromMime(
  mimeType: string | null,
): string {
  const mime =
    mimeType
      ?.toLowerCase()
      .split(";")[0]
      .trim();

  switch (mime) {
    case "image/png":
      return "png";

    case "image/jpeg":
    case "image/jpg":
      return "jpg";

    case "image/webp":
      return "webp";

    case "image/gif":
      return "gif";

    case "image/heic":
    case "image/heif":
      return "heic";

    default:
      return "png";
  }
}

function inferExtension(
  uri: string,
  fileName?: string | null,
): string {
  const source =
    fileName ?? uri;

  const cleanSource =
    source.split("?")[0];

  const match =
    /\.([a-zA-Z0-9]+)$/.exec(
      cleanSource,
    );

  if (!match) {
    return "png";
  }

  const extension =
    match[1].toLowerCase();

  if (
    [
      "png",
      "jpg",
      "jpeg",
      "webp",
      "gif",
      "heic",
      "heif",
    ].includes(extension)
  ) {
    return extension;
  }

  return "png";
}

/**
 * Copy Photos / Files imports into app-owned storage.
 */
export async function saveImageToAppStorage(
  sourceUri: string,
  fileName?: string | null,
): Promise<string> {
  const directory =
    getStickersDirectory();

  const extension =
    inferExtension(
      sourceUri,
      fileName,
    );

  const destination =
    new File(
      directory,
      createUniqueName(
        extension,
      ),
    );

  const source =
    new File(sourceUri);

  await source.copy(
    destination,
  );

  return destination.uri;
}

/**
 * Save an actual clipboard image returned as Base64.
 */
export function saveClipboardImageToAppStorage(
  dataUri: string,
): string {
  const match =
    /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(
      dataUri,
    );

  const extension =
    match
      ? inferExtensionFromMime(
          `image/${match[1]}`,
        )
      : "png";

  const payload =
    match
      ? match[2]
      : dataUri;

  const bytes =
    base64ToUint8Array(
      payload,
    );

  const directory =
    getStickersDirectory();

  const destination =
    new File(
      directory,
      createUniqueName(
        extension,
      ),
    );

  destination.write(
    bytes,
  );

  return destination.uri;
}

const PROCESSED_IMAGES_SUBDIRECTORY_NAME =
  "processed";

/**
 * Subfolder of the main stickers directory, dedicated to generated
 * derivatives (currently: Remove BG output) as opposed to the
 * user's own imported/pasted originals. Keeping them apart makes it
 * obvious on disk which files are safe to regenerate/delete and
 * which are the user's real source images.
 */
function getProcessedImagesDirectory(): Directory {
  const directory =
    new Directory(
      getStickersDirectory(),
      PROCESSED_IMAGES_SUBDIRECTORY_NAME,
    );

  if (!directory.exists) {
    directory.create({
      intermediates: true,
    });
  }

  return directory;
}

/**
 * Persists raw bytes already in memory (e.g. an HTTP response body,
 * such as the background-removal backend's transparent PNG) into
 * app-owned persistent storage, reusing the same Directory/File/
 * unique-naming conventions as saveImageToAppStorage above rather
 * than inventing a second storage scheme.
 */
export function saveProcessedImageToAppStorage(
  bytes: Uint8Array,
  extension = "png",
): string {
  const directory =
    getProcessedImagesDirectory();

  const destination =
    new File(
      directory,
      createUniqueName(
        extension,
      ),
    );

  destination.write(
    bytes,
  );

  return destination.uri;
}

/**
 * Best-effort delete of a previously processed image (e.g. Revert
 * discarding a Remove BG result). Never throws — a failed cleanup
 * must not block the user's revert action — and this only ever
 * touches a `processedUri` the caller passes in, never sourceUri.
 */
export function deleteProcessedImage(
  uri: string,
): void {
  try {
    const file =
      new File(uri);

    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort cleanup only.
  }
}

/**
 * Convert relative HTML URLs into absolute URLs.
 */
function resolveUrl(
  value: string,
  baseUrl: string,
): string | null {
  try {
    return new URL(
      value,
      baseUrl,
    ).toString();
  } catch {
    return null;
  }
}

/**
 * Try to find a representative image inside an HTML page.
 *
 * This handles the common case where "Copy link" copies a PAGE URL
 * instead of the final image CDN URL.
 *
 * Order:
 * 1. og:image
 * 2. twitter:image
 * 3. first <img src>
 */
function findImageUrlInHtml(
  html: string,
  pageUrl: string,
): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,

    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,

    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,

    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,

    /<img[^>]+src=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match =
      pattern.exec(html);

    if (
      match?.[1]
    ) {
      const resolved =
        resolveUrl(
          match[1],
          pageUrl,
        );

      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

/**
 * Download raw image bytes with fetch().
 *
 * This is more reliable than relying only on the URL's filename,
 * because many image CDN URLs contain no .png/.jpg extension.
 */
async function fetchImageFile(
  url: string,
): Promise<File> {
  const response =
    await fetch(url, {
      headers: {
        Accept:
          "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
      },
    });

  if (!response.ok) {
    throw new Error(
      `Image request failed (${response.status}).`,
    );
  }

  const contentType =
    response.headers.get(
      "content-type",
    );

  if (
    !contentType
      ?.toLowerCase()
      .startsWith("image/")
  ) {
    throw new Error(
      "URL did not return image data.",
    );
  }

  const buffer =
    await response.arrayBuffer();

  const bytes =
    new Uint8Array(
      buffer,
    );

  const extension =
    inferExtensionFromMime(
      contentType,
    );

  const directory =
    getStickersDirectory();

  const destination =
    new File(
      directory,
      createUniqueName(
        extension,
      ),
    );

  destination.write(
    bytes,
  );

  return destination;
}

/**
 * Paste-link import.
 *
 * Supports BOTH:
 *
 * direct image URL
 *      ↓
 * image bytes
 *
 * webpage URL
 *      ↓
 * HTML
 *      ↓
 * og:image / twitter:image / <img>
 *      ↓
 * image bytes
 */
export async function downloadImageToAppStorage(
  rawUrl: string,
): Promise<File> {
  const url =
    rawUrl.trim();

  if (
    !/^https?:\/\//i.test(
      url,
    )
  ) {
    throw new Error(
      "Clipboard text is not an HTTP image link.",
    );
  }

  const firstResponse =
    await fetch(url, {
      headers: {
        Accept:
          "image/avif,image/webp,image/png,image/jpeg,image/*,text/html,*/*;q=0.8",
      },
    });

  if (!firstResponse.ok) {
    throw new Error(
      `Link request failed (${firstResponse.status}).`,
    );
  }

  const contentType =
    firstResponse.headers
      .get("content-type")
      ?.toLowerCase() ??
    "";

  /**
   * Best case: pasted link already points directly to an image.
   */
  if (
    contentType.startsWith(
      "image/",
    )
  ) {
    const buffer =
      await firstResponse.arrayBuffer();

    const bytes =
      new Uint8Array(
        buffer,
      );

    const directory =
      getStickersDirectory();

    const destination =
      new File(
        directory,
        createUniqueName(
          inferExtensionFromMime(
            contentType,
          ),
        ),
      );

    destination.write(
      bytes,
    );

    return destination;
  }

  /**
   * Otherwise treat the response as a webpage and try to discover
   * its primary image.
   */
  if (
    contentType.includes(
      "text/html",
    )
  ) {
    const html =
      await firstResponse.text();

    const finalPageUrl =
      firstResponse.url ||
      url;

    const imageUrl =
      findImageUrlInHtml(
        html,
        finalPageUrl,
      );

    if (!imageUrl) {
      throw new Error(
        "The pasted webpage does not expose an image StickerCut can import.",
      );
    }

    return fetchImageFile(
      imageUrl,
    );
  }

  throw new Error(
    "The pasted link does not point to an image or supported webpage.",
  );
}