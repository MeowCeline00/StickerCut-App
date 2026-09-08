import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";

import { useEffect, useState } from "react";

import { Image } from "expo-image";

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { SafeAreaView } from "react-native-safe-area-context";

import { CanvasRuler } from "@/components/editor/CanvasRuler";
import { GuideLine } from "@/components/editor/GuideLine";
import { StickerItem } from "@/components/editor/StickerItem";

import { CANVAS_COLOR_SWATCHES, DEFAULT_CANVAS_COLOR } from "@/constants/canvas-colors";
import { Colors } from "@/constants/colors";
import {
  CUT_LINE_COLOR_SWATCHES,
  CUT_SHAPE_OPTIONS,
  DEFAULT_CUT_LINE_COLOR,
  DEFAULT_CUT_LINE_SHAPE,
} from "@/constants/cut-line";
import { DEFAULT_THEME_ID } from "@/constants/themes";

import {
  createStickerFromClipboardImage,
  createStickerFromImportedImage,
  createStickerFromUrl,
} from "@/image/importImage";

import { getProject, saveProject } from "@/storage/projectStorage";

import { styles } from "@/styles/editor.styles";

import type { StickerObject } from "@/types/sticker";
import type { Guide, StickerProject } from "@/types/project";

import { createId } from "@/utils/ids";
import { getImageDimensions } from "@/utils/imageDimensions";
import { computeDefaultStickerSizeMm, getNextZIndex, MIN_STICKER_MM } from "@/utils/stickers";
import { clampStickerPositionMm } from "@/utils/stickerTransformMath";
import { calculateEditorScale, mmToDisplay } from "@/utils/units";

// Editor-only chrome (rulers, tab panel, header) never contributes to
// the exported/printed artwork — only project.stickers + project.canvas
// do. Kept here so it's obvious at a glance which parts of this screen
// are "workspace decoration" vs. "real data."
const DUPLICATE_OFFSET_MM = 6;

type EditorTab = "canvas" | "cutLine";

export default function EditorScreen() {
  const params = useLocalSearchParams<{
    projectId?: string;
    presetId?: string;
    widthMm?: string;
    heightMm?: string;
    background?: string;
    orientation?: string;
    themeId?: string;
  }>();

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [project, setProject] = useState<StickerProject | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("canvas");

  useEffect(() => {
    initialiseProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initialiseProject() {
    if (params.projectId) {
      const existing = await getProject(params.projectId);

      if (existing) {
        setProject(existing);
        setLoading(false);
        return;
      }
    }

    const widthMm = Number(params.widthMm) || 210;
    const heightMm = Number(params.heightMm) || 297;
    const now = Date.now();

    const created: StickerProject = {
      id: createId("project"),
      name: "Untitled",
      createdAt: now,
      updatedAt: now,
      canvas: {
        presetId: params.presetId ?? "a4",
        widthMm,
        heightMm,
        orientation: params.orientation === "landscape" ? "landscape" : "portrait",
        background: params.background === "transparent" ? "transparent" : "white",
      },
      stickers: [],
      themeId:
        params.themeId === "dark" || params.themeId === "pink" || params.themeId === "light"
          ? params.themeId
          : DEFAULT_THEME_ID,
    };

    setProject(created);
    setLoading(false);
  }

  async function handleSave() {
    if (!project) {
      return;
    }

    try {
      await saveProject(project);
      Alert.alert("Project saved", "Your StickerCut project was saved on this device.");
    } catch {
      Alert.alert("Save failed", "StickerCut could not save this project.");
    }
  }

  /**
   * Preview loads the project fresh, by id, from storage (see
   * preview.tsx) — so the current in-memory state has to actually be
   * saved first, or a brand-new/just-edited project would open an
   * empty or stale preview. Errors are surfaced rather than silently
   * navigating to a preview that won't match what's on screen.
   */
  async function handlePreview() {
    if (!project) {
      return;
    }

    try {
      await saveProject(project);
    } catch {
      Alert.alert(
        "Couldn't open preview",
        "StickerCut couldn't save this project, so Preview would show stale or missing content.",
      );
      return;
    }

    router.push({ pathname: "/preview", params: { projectId: project.id } });
  }

  /**
   * Applies a finished drag-to-move gesture. Called once, when the
   * finger lifts (see StickerItem.tsx) — never per-frame — with the
   * physical distance moved in mm. A no-op delta (a tap that never
   * became a drag) is skipped so tapping a sticker doesn't trigger
   * an unnecessary autosave. The result is clamped to the page:
   * xMm/yMm >= 0 and xMm+widthMm/yMm+heightMm <= canvas size.
   */
  function handleStickerMove(id: string, deltaXMm: number, deltaYMm: number) {
    if (!project || (deltaXMm === 0 && deltaYMm === 0)) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      stickers: project.stickers.map((sticker) => {
        if (sticker.id !== id) {
          return sticker;
        }

        const clamped = clampStickerPositionMm(
          sticker.xMm + deltaXMm,
          sticker.yMm + deltaYMm,
          sticker.widthMm,
          sticker.heightMm,
          project.canvas.widthMm,
          project.canvas.heightMm,
        );

        return { ...sticker, xMm: clamped.xMm, yMm: clamped.yMm };
      }),
    };

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {
      // Same fallback reasoning as commitNewStickers below: the
      // manual Save button still covers a failed autosave.
    });
  }

  /**
   * Applies a finished drag-to-resize gesture from any of the four
   * corner handles (see StickerItem.tsx). deltaXMm/deltaYMm are only
   * ever non-zero for a top- or left-anchored corner, where resizing
   * also shifts the sticker's position so the OPPOSITE corner stays
   * put — StickerItem.tsx already computes an aspect-ratio-correct,
   * MIN_STICKER_MM-respecting result before it ever gets here, so
   * this handler's own Math.max is just a defense-in-depth floor,
   * not the primary place that logic lives.
   */
  function handleStickerResize(
    id: string,
    deltaWidthMm: number,
    deltaHeightMm: number,
    deltaXMm: number,
    deltaYMm: number,
  ) {
    if (!project) {
      return;
    }

    if (deltaWidthMm === 0 && deltaHeightMm === 0 && deltaXMm === 0 && deltaYMm === 0) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      stickers: project.stickers.map((sticker) => {
        if (sticker.id !== id) {
          return sticker;
        }

        const widthMm = Math.max(MIN_STICKER_MM, sticker.widthMm + deltaWidthMm);
        const heightMm = Math.max(MIN_STICKER_MM, sticker.heightMm + deltaHeightMm);

        const clamped = clampStickerPositionMm(
          sticker.xMm + deltaXMm,
          sticker.yMm + deltaYMm,
          widthMm,
          heightMm,
          project.canvas.widthMm,
          project.canvas.heightMm,
        );

        return { ...sticker, xMm: clamped.xMm, yMm: clamped.yMm, widthMm, heightMm };
      }),
    };

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {
      // Same fallback reasoning as commitNewStickers below: the
      // manual Save button still covers a failed autosave.
    });
  }

  /**
   * Applies a finished rotation-handle gesture. Like onMove/onResize,
   * this is called once (when the finger lifts) with a DEGREES DELTA,
   * not an absolute angle — StickerItem.tsx computes the delta from
   * the handle's own drag, this handler just adds it to the committed
   * rotation and normalizes into [0, 360).
   */
  function handleStickerRotate(id: string, deltaDegrees: number) {
    if (!project || deltaDegrees === 0) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      stickers: project.stickers.map((sticker) =>
        sticker.id === id
          ? { ...sticker, rotation: ((sticker.rotation + deltaDegrees) % 360 + 360) % 360 }
          : sticker,
      ),
    };

    setProject(updatedProject);
    saveProject(updatedProject).catch(() => {});
  }

  function handleToggleAspectLocked() {
    if (!project || !selectedStickerId) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      stickers: project.stickers.map((sticker) =>
        sticker.id === selectedStickerId
          ? { ...sticker, aspectLocked: !(sticker.aspectLocked ?? true) }
          : sticker,
      ),
    };

    setProject(updatedProject);
    saveProject(updatedProject).catch(() => {});
  }

  /**
   * Resets the selected sticker's size (back to the default computed
   * from its original imported pixel dimensions) and rotation to 0 —
   * an undo for "I've messed with this sticker's transform and want
   * to start over," without removing and re-importing it. Position
   * is left alone since that's rarely what someone means by "revert."
   */
  function handleRevertSelected() {
    if (!project || !selectedStickerId) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      stickers: project.stickers.map((sticker) => {
        if (sticker.id !== selectedStickerId) {
          return sticker;
        }

        const { widthMm, heightMm } = computeDefaultStickerSizeMm(
          sticker.originalWidthPx ?? sticker.widthMm,
          sticker.originalHeightPx ?? sticker.heightMm,
        );

        return { ...sticker, widthMm, heightMm, rotation: 0, aspectLocked: true };
      }),
    };

    setProject(updatedProject);
    saveProject(updatedProject).catch(() => {});
  }

  function handleSetCutLineShape(shape: (typeof CUT_SHAPE_OPTIONS)[number]["id"]) {
    if (!project || !selectedStickerId) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      stickers: project.stickers.map((sticker) =>
        sticker.id === selectedStickerId
          ? { ...sticker, cutLine: { ...sticker.cutLine, shape } }
          : sticker,
      ),
    };

    setProject(updatedProject);
    saveProject(updatedProject).catch(() => {});
  }

  function handleSetCutLineColor(color: string) {
    if (!project || !selectedStickerId) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      stickers: project.stickers.map((sticker) =>
        sticker.id === selectedStickerId
          ? { ...sticker, cutLine: { ...sticker.cutLine, color } }
          : sticker,
      ),
    };

    setProject(updatedProject);
    saveProject(updatedProject).catch(() => {});
  }

  // Shared by every import source: merge new stickers into the
  // project, select the last one added, and autosave so imported
  // artwork survives even if the user backs out without tapping
  // Save.
  async function commitNewStickers(newStickers: StickerObject[]) {
    if (!project || newStickers.length === 0) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      stickers: [...project.stickers, ...newStickers],
    };

    setProject(updatedProject);
    setSelectedStickerId(newStickers[newStickers.length - 1].id);

    try {
      await saveProject(updatedProject);
    } catch {
      // handleSave already surfaces save failures to the user; a
      // silent autosave failure here just means the manual Save
      // button is still available as a fallback.
    }
  }

  function handleDuplicateSelected() {
    if (!project || !selectedStickerId) {
      return;
    }

    const source = project.stickers.find((sticker) => sticker.id === selectedStickerId);
    if (!source) {
      return;
    }

    const duplicate: StickerObject = {
      ...source,
      id: createId("sticker"),
      xMm: Math.min(
        source.xMm + DUPLICATE_OFFSET_MM,
        Math.max(0, project.canvas.widthMm - source.widthMm),
      ),
      yMm: Math.min(
        source.yMm + DUPLICATE_OFFSET_MM,
        Math.max(0, project.canvas.heightMm - source.heightMm),
      ),
      zIndex: getNextZIndex(project.stickers),
    };

    commitNewStickers([duplicate]);
  }

  function handleDeleteSelected() {
    if (!project || !selectedStickerId) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      stickers: project.stickers.filter((sticker) => sticker.id !== selectedStickerId),
    };

    setSelectedStickerId(null);
    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {
      // Manual Save is still available if this silent autosave fails.
    });
  }

  /**
   * Adds a new reference guide, dragged out from the top ruler
   * (axis "horizontal") or the left ruler (axis "vertical") — see
   * CanvasRuler.tsx's onCreateGuide. positionMm is already clamped to
   * the page there. Guides are editor-only: they live on
   * project.guides and preview.tsx never reads that field, so they
   * never appear in Preview or any future export.
   */
  function handleCreateGuide(axis: Guide["axis"], positionMm: number) {
    if (!project) {
      return;
    }

    const guide: Guide = { id: createId("guide"), axis, positionMm };

    const updatedProject: StickerProject = {
      ...project,
      guides: [...(project.guides ?? []), guide],
    };

    setProject(updatedProject);
    saveProject(updatedProject).catch(() => {});
  }

  function handleMoveGuide(id: string, positionMm: number) {
    if (!project) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      guides: (project.guides ?? []).map((guide) => {
        if (guide.id !== id) {
          return guide;
        }

        const maxMm = guide.axis === "horizontal" ? project.canvas.heightMm : project.canvas.widthMm;
        return { ...guide, positionMm: Math.min(Math.max(0, positionMm), maxMm) };
      }),
    };

    setProject(updatedProject);
    saveProject(updatedProject).catch(() => {});
  }

  function handleDeleteGuide(id: string) {
    if (!project) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      guides: (project.guides ?? []).filter((guide) => guide.id !== id),
    };

    setProject(updatedProject);
    saveProject(updatedProject).catch(() => {});
  }

  function handleSetBackground(background: "white" | "transparent") {
    if (!project) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      canvas: { ...project.canvas, background },
    };

    setProject(updatedProject);
    saveProject(updatedProject).catch(() => {});
  }

  function handleSetCanvasColor(color: string) {
    if (!project) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      canvas: { ...project.canvas, canvasColor: color },
    };

    setProject(updatedProject);
    saveProject(updatedProject).catch(() => {});
  }

  /**
   * "+ Add image" opens this chooser instead of jumping straight to
   * Photos, matching the web reference's Add to Canvas menu
   * (Photos / Files / Paste). Kept as a plain Alert action sheet —
   * no new UI library — since three text options don't need one.
   */
  function handleAddToCanvas() {
    if (isImporting) {
      return;
    }

    Alert.alert("Add to Canvas", "Choose where to import artwork from.", [
      { text: "Photos", onPress: handleAddFromPhotos },
      { text: "Files", onPress: handleAddFromFiles },
      { text: "Paste", onPress: handlePasteFromClipboard },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  /**
   * Imports one or more images from the photo library. Each image
   * is copied into StickerCut's own persistent storage (see
   * utils/imageStorage.ts — never the OS's temporary picker URI)
   * via the shared pipeline in image/importImage.ts.
   */
  async function handleAddFromPhotos() {
    if (!project || isImporting) {
      return;
    }

    setIsImporting(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "StickerCut needs access to your photos to import artwork.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      let nextZIndex = getNextZIndex(project.stickers);
      const newStickers: StickerObject[] = [];

      for (const asset of result.assets) {
        const sticker = await createStickerFromImportedImage(
          { uri: asset.uri, width: asset.width, height: asset.height, fileName: asset.fileName },
          project.canvas.widthMm,
          project.canvas.heightMm,
          nextZIndex,
          newStickers.length,
        );

        newStickers.push(sticker);
        nextZIndex += 1;
      }

      await commitNewStickers(newStickers);
    } catch {
      Alert.alert("Import failed", "StickerCut could not import that image.");
    } finally {
      setIsImporting(false);
    }
  }

  /**
   * Imports one or more image files via the system file picker.
   * Unlike expo-image-picker, expo-document-picker does not return
   * pixel dimensions, so getImageDimensions() (utils/imageDimensions.ts,
   * built on React Native's own Image.getSize) reads them from the
   * picked file before it reaches the shared pipeline.
   */
  async function handleAddFromFiles() {
    if (!project || isImporting) {
      return;
    }

    setIsImporting(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/png", "image/jpeg", "image/webp"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      let nextZIndex = getNextZIndex(project.stickers);
      const newStickers: StickerObject[] = [];

      for (const asset of result.assets) {
        const { width, height } = await getImageDimensions(asset.uri);

        const sticker = await createStickerFromImportedImage(
          { uri: asset.uri, width, height, fileName: asset.name },
          project.canvas.widthMm,
          project.canvas.heightMm,
          nextZIndex,
          newStickers.length,
        );

        newStickers.push(sticker);
        nextZIndex += 1;
      }

      await commitNewStickers(newStickers);
    } catch {
      Alert.alert("Import failed", "StickerCut could not import that file.");
    } finally {
      setIsImporting(false);
    }
  }

  /**
   * Pastes from the clipboard — either actual image data (e.g.
   * "Copy image" in a browser, or a screenshot) or a plain text URL
   * that points at an image (e.g. "Copy image address"). These are
   * genuinely different clipboard contents, so they're checked in
   * order: real image bytes first, then fall back to treating the
   * clipboard as a link.
   */
  async function handlePasteFromClipboard() {
    if (!project || isImporting) {
      return;
    }

    setIsImporting(true);

    try {
      const hasImage = await Clipboard.hasImageAsync();

      if (hasImage) {
        const clipboardImage = await Clipboard.getImageAsync({ format: "png" });

        if (!clipboardImage) {
          Alert.alert(
            "Paste unavailable",
            "StickerCut couldn't read an image from the clipboard. On iOS this can also mean paste permission was denied.",
          );
          return;
        }

        const nextZIndex = getNextZIndex(project.stickers);

        const sticker = createStickerFromClipboardImage(
          {
            dataUri: clipboardImage.data,
            width: clipboardImage.size.width,
            height: clipboardImage.size.height,
          },
          project.canvas.widthMm,
          project.canvas.heightMm,
          nextZIndex,
          0,
        );

        await commitNewStickers([sticker]);
        return;
      }

      // No image bitmap on the clipboard — see if it's a link to
      // one instead. This covers "Copy image address" and similar,
      // which put text (the URL), not picture data, on the clipboard.
      const hasText = await Clipboard.hasStringAsync();
      const clipboardText = hasText ? (await Clipboard.getStringAsync()).trim() : "";
      const looksLikeUrl = /^https?:\/\/\S+$/i.test(clipboardText);

      if (!looksLikeUrl) {
        Alert.alert(
          "Nothing to paste",
          "Your clipboard doesn't contain an image or a link to one right now.",
        );
        return;
      }

      const nextZIndex = getNextZIndex(project.stickers);

      const sticker = await createStickerFromUrl(
        clipboardText,
        project.canvas.widthMm,
        project.canvas.heightMm,
        nextZIndex,
        0,
      );

      await commitNewStickers([sticker]);
    } catch {
      Alert.alert(
        "Paste failed",
        "StickerCut could not paste that. If you pasted a link, make sure it points directly to an image and that you're online.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  if (loading || !project) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>LOADING PROJECT...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Responsive canvas sizing: the page fits whatever space is actually
  // available on this device/window, rather than a fixed constant —
  // leaving room for the header (~60), canvas info bar (~36), tab row
  // (~40) and tab panel (~140) that sit above/below the workspace.
  const availableWidth = Math.max(120, windowWidth - 40);
  const availableHeight = Math.max(120, windowHeight - 60 - 36 - 40 - 260 - 60 - 20);

  const editorScale = calculateEditorScale(
    project.canvas.widthMm,
    project.canvas.heightMm,
    availableWidth,
    availableHeight,
  );

  const canvasDisplayWidth = mmToDisplay(project.canvas.widthMm, editorScale);
  const canvasDisplayHeight = mmToDisplay(project.canvas.heightMm, editorScale);
  const transparent = project.canvas.background === "transparent";
  const canvasColor = project.canvas.canvasColor ?? DEFAULT_CANVAS_COLOR;

  const sortedStickers = [...project.stickers].sort((a, b) => a.zIndex - b.zIndex);
  const objectCount = project.stickers.length;
  const activeSticker = project.stickers.find((sticker) => sticker.id === selectedStickerId) ?? null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Text style={styles.headerButtonText}>‹ Home</Text>
          </TouchableOpacity>

          <View style={styles.projectInfo}>
            <Text style={styles.projectName} numberOfLines={1}>
              {project.name}
            </Text>
            <Text style={styles.projectMeta}>
              {project.canvas.widthMm}×{project.canvas.heightMm}mm · {objectCount} obj
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>

          {objectCount > 0 && (
            <TouchableOpacity style={styles.doneButton} onPress={handlePreview}>
              <Text style={styles.doneButtonText}>Preview →</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.workspace}>
          <View>
            <View style={styles.rulerGridRow}>
              <View style={styles.cornerSpacer} />
              <CanvasRuler
                orientation="horizontal"
                lengthMm={project.canvas.widthMm}
                editorScale={editorScale}
                onCreateGuide={(positionMm) => handleCreateGuide("horizontal", positionMm)}
              />
            </View>

            <View style={styles.pageRow}>
              <CanvasRuler
                orientation="vertical"
                lengthMm={project.canvas.heightMm}
                editorScale={editorScale}
                onCreateGuide={(positionMm) => handleCreateGuide("vertical", positionMm)}
              />

              {/* Tapping the page itself (not a sticker) clears the
                  selection. This uses the same react-native-gesture-handler
                  Tap gesture as every sticker (see StickerItem.tsx) rather
                  than a plain Pressable — mixing React Native's built-in
                  Touchable/Pressable with gesture-handler in the same
                  touch area is a known source of gesture conflicts. */}
              <GestureDetector
                gesture={Gesture.Tap().onEnd(() => runOnJS(setSelectedStickerId)(null))}
              >
                <View
                  style={[
                    styles.printCanvas,
                    { width: canvasDisplayWidth, height: canvasDisplayHeight },
                    transparent
                      ? styles.transparentCanvas
                      : [styles.whiteCanvas, { backgroundColor: canvasColor }],
                  ]}
                >
                  {transparent && <Checkerboard />}

                  {sortedStickers.map((sticker) => (
                    <StickerItem
                      key={sticker.id}
                      sticker={sticker}
                      editorScale={editorScale}
                      selected={sticker.id === selectedStickerId}
                      onSelect={setSelectedStickerId}
                      onMove={handleStickerMove}
                      onResize={handleStickerResize}
                      onRotate={handleStickerRotate}
                      interactionMode={activeTab === "cutLine" ? "cutLine" : "transform"}
                    />
                  ))}

                  {objectCount === 0 && (
                    <View style={styles.emptyCanvas}>
                      <Text style={styles.emptyCanvasTitle}>ADD IMAGES TO BEGIN</Text>
                      <Text style={styles.emptyCanvasText}>TAP + ADD OR PASTE</Text>
                    </View>
                  )}

                  {(project.guides ?? []).map((guide) => (
                    <GuideLine
                      key={guide.id}
                      guide={guide}
                      pageLengthMm={
                        guide.axis === "horizontal" ? project.canvas.widthMm : project.canvas.heightMm
                      }
                      editorScale={editorScale}
                      onMove={handleMoveGuide}
                      onDelete={handleDeleteGuide}
                    />
                  ))}
                </View>
              </GestureDetector>
            </View>
          </View>
        </View>

        <View style={styles.canvasInfoBar}>
          <Text style={styles.canvasInfoText}>
            {project.canvas.presetId.toUpperCase()} · {project.canvas.widthMm}×
            {project.canvas.heightMm}mm
          </Text>
          <Text style={styles.canvasInfoBadge}>{transparent ? "TRANSPARENT" : "SOLID"}</Text>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "canvas" && styles.tabButtonSelected]}
            onPress={() => setActiveTab("canvas")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "canvas" && styles.tabButtonTextSelected,
              ]}
            >
              CANVAS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "cutLine" && styles.tabButtonSelected]}
            onPress={() => setActiveTab("cutLine")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "cutLine" && styles.tabButtonTextSelected,
              ]}
            >
              CUT LINE
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "canvas" ? (
          <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabPanel}>
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={handleAddToCanvas}
              disabled={isImporting}
            >
              <Text style={styles.addImageIcon}>＋</Text>
              <Text style={styles.addImageText}>
                {isImporting ? "Adding..." : "Add image"}
              </Text>
              <Text style={styles.addImageSubtext}>· Upload or Paste</Text>
            </TouchableOpacity>

            <View>
              <Text style={styles.sectionLabel}>CANVAS BACKGROUND</Text>
              <View style={[styles.backgroundToggleRow, { marginTop: 8 }]}>
                <TouchableOpacity
                  style={[
                    styles.backgroundToggleOption,
                    !transparent && styles.backgroundToggleOptionSelected,
                  ]}
                  onPress={() => handleSetBackground("white")}
                >
                  <Text
                    style={[
                      styles.backgroundToggleText,
                      !transparent && styles.backgroundToggleTextSelected,
                    ]}
                  >
                    Solid
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.backgroundToggleOption,
                    transparent && styles.backgroundToggleOptionSelected,
                  ]}
                  onPress={() => handleSetBackground("transparent")}
                >
                  <Text
                    style={[
                      styles.backgroundToggleText,
                      transparent && styles.backgroundToggleTextSelected,
                    ]}
                  >
                    Transparent
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {!transparent && (
              <View>
                <Text style={styles.sectionLabel}>COLOR</Text>
                <View style={[styles.colorSwatchRow, { marginTop: 8 }]}>
                  {CANVAS_COLOR_SWATCHES.map((swatch) => (
                    <TouchableOpacity
                      key={swatch.id}
                      onPress={() => handleSetCanvasColor(swatch.value)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: swatch.value },
                        canvasColor === swatch.value && styles.colorSwatchSelected,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {objectCount > 0 && (
              <View>
                <View style={styles.objectsHeaderRow}>
                  <Text style={styles.sectionLabel}>OBJECTS — {objectCount}</Text>
                </View>

                <View style={{ gap: 8, marginTop: 8 }}>
                  {[...sortedStickers].reverse().map((sticker) => (
                    <TouchableOpacity
                      key={sticker.id}
                      style={[
                        styles.objectRow,
                        sticker.id === selectedStickerId && styles.objectRowSelected,
                      ]}
                      onPress={() => setSelectedStickerId(sticker.id)}
                    >
                      <Image
                        source={{ uri: sticker.processedUri ?? sticker.sourceUri }}
                        style={styles.objectThumb}
                        contentFit="contain"
                      />

                      <Text style={styles.objectRowLabel} numberOfLines={1}>
                        {sticker.widthMm.toFixed(0)}×{sticker.heightMm.toFixed(0)}mm
                      </Text>

                      <TouchableOpacity
                        style={styles.objectRowIconButton}
                        onPress={() => {
                          setSelectedStickerId(sticker.id);
                          handleDuplicateSelected();
                        }}
                      >
                        <Text style={styles.objectRowIconText}>⧉</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.objectRowIconButton}
                        onPress={() => {
                          setSelectedStickerId(sticker.id);
                          handleDeleteSelected();
                        }}
                      >
                        <Text style={styles.objectRowDeleteText}>×</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabPanel}>
            {!selectedStickerId ? (
              <View style={styles.cutLinePlaceholder}>
                <Text style={styles.cutLinePlaceholderText}>
                  Select a sticker to edit its cut line. Real cut-path generation (tracing,
                  offsetting, exporting) isn't implemented yet — these controls only set a
                  preview outline shown on the selected sticker for now.
                </Text>
              </View>
            ) : (
              <>
                <View>
                  <Text style={styles.sectionLabel}>CUT SHAPE</Text>
                  <View style={[styles.cutShapeRow, { marginTop: 8 }]}>
                    {CUT_SHAPE_OPTIONS.map((option) => {
                      const selectedShape =
                        activeSticker?.cutLine.shape ?? DEFAULT_CUT_LINE_SHAPE;
                      const isSelected = selectedShape === option.id;

                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.cutShapeOption, isSelected && styles.cutShapeOptionSelected]}
                          onPress={() => handleSetCutLineShape(option.id)}
                        >
                          <Text
                            style={[styles.cutShapeLabel, isSelected && styles.cutShapeLabelSelected]}
                          >
                            {option.label}
                          </Text>
                          <Text style={styles.cutShapeHint}>{option.hint}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {(activeSticker?.cutLine.shape ?? DEFAULT_CUT_LINE_SHAPE) === "tight" && (
                    <Text style={[styles.cutLineNote, { marginTop: 6 }]}>
                      "Tight" contour tracing isn't implemented yet — showing the Round preview
                      instead.
                    </Text>
                  )}
                </View>

                <View>
                  <Text style={styles.sectionLabel}>LINE COLOR</Text>
                  <View style={[styles.colorSwatchRow, { marginTop: 8 }]}>
                    {CUT_LINE_COLOR_SWATCHES.map((swatch) => {
                      const selectedColor = activeSticker?.cutLine.color ?? DEFAULT_CUT_LINE_COLOR;
                      const isSelected = selectedColor === swatch.value;

                      return (
                        <TouchableOpacity
                          key={swatch.id}
                          onPress={() => handleSetCutLineColor(swatch.value)}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: swatch.value },
                            isSelected && styles.colorSwatchSelected,
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        )}

        {selectedStickerId && (
          <View style={styles.selectionActionsRow}>
            <TouchableOpacity
              style={[
                styles.selectionActionButton,
                !(activeSticker?.aspectLocked ?? true) && styles.selectionActionButtonActive,
              ]}
              onPress={handleToggleAspectLocked}
            >
              <Text
                style={[
                  styles.selectionActionText,
                  !(activeSticker?.aspectLocked ?? true) && styles.selectionActionTextActive,
                ]}
              >
                Ratio: {(activeSticker?.aspectLocked ?? true) ? "Locked" : "Free"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.selectionActionButton} onPress={handleRevertSelected}>
              <Text style={styles.selectionActionText}>Revert</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.selectionActionButton} onPress={handleDuplicateSelected}>
              <Text style={styles.selectionActionText}>Duplicate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectionActionButton, styles.selectionActionButtonDanger]}
              onPress={handleDeleteSelected}
            >
              <Text style={[styles.selectionActionText, styles.selectionActionTextDanger]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Checkerboard() {
  const columns = 12;
  const rows = 16;

  const cells = Array.from({ length: columns * rows });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.checkerboard}>
        {cells.map((_, index) => {
          const row = Math.floor(index / columns);
          const column = index % columns;
          const dark = (row + column) % 2 === 0;

          return (
            <View
              key={index}
              style={[
                styles.checkerCell,
                {
                  width: `${100 / columns}%`,
                  height: `${100 / rows}%`,
                  backgroundColor: dark ? Colors.checkerDark : Colors.checkerLight,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}
