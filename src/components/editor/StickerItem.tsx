import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import type { StickerObject } from "@/types/sticker";
import { MIN_STICKER_MM } from "@/utils/stickers";
import { calculateSourcePpi, mmToDisplay } from "@/utils/units";

import { styles } from "./StickerItem.styles";

// Below this, print quality visibly suffers because the source
// image has fewer pixels than the print size needs. This is a
// starting heuristic (typical home/label printers resolve
// somewhere around 150-300 PPI), not a hard technical limit.
const LOW_PPI_WARNING_THRESHOLD = 150;

// Corner handles are drawn at 10px, but that's too small to reliably
// grab with a finger — hitSlop expands the touchable area around the
// handle without changing how big it looks.
const RESIZE_HANDLE_HIT_SLOP = 18;

interface StickerItemProps {
  sticker: StickerObject;
  // px-per-mm scale from the parent editor, shared by every
  // sticker so they all convert their mm geometry the same way.
  editorScale: number;
  selected: boolean;
  onSelect: (id: string) => void;
  // Called once, when a drag finishes, with the physical distance
  // moved in mm — not on every frame. The editor screen owns
  // project state, so it applies the delta to the sticker's stored
  // xMm/yMm and autosaves; this component never mutates geometry
  // itself, it only reports what the user's finger did.
  onMove: (id: string, deltaXMm: number, deltaYMm: number) => void;
  // Same pattern as onMove, but for the bottom-right corner handle:
  // reports the physical size change in mm once the drag ends.
  onResize: (id: string, deltaWidthMm: number, deltaHeightMm: number) => void;
}

/**
 * Renders one sticker on the editor canvas. Permanent geometry
 * (xMm/yMm/widthMm/heightMm/rotation) lives in millimeters on the
 * StickerObject — this component only converts to on-screen pixels
 * for display, so print output never depends on any particular
 * phone's screen size.
 *
 * Dragging (move and resize) is handled with react-native-gesture-handler
 * + react-native-reanimated so the sticker follows the finger at 60fps
 * on the UI thread. The *live* drag position/size is a Reanimated
 * shared value that only exists visually here; the *committed*
 * position/size stays in StickerObject and is only updated once, via
 * onMove/onResize, when the finger lifts. That split is why the
 * shared values reset to 0 right after calling onMove/onResize — the
 * next render already reflects the new committed sticker.xMm/yMm.
 */
export function StickerItem({
  sticker,
  editorScale,
  selected,
  onSelect,
  onMove,
  onResize,
}: StickerItemProps) {
  const left = mmToDisplay(sticker.xMm, editorScale);
  const top = mmToDisplay(sticker.yMm, editorScale);
  const width = mmToDisplay(sticker.widthMm, editorScale);
  const height = mmToDisplay(sticker.heightMm, editorScale);
  const minSizePx = mmToDisplay(MIN_STICKER_MM, editorScale);

  // processedUri (e.g. after background removal) is preferred for
  // display, but sourceUri is never overwritten — see BACKGROUND
  // REMOVAL note on the badge below.
  const imageUri = sticker.processedUri ?? sticker.sourceUri;

  // Derived on demand from stored geometry rather than cached on
  // the sticker, so it's automatically correct after a resize —
  // see utils/units.ts's calculateSourcePpi for why.
  const sourcePpi = calculateSourcePpi(sticker.originalWidthPx, sticker.widthMm);

  const dragTranslateX = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const resizeDeltaWidth = useSharedValue(0);
  const resizeDeltaHeight = useSharedValue(0);

  // A tap always selects. A drag only moves the sticker once it's
  // already selected — Gesture.Race lets a quick, still tap win
  // immediately, while a finger that moves past the Pan gesture's
  // own activation distance hands the gesture to Pan instead. That
  // is what stops "tap to select" and "drag to move" from fighting
  // over the same touch.
  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)(sticker.id);
  });

  const panGesture = Gesture.Pan()
    .enabled(selected)
    .onChange((event) => {
      dragTranslateX.value += event.changeX;
      dragTranslateY.value += event.changeY;
    })
    .onEnd(() => {
      const deltaXMm = dragTranslateX.value / editorScale;
      const deltaYMm = dragTranslateY.value / editorScale;
      dragTranslateX.value = 0;
      dragTranslateY.value = 0;
      runOnJS(onMove)(sticker.id, deltaXMm, deltaYMm);
    });

  const moveGesture = Gesture.Race(tapGesture, panGesture);

  // Resizing only ever happens from the bottom-right handle for now
  // (the top-left corner stays anchored) — see the phase report for
  // why the other three handles are still just visual placeholders.
  const resizeGesture = Gesture.Pan()
    .hitSlop(RESIZE_HANDLE_HIT_SLOP)
    .onChange((event) => {
      resizeDeltaWidth.value += event.changeX;
      resizeDeltaHeight.value += event.changeY;
    })
    .onEnd(() => {
      const deltaWidthMm = resizeDeltaWidth.value / editorScale;
      const deltaHeightMm = resizeDeltaHeight.value / editorScale;
      resizeDeltaWidth.value = 0;
      resizeDeltaHeight.value = 0;
      runOnJS(onResize)(sticker.id, deltaWidthMm, deltaHeightMm);
    });

  const animatedWrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragTranslateX.value },
      { translateY: dragTranslateY.value },
      { rotate: `${sticker.rotation}deg` },
    ],
    // Clamped here (not just in the committed onResize handler) so
    // the live drag itself never visually shrinks the sticker past
    // the floor, not just the value it commits at the end.
    width: Math.max(width + resizeDeltaWidth.value, minSizePx),
    height: Math.max(height + resizeDeltaHeight.value, minSizePx),
  }));

  return (
    <GestureDetector gesture={moveGesture}>
      <Animated.View
        style={[styles.wrapper, { left, top, zIndex: sticker.zIndex }, animatedWrapperStyle]}
      >
        <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" />

        {selected && (
          <View style={styles.selectionOverlay} pointerEvents="box-none">
            <View style={[styles.cornerHandle, styles.cornerTopLeft]} pointerEvents="none" />
            <View style={[styles.cornerHandle, styles.cornerTopRight]} pointerEvents="none" />
            <View style={[styles.cornerHandle, styles.cornerBottomLeft]} pointerEvents="none" />

            <GestureDetector gesture={resizeGesture}>
              <View style={[styles.cornerHandle, styles.cornerBottomRight, styles.resizeHandle]} />
            </GestureDetector>

            <View style={styles.dimensionLabel} pointerEvents="none">
              <Text style={styles.dimensionLabelText}>
                {sticker.widthMm.toFixed(1)} × {sticker.heightMm.toFixed(1)} mm
                {sourcePpi !== null && (
                  <Text
                    style={sourcePpi < LOW_PPI_WARNING_THRESHOLD ? styles.dimensionLabelWarning : undefined}
                  >
                    {"  ·  "}
                    {Math.round(sourcePpi)} PPI
                    {sourcePpi < LOW_PPI_WARNING_THRESHOLD ? " (low)" : ""}
                  </Text>
                )}
              </Text>

              {/* Background removal isn't implemented yet (see the
                  phase report) — this always reads ORIGINAL BG today.
                  It's shown unconditionally, honestly, rather than
                  leaving you guessing whether it silently ran. */}
              <Text style={styles.backgroundBadgeText}>
                {sticker.backgroundRemoved ? "BG REMOVED" : "ORIGINAL BG"}
              </Text>
            </View>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
