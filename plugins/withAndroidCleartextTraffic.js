// Config plugin: sets android:usesCleartextTraffic="true" on the
// <application> element of the generated AndroidManifest.xml.
//
// WHY THIS EXISTS AS A PLUGIN, NOT AN app.json KEY:
// Expo's app.json/app.config schema has no top-level
// `android.usesCleartextTraffic` field — @expo/config-plugins exposes
// the manifest-editing helper, but nothing in Expo core reads such a
// key from your config automatically. A local config plugin using
// withAndroidManifest is the supported way to set a raw
// AndroidManifest.xml attribute that Expo's config doesn't model
// directly. (Verified against @expo/config-plugins 57.x installed in
// this project — see AndroidConfig.Manifest.getMainApplicationOrThrow.)
//
// WHAT THIS ACTUALLY FIXES:
// Starting with Android 9 (API 28), apps default to BLOCKING plaintext
// http:// network requests (cleartext traffic) — only https:// works
// unless the app's manifest explicitly opts back in. That block is
// enforced by Android/OkHttp at the native networking layer used by
// fetch() in a compiled app, which is why a plain HTTP request to your
// local FastAPI backend (http://10.0.2.2:8000) can fail with a generic
// "Network request failed" even though the SAME address loads fine in
// the emulator's Chrome browser (a separate app with its own, more
// permissive, manifest).
//
// IMPORTANT LIMITATION — this plugin only matters for a custom
// development build:
// This only takes effect when the native Android project is generated
// from this config (`npx expo prebuild`, or implicitly via
// `npx expo run:android`, or an EAS build). It has NO EFFECT on Expo
// Go — Expo Go is a fixed, pre-built app from the Play Store with its
// own manifest that config plugins cannot modify. If you're running
// this app inside the Expo Go app, this plugin is inert; you'd need to
// switch to a development build for it to apply. See backend/README.md
// / the Remove BG troubleshooting notes for that tradeoff.
const { withAndroidManifest } = require("@expo/config-plugins");

const withAndroidCleartextTraffic = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainApplication =
      androidManifest.manifest.application[0];

    mainApplication.$["android:usesCleartextTraffic"] = "true";

    return config;
  });
};

module.exports = withAndroidCleartextTraffic;
