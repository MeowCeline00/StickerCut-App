// Single source of truth for backend URLs, so nothing in the app
// hardcodes an address inline.
//
// `process.env.EXPO_PUBLIC_*` is statically inlined at build time by
// Expo's babel config (must stay a literal `process.env.EXPO_PUBLIC_X`
// property access — not a dynamic `process.env[key]` lookup, or the
// inlining won't find it). This is safe to expose to the client: the
// backend URL is not a secret, it's just an address — see backend
// README's "Security / privacy" section for what that URL actually
// points at during development.
//
// Precedence: EXPO_PUBLIC_BACKEND_URL (from .env, see .env.example)
// > the Android-emulator-loopback default below. Real devices and iOS
// simulators need a different value (your PC's LAN IP, or
// http://localhost:8000 for iOS simulator) — set it via .env rather
// than editing this file. See backend/README.md for exact addresses
// per platform.
const DEFAULT_DEV_BACKEND_URL = "http://10.0.2.2:8000";

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? DEFAULT_DEV_BACKEND_URL;

export const API_CONFIG = {
  backendUrl: BACKEND_URL,
};
