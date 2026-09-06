const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const CHAR_INDEX: Record<string, number> = {};
for (let i = 0; i < BASE64_CHARS.length; i += 1) {
  CHAR_INDEX[BASE64_CHARS[i]] = i;
}

/**
 * Decodes a base64 string into raw bytes.
 *
 * Why this exists: React Native's JS engine (Hermes) has no
 * built-in `atob`, and expo-file-system's File API only goes the
 * other direction (File.base64Sync() turns bytes INTO base64 —
 * there is no matching "write from base64" option on File.write()).
 * expo-clipboard, however, hands back pasted images as a
 * base64-encoded data URI. This decoder is the missing link that
 * turns that text back into real bytes so File.write() can save it
 * to disk. Pure JS, no native module needed.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/=+$/, "").replace(/[^A-Za-z0-9+/]/g, "");
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);

  let byteIndex = 0;
  let buffer = 0;
  let bitsFilled = 0;

  for (let i = 0; i < clean.length; i += 1) {
    const value = CHAR_INDEX[clean[i]];
    if (value === undefined) {
      continue;
    }

    buffer = (buffer << 6) | value;
    bitsFilled += 6;

    if (bitsFilled >= 8) {
      bitsFilled -= 8;
      bytes[byteIndex] = (buffer >> bitsFilled) & 0xff;
      byteIndex += 1;
    }
  }

  return bytes;
}
