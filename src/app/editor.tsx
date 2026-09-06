import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";

import { useEffect, useState } from "react";

import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { SafeAreaView } from "react-native-safe-area-context";

import { BlueprintGrid } from "@/components/BlueprintGrid";
import { StickerItem } from "@/components/editor/StickerItem";

import { Colors } from "@/constants/colors";

import {
  createStickerFromClipboardImage,
  createStickerFromImportedImage,
  createStickerFromUrl,
} from "@/image/importImage";

import { getProject, saveProject } from "@/storage/projectStorage";

import { styles } from "@/styles/editor.styles";

import type { StickerObject } from "@/types/sticker";
import type { StickerProject } from "@/types/project";

import { createId } from "@/utils/ids";
import { getImageDimensions } from "@/utils/imageDimensions";
import { getNextZIndex, MIN_STICKER_MM } from "@/utils/stickers";
import { calculateEditorScale, mmToDisplay } from "@/utils/units";

export default function EditorScreen() {
  const params = useLocalSearchParams<{
    projectId?: string;
    presetId?: string;
    widthMm?: string;
    heightMm?: string;
    background?: string;
    orientation?: string;
  }>();

  const [project, setProject] = useState<StickerProject | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
      name: "Untitled Project",
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
   * Applies a finished drag-to-move gesture. Called once, when the
   * finger lifts (see StickerItem.tsx) — never per-frame — with the
   * physical distance moved in mm. A no-op delta (a tap that never
   * became a drag) is skipped so tapping a sticker doesn't trigger
   * an unnecessary autosave.
   */
  function handleStickerMove(id: string, deltaXMm: number, deltaYMm: number) {
    if (!project || (deltaXMm === 0 && deltaYMm === 0)) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      stickers: project.stickers.map((sticker) =>
        sticker.id === id
          ? { ...sticker, xMm: sticker.xMm + deltaXMm, yMm: sticker.yMm + deltaYMm }
          : sticker,
      ),
    };

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {
      // Same fallback reasoning as commitNewStickers below: the
      // manual Save button still covers a failed autosave.
    });
  }

  /**
   * Applies a finished drag-to-resize gesture (bottom-right handle
   * only — see StickerItem.tsx). MIN_STICKER_MM stops a sticker from
   * being shrunk to nothing or flipped to a negative size; the same
   * floor is also applied live, in the gesture itself, so the
   * visual drag and the committed result never disagree.
   */
  function handleStickerResize(id: string, deltaWidthMm: number, deltaHeightMm: number) {
    if (!project) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,
      stickers: project.stickers.map((sticker) => {
        if (sticker.id !== id) {
          return sticker;
        }

        return {
          ...sticker,
          widthMm: Math.max(MIN_STICKER_MM, sticker.widthMm + deltaWidthMm),
          heightMm: Math.max(MIN_STICKER_MM, sticker.heightMm + deltaHeightMm),
        };
      }),
    };

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {
      // Same fallback reasoning as commitNewStickers below: the
      // manual Save button still covers a failed autosave.
    });
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

  /**
   * "+ ADD" opens this chooser instead of jumping straight to
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
   *
   * expo-clipboard's image support works in Expo Go on Android/iOS
   * (confirmed via the versioned SDK docs — no dev build required).
   * On iOS 16+, a denied paste permission also returns null from
   * getImageAsync, which is indistinguishable from "no image on the
   * clipboard" — the message below covers both cases honestly.
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

  const maxCanvasWidth = 285;
  const maxCanvasHeight = 410;

  const editorScale = calculateEditorScale(
    project.canvas.widthMm,
    project.canvas.heightMm,
    maxCanvasWidth,
    maxCanvasHeight,
  );

  const canvasDisplayWidth = mmToDisplay(project.canvas.widthMm, editorScale);
  const canvasDisplayHeight = mmToDisplay(project.canvas.heightMm, editorScale);
  const transparent = project.canvas.background === "transparent";

  const sortedStickers = [...project.stickers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Text style={styles.headerButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.projectInfo}>
            <Text style={styles.projectLabel}>PROJECT</Text>
            <Text style={styles.projectName} numberOfLines={1}>
              {project.name.toUpperCase()}
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>SAVE</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.workspace}>
          <BlueprintGrid />

          <View style={styles.topRuler}>
            <Text style={styles.rulerText}>0</Text>
            <Text style={styles.rulerText}>50</Text>
            <Text style={styles.rulerText}>100</Text>
            <Text style={styles.rulerText}>150</Text>
            <Text style={styles.rulerText}>200</Text>
            <Text style={styles.rulerUnit}>mm</Text>
          </View>

          <View style={styles.workspaceCenter}>
            {/* Tapping the canvas itself (not a sticker) clears the
                selection. This uses the same react-native-gesture-handler
                Tap gesture as every sticker (see StickerItem.tsx) rather
                than a plain Pressable — mixing React Native's built-in
                Touchable/Pressable with gesture-handler in the same
                touch area is a known source of exactly the bug this
                fixed: a sticker's own drag (a continuous Pan gesture)
                was getting intercepted by this Pressable ancestor's
                older responder system before it could fully take over,
                even though quick taps still got through fine. */}
            <GestureDetector gesture={Gesture.Tap().onEnd(() => runOnJS(setSelectedStickerId)(null))}>
              <View
                style={[
                  styles.printCanvas,
                  { width: canvasDisplayWidth, height: canvasDisplayHeight },
                  transparent ? styles.transparentCanvas : styles.whiteCanvas,
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
                  />
                ))}

                {project.stickers.length === 0 && (
                  <View style={styles.emptyCanvas}>
                    <Text style={styles.emptyCanvasTitle}>EMPTY CANVAS</Text>
                    <Text style={styles.emptyCanvasText}>Tap + ADD to place artwork</Text>
                  </View>
                )}
              </View>
            </GestureDetector>
          </View>

          <View style={styles.canvasReadout}>
            <View>
              <Text style={styles.readoutLabel}>CANVAS</Text>
              <Text style={styles.readoutValue}>
                {project.canvas.widthMm}
                {" × "}
                {project.canvas.heightMm} mm
              </Text>
            </View>

            <View style={styles.scaleBox}>
              <Text style={styles.scaleText}>FIT</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddToCanvas}
            disabled={isImporting}
          >
            <Text style={styles.addIcon}>＋</Text>
            <Text style={styles.addText}>{isImporting ? "..." : "ADD"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickButton}>
            <Text style={styles.quickIcon}>⌗</Text>
            <Text style={styles.quickText}>ARRANGE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickButton} onPress={() => router.push("/preview")}>
            <Text style={styles.quickIcon}>◉</Text>
            <Text style={styles.quickText}>PREVIEW</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <ToolbarButton icon="▱" label="CANVAS" selected />
          <ToolbarButton icon="✂" label="CUT" />
          <ToolbarButton icon="↔" label="SIZE" />
          <ToolbarButton icon="▣" label="OBJECTS" />
          <ToolbarButton icon="⇧" label="PRINT" />
        </View>
      </View>
    </SafeAreaView>
  );
}

function ToolbarButton({
  icon,
  label,
  selected = false,
}: {
  icon: string;
  label: string;
  selected?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.toolbarButton}>
      <Text style={[styles.toolbarIcon, selected && styles.toolbarIconSelected]}>{icon}</Text>
      <Text style={[styles.toolbarText, selected && styles.toolbarTextSelected]}>{label}</Text>
    </TouchableOpacity>
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
