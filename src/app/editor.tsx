import { router, useLocalSearchParams } from "expo-router";

import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

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

import { SafeAreaView } from "react-native-safe-area-context";

import { CanvasRuler } from "@/components/editor/CanvasRuler";
import { GuideLine } from "@/components/editor/GuideLine";
import { StickerItem } from "@/components/editor/StickerItem";

import {
  CANVAS_COLOR_SWATCHES,
  DEFAULT_CANVAS_COLOR,
} from "@/constants/canvas-colors";

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

import type { CanvasGuide, StickerProject } from "@/types/project";

import type { StickerObject } from "@/types/sticker";

import { createId } from "@/utils/ids";

import { getImageDimensions } from "@/utils/imageDimensions";

import {
  computeDefaultStickerSizeMm,
  getNextZIndex,
  MIN_STICKER_MM,
} from "@/utils/stickers";

import { clampStickerPositionMm } from "@/utils/stickerTransformMath";

import { calculateEditorScale, mmToDisplay } from "@/utils/units";

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

  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(
    null,
  );

  const [isImporting, setIsImporting] = useState(false);

  const [activeTab, setActiveTab] = useState<EditorTab>("canvas");

  /**
   * Temporary reference guide while the user is still dragging
   * from one of the rulers.
   *
   * It becomes part of project.guides only when the drag finishes.
   */
  const [draftGuide, setDraftGuide] = useState<{
    axis: CanvasGuide["axis"];
    positionMm: number;
  } | null>(null);

  useEffect(() => {
    initialiseProject();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // PROJECT INITIALISATION
  // ============================================================

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

        orientation:
          params.orientation === "landscape" ? "landscape" : "portrait",

        background:
          params.background === "transparent" ? "transparent" : "white",
      },

      stickers: [],

      guides: [],

      themeId:
        params.themeId === "dark" ||
        params.themeId === "light" ||
        params.themeId === "pink"
          ? params.themeId
          : DEFAULT_THEME_ID,
    };

    setProject(created);

    setLoading(false);
  }

  // ============================================================
  // SAVE / PREVIEW
  // ============================================================

  async function handleSave() {
    if (!project) {
      return;
    }

    try {
      await saveProject(project);

      Alert.alert(
        "Project saved",
        "Your StickerCut project was saved on this device.",
      );
    } catch {
      Alert.alert("Save failed", "StickerCut could not save this project.");
    }
  }

  /**
   * Preview reloads the project from storage, so save the current
   * state before navigating.
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
        "StickerCut couldn't save the current project first.",
      );

      return;
    }

    router.push({
      pathname: "/preview",

      params: {
        projectId: project.id,
      },
    });
  }

  // ============================================================
  // STICKER TRANSFORM FUNCTIONS
  // ============================================================

  /**
   * Permanent sticker coordinates are stored in millimeters.
   *
   * StickerItem performs the live display movement and reports only
   * the final physical delta when the gesture ends.
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

        return {
          ...sticker,

          xMm: clamped.xMm,

          yMm: clamped.yMm,
        };
      }),
    };

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {});
  }

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

    if (
      deltaWidthMm === 0 &&
      deltaHeightMm === 0 &&
      deltaXMm === 0 &&
      deltaYMm === 0
    ) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,

      stickers: project.stickers.map((sticker) => {
        if (sticker.id !== id) {
          return sticker;
        }

        const widthMm = Math.max(
          MIN_STICKER_MM,

          sticker.widthMm + deltaWidthMm,
        );

        const heightMm = Math.max(
          MIN_STICKER_MM,

          sticker.heightMm + deltaHeightMm,
        );

        const clamped = clampStickerPositionMm(
          sticker.xMm + deltaXMm,

          sticker.yMm + deltaYMm,

          widthMm,
          heightMm,

          project.canvas.widthMm,

          project.canvas.heightMm,
        );

        return {
          ...sticker,

          xMm: clamped.xMm,

          yMm: clamped.yMm,

          widthMm,
          heightMm,
        };
      }),
    };

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {});
  }

  function handleStickerRotate(id: string, deltaDegrees: number) {
    if (!project || deltaDegrees === 0) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,

      stickers: project.stickers.map((sticker) => {
        if (sticker.id !== id) {
          return sticker;
        }

        const rotation =
          (((sticker.rotation + deltaDegrees) % 360) + 360) % 360;

        return {
          ...sticker,
          rotation,
        };
      }),
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
          ? {
              ...sticker,

              aspectLocked: !(sticker.aspectLocked ?? true),
            }
          : sticker,
      ),
    };

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {});
  }

  /**
   * Reset size/rotation but keep the sticker's current position.
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

        const sourceWidth = sticker.originalWidthPx;

        const sourceHeight = sticker.originalHeightPx;

        if (!sourceWidth || !sourceHeight) {
          return {
            ...sticker,

            rotation: 0,

            aspectLocked: true,
          };
        }

        const { widthMm, heightMm } = computeDefaultStickerSizeMm(
          sourceWidth,
          sourceHeight,
        );

        const clamped = clampStickerPositionMm(
          sticker.xMm,
          sticker.yMm,

          widthMm,
          heightMm,

          project.canvas.widthMm,

          project.canvas.heightMm,
        );

        return {
          ...sticker,

          xMm: clamped.xMm,

          yMm: clamped.yMm,

          widthMm,
          heightMm,

          rotation: 0,

          aspectLocked: true,
        };
      }),
    };

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {});
  }

  // ============================================================
  // DUPLICATE / DELETE
  // ============================================================

  async function commitNewStickers(newStickers: StickerObject[]) {
    if (!project || newStickers.length === 0) {
      return;
    }

    /**
     * Existing stickers remain untouched.
     *
     * New stickers are appended so importing B never removes A.
     */
    const updatedProject: StickerProject = {
      ...project,

      stickers: [...project.stickers, ...newStickers],
    };

    setProject(updatedProject);

    setSelectedStickerId(newStickers[newStickers.length - 1].id);

    try {
      await saveProject(updatedProject);
    } catch {
      /**
       * Manual Save remains available if autosave fails.
       */
    }
  }

  function handleDuplicateSticker(id: string) {
    if (!project) {
      return;
    }

    const source = project.stickers.find((sticker) => sticker.id === id);

    if (!source) {
      return;
    }

    const maxX = Math.max(
      0,

      project.canvas.widthMm - source.widthMm,
    );

    const maxY = Math.max(
      0,

      project.canvas.heightMm - source.heightMm,
    );

    const duplicate: StickerObject = {
      ...source,

      id: createId("sticker"),

      xMm: Math.min(
        source.xMm + DUPLICATE_OFFSET_MM,

        maxX,
      ),

      yMm: Math.min(
        source.yMm + DUPLICATE_OFFSET_MM,

        maxY,
      ),

      zIndex: getNextZIndex(project.stickers),
    };

    void commitNewStickers([duplicate]);
  }

  function handleDeleteSticker(id: string) {
    if (!project) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,

      stickers: project.stickers.filter((sticker) => sticker.id !== id),
    };

    setSelectedStickerId((current) => (current === id ? null : current));

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {});
  }

  // ============================================================
  // CUT-LINE PREVIEW SETTINGS
  // ============================================================

  function handleSetCutLineShape(
    shape: (typeof CUT_SHAPE_OPTIONS)[number]["id"],
  ) {
    if (!project || !selectedStickerId) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,

      stickers: project.stickers.map((sticker) =>
        sticker.id === selectedStickerId
          ? {
              ...sticker,

              cutLine: {
                ...sticker.cutLine,
                shape,
              },
            }
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
          ? {
              ...sticker,

              cutLine: {
                ...sticker.cutLine,
                color,
              },
            }
          : sticker,
      ),
    };

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {});
  }

  // ============================================================
  // REFERENCE GUIDES
  // ============================================================

  function handleCreateGuide(
    axis: CanvasGuide["axis"],

    positionMm: number,
  ) {
    if (!project) {
      return;
    }

    const maxPosition =
      axis === "horizontal" ? project.canvas.heightMm : project.canvas.widthMm;

    const clampedPosition = Math.min(
      Math.max(0, positionMm),

      maxPosition,
    );

    const guide: CanvasGuide = {
      id: createId("guide"),

      axis,

      positionMm: clampedPosition,
    };

    const updatedProject: StickerProject = {
      ...project,

      guides: [...(project.guides ?? []), guide],
    };

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {});
  }

  function handleGuideDragStart(axis: CanvasGuide["axis"]) {
    setDraftGuide({
      axis,
      positionMm: 0,
    });
  }

  function handleGuideDrag(
    axis: CanvasGuide["axis"],

    positionMm: number,
  ) {
    setDraftGuide({
      axis,
      positionMm,
    });
  }

  function handleGuideDragEnd(
    axis: CanvasGuide["axis"],

    positionMm: number | null,
  ) {
    setDraftGuide(null);

    if (positionMm !== null) {
      handleCreateGuide(axis, positionMm);
    }
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

        const maxMm =
          guide.axis === "horizontal"
            ? project.canvas.heightMm
            : project.canvas.widthMm;

        return {
          ...guide,

          positionMm: Math.min(
            Math.max(0, positionMm),

            maxMm,
          ),
        };
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

  // ============================================================
  // CANVAS SETTINGS
  // ============================================================

  function handleSetBackground(background: "white" | "transparent") {
    if (!project) {
      return;
    }

    const updatedProject: StickerProject = {
      ...project,

      canvas: {
        ...project.canvas,
        background,
      },
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

      canvas: {
        ...project.canvas,

        canvasColor: color,
      },
    };

    setProject(updatedProject);

    saveProject(updatedProject).catch(() => {});
  }

  // ============================================================
  // IMPORT MENU
  // ============================================================

  function handleAddToCanvas() {
    if (isImporting) {
      return;
    }

    Alert.alert(
      "Add to Canvas",

      "Choose where to import artwork from.",

      [
        {
          text: "Photos",

          onPress: handleAddFromPhotos,
        },

        {
          text: "Files",

          onPress: handleAddFromFiles,
        },

        {
          text: "Paste",

          onPress: handlePasteFromClipboard,
        },

        {
          text: "Cancel",

          style: "cancel",
        },
      ],
    );
  }

  // ============================================================
  // PHOTO IMPORT
  // ============================================================

  async function handleAddFromPhotos() {
    if (!project || isImporting) {
      return;
    }

    setIsImporting(true);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

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
          {
            uri: asset.uri,

            width: asset.width,

            height: asset.height,

            fileName: asset.fileName,
          },

          project.canvas.widthMm,

          project.canvas.heightMm,

          nextZIndex,

          /**
           * Existing count + local import count means repeated
           * imports don't all receive identical starting positions.
           */
          project.stickers.length + newStickers.length,
        );

        newStickers.push(sticker);

        nextZIndex += 1;
      }

      await commitNewStickers(newStickers);
    } catch (error) {
      console.error("Photo import failed:", error);

      Alert.alert(
        "Import failed",

        "StickerCut could not import that image.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  // ============================================================
  // FILE IMPORT
  // ============================================================

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
          {
            uri: asset.uri,

            width,
            height,

            fileName: asset.name,
          },

          project.canvas.widthMm,

          project.canvas.heightMm,

          nextZIndex,

          project.stickers.length + newStickers.length,
        );

        newStickers.push(sticker);

        nextZIndex += 1;
      }

      await commitNewStickers(newStickers);
    } catch (error) {
      console.error("File import failed:", error);

      Alert.alert(
        "Import failed",

        "StickerCut could not import that file.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  // ============================================================
  // CLIPBOARD / URL IMPORT
  // ============================================================

  async function handlePasteFromClipboard() {
    if (!project || isImporting) {
      return;
    }

    setIsImporting(true);

    try {
      /**
       * First try a REAL clipboard image.
       *
       * This covers Copy Image / copied screenshots where supported.
       */
      const hasImage = await Clipboard.hasImageAsync();

      if (hasImage) {
        const clipboardImage = await Clipboard.getImageAsync({
          format: "png",
        });

        if (!clipboardImage) {
          Alert.alert(
            "Paste unavailable",

            "StickerCut found image data but could not read it.",
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

          project.stickers.length,
        );

        await commitNewStickers([sticker]);

        return;
      }

      /**
       * If the clipboard isn't an image bitmap, try clipboard text.
       *
       * Unlike the old implementation, the whole clipboard does NOT
       * have to be exactly one URL.
       *
       * For example:
       *
       * "Look at this image https://example.com/image.png"
       *
       * will still find the URL.
       */
      const hasText = await Clipboard.hasStringAsync();

      const clipboardText = hasText
        ? (await Clipboard.getStringAsync()).trim()
        : "";

      const urlMatch = clipboardText.match(/https?:\/\/[^\s<>"']+/i);

      if (!urlMatch) {
        Alert.alert(
          "Nothing to paste",

          "Copy an image, image address, or webpage containing an image and try again.",
        );

        return;
      }

      const pastedUrl = urlMatch[0];

      const nextZIndex = getNextZIndex(project.stickers);

      /**
       * createStickerFromUrl() now uses the improved URL downloader.
       *
       * It can support:
       *
       * direct image URL
       *
       * or
       *
       * webpage URL
       * → HTML
       * → og:image/twitter:image
       * → actual image
       */
      const sticker = await createStickerFromUrl(
        pastedUrl,

        project.canvas.widthMm,

        project.canvas.heightMm,

        nextZIndex,

        project.stickers.length,
      );

      await commitNewStickers([sticker]);
    } catch (error) {
      console.error("Clipboard paste failed:", error);

      const message =
        error instanceof Error
          ? error.message
          : "StickerCut could not paste that image.";

      Alert.alert("Paste failed", message);
    } finally {
      setIsImporting(false);
    }
  }

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading || !project) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>LOADING PROJECT...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // DISPLAY GEOMETRY
  // ============================================================

  /**
   * The page preserves physical proportions.
   *
   * It scales only for display — project geometry remains in mm.
   */
  const availableWidth = Math.max(
    120,

    windowWidth - 48,
  );

  /**
   * The editor intentionally reserves vertical space for:
   *
   * header
   * canvas status
   * tabs
   * control panel
   * selected-object actions
   */
  const availableHeight = Math.max(
    120,

    windowHeight * 0.36,
  );

  const editorScale = calculateEditorScale(
    project.canvas.widthMm,

    project.canvas.heightMm,

    availableWidth,
    availableHeight,
  );

  const canvasDisplayWidth = mmToDisplay(
    project.canvas.widthMm,

    editorScale,
  );

  const canvasDisplayHeight = mmToDisplay(
    project.canvas.heightMm,

    editorScale,
  );

  const transparent = project.canvas.background === "transparent";

  const canvasColor = project.canvas.canvasColor ?? DEFAULT_CANVAS_COLOR;

  const sortedStickers = [...project.stickers].sort(
    (a, b) => a.zIndex - b.zIndex,
  );

  const objectCount = project.stickers.length;

  const activeSticker =
    project.stickers.find((sticker) => sticker.id === selectedStickerId) ??
    null;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* =====================================================
            HEADER
        ====================================================== */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Text style={styles.headerButtonText}>‹ Home</Text>
          </TouchableOpacity>

          <View style={styles.projectInfo}>
            <Text style={styles.projectName} numberOfLines={1}>
              {project.name}
            </Text>

            <Text style={styles.projectMeta}>
              {project.canvas.widthMm}×{project.canvas.heightMm}
              mm · {objectCount} obj
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* =====================================================
            WORKSPACE
        ====================================================== */}

        <View style={styles.workspace}>
          <View>
            {/* TOP RULER */}

            <View style={styles.rulerGridRow}>
              <View style={styles.cornerSpacer} />

              <CanvasRuler
                orientation="horizontal"
                lengthMm={project.canvas.widthMm}
                editorScale={editorScale}
                onGuideDragStart={() => handleGuideDragStart("horizontal")}
                onGuideDrag={(positionMm) =>
                  handleGuideDrag("horizontal", positionMm)
                }
                onGuideDragEnd={(positionMm) =>
                  handleGuideDragEnd("horizontal", positionMm)
                }
              />
            </View>

            <View style={styles.pageRow}>
              {/* LEFT RULER */}

              <CanvasRuler
                orientation="vertical"
                lengthMm={project.canvas.heightMm}
                editorScale={editorScale}
                onGuideDragStart={() => handleGuideDragStart("vertical")}
                onGuideDrag={(positionMm) =>
                  handleGuideDrag("vertical", positionMm)
                }
                onGuideDragEnd={(positionMm) =>
                  handleGuideDragEnd("vertical", positionMm)
                }
              />

              {/*
                IMPORTANT:

                There is intentionally NO parent GestureDetector around
                this page.

                StickerItem owns:
                - selection
                - move
                - resize
                - rotation

                That prevents a canvas tap gesture from stealing the
                same pointer event.
              */}
              <View
                style={[
                  styles.printCanvas,

                  {
                    width: canvasDisplayWidth,

                    height: canvasDisplayHeight,
                  },

                  transparent
                    ? styles.transparentCanvas
                    : [
                        styles.whiteCanvas,

                        {
                          backgroundColor: canvasColor,
                        },
                      ],
                ]}
              >
                {transparent && <Checkerboard />}

                {/* STICKERS */}

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
                    interactionMode={
                      activeTab === "cutLine" ? "cutLine" : "transform"
                    }
                  />
                ))}

                {/* EMPTY CANVAS MESSAGE */}

                {objectCount === 0 && (
                  <View pointerEvents="none" style={styles.emptyCanvas}>
                    <Text style={styles.emptyCanvasTitle}>
                      ADD IMAGES TO BEGIN
                    </Text>

                    <Text style={styles.emptyCanvasText}>
                      TAP + ADD OR PASTE
                    </Text>
                  </View>
                )}

                {/* SAVED GUIDES */}

                {(project.guides ?? []).map((guide) => (
                  <GuideLine
                    key={guide.id}
                    guide={guide}
                    pageLengthMm={
                      guide.axis === "horizontal"
                        ? project.canvas.widthMm
                        : project.canvas.heightMm
                    }
                    editorScale={editorScale}
                    onMove={handleMoveGuide}
                    onDelete={handleDeleteGuide}
                  />
                ))}

                {/* GUIDE CURRENTLY BEING DRAGGED */}

                {draftGuide && (
                  <View
                    pointerEvents="none"
                    style={[
                      draftGuide.axis === "horizontal"
                        ? styles.draftGuideHorizontal
                        : styles.draftGuideVertical,

                      draftGuide.axis === "horizontal"
                        ? {
                            top: draftGuide.positionMm * editorScale,
                          }
                        : {
                            left: draftGuide.positionMm * editorScale,
                          },
                    ]}
                  />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* =====================================================
            CANVAS INFORMATION
        ====================================================== */}

        <View style={styles.canvasInfoBar}>
          <Text style={styles.canvasInfoText}>
            {project.canvas.presetId.toUpperCase()} · {project.canvas.widthMm}×
            {project.canvas.heightMm}
            mm
          </Text>

          <View
            style={{
              flexDirection: "row",

              alignItems: "center",

              gap: 12,
            }}
          >
            <Text style={styles.canvasInfoBadge}>
              {transparent ? "TRANSPARENT" : "SOLID"}
            </Text>

            {objectCount > 0 && (
              <TouchableOpacity onPress={handlePreview}>
                <Text style={styles.canvasInfoBadge}>PREVIEW →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* =====================================================
            SELECTED OBJECT ACTIONS

            No fake Remove BG button appears here because the actual
            background-removal processing pipeline has not been
            implemented yet.
        ====================================================== */}

        {selectedStickerId && activeSticker && (
          <View style={styles.selectionActionsRow}>
            <TouchableOpacity
              style={[
                styles.selectionActionButton,

                !(activeSticker.aspectLocked ?? true) &&
                  styles.selectionActionButtonActive,
              ]}
              onPress={handleToggleAspectLocked}
            >
              <Text
                style={[
                  styles.selectionActionText,

                  !(activeSticker.aspectLocked ?? true) &&
                    styles.selectionActionTextActive,
                ]}
              >
                Ratio {(activeSticker.aspectLocked ?? true) ? "✓" : "Free"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectionActionButton}
              onPress={handleRevertSelected}
            >
              <Text style={styles.selectionActionText}>Revert</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectionActionButton}
              onPress={() => handleDuplicateSticker(selectedStickerId)}
            >
              <Text style={styles.selectionActionText}>Duplicate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectionActionButton,
                styles.selectionActionButtonDanger,
              ]}
              onPress={() => handleDeleteSticker(selectedStickerId)}
            >
              <Text
                style={[
                  styles.selectionActionText,
                  styles.selectionActionTextDanger,
                ]}
              >
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* =====================================================
            CANVAS / CUT LINE TABS
        ====================================================== */}

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[
              styles.tabButton,

              activeTab === "canvas" && styles.tabButtonSelected,
            ]}
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
            style={[
              styles.tabButton,

              activeTab === "cutLine" && styles.tabButtonSelected,
            ]}
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

        {/* =====================================================
            CANVAS TAB
        ====================================================== */}

        {activeTab === "canvas" ? (
          <ScrollView
            style={styles.tabScroll}
            contentContainerStyle={styles.tabPanel}
            keyboardShouldPersistTaps="handled"
          >
            {/* ADD IMAGE */}

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

            {/* CANVAS BACKGROUND */}

            <View>
              <Text style={styles.sectionLabel}>CANVAS BACKGROUND</Text>

              <View
                style={[
                  styles.backgroundToggleRow,

                  {
                    marginTop: 8,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.backgroundToggleOption,

                    !transparent && styles.backgroundToggleOptionSelected,
                  ]}
                  onPress={() => handleSetBackground("white")}
                >
                  <View
                    style={{
                      width: 30,

                      height: 16,

                      marginBottom: 5,

                      borderWidth: 1,

                      borderColor: Colors.border,

                      backgroundColor: canvasColor,
                    }}
                  />

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
                  <MiniCheckerboard />

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

            {/* SOLID BACKGROUND COLOR */}

            {!transparent && (
              <View>
                <Text style={styles.sectionLabel}>COLOR</Text>

                <View
                  style={[
                    styles.colorSwatchRow,

                    {
                      marginTop: 8,
                    },
                  ]}
                >
                  {CANVAS_COLOR_SWATCHES.map((swatch) => (
                    <TouchableOpacity
                      key={swatch.id}
                      accessibilityLabel={swatch.id}
                      onPress={() => handleSetCanvasColor(swatch.value)}
                      style={[
                        styles.colorSwatch,

                        {
                          backgroundColor: swatch.value,
                        },

                        canvasColor === swatch.value &&
                          styles.colorSwatchSelected,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* OBJECTS */}

            {objectCount > 0 && (
              <View>
                <View style={styles.objectsHeaderRow}>
                  <Text style={styles.sectionLabel}>
                    OBJECTS — {objectCount}
                  </Text>
                </View>

                <View
                  style={{
                    gap: 8,

                    marginTop: 8,
                  }}
                >
                  {[...sortedStickers].reverse().map((sticker) => (
                    <TouchableOpacity
                      key={sticker.id}
                      style={[
                        styles.objectRow,

                        sticker.id === selectedStickerId &&
                          styles.objectRowSelected,
                      ]}
                      onPress={() => setSelectedStickerId(sticker.id)}
                    >
                      <Image
                        source={{
                          uri: sticker.processedUri ?? sticker.sourceUri,
                        }}
                        style={styles.objectThumb}
                        contentFit="contain"
                      />

                      <Text style={styles.objectRowLabel} numberOfLines={1}>
                        {sticker.widthMm.toFixed(1)}×
                        {sticker.heightMm.toFixed(1)}
                        mm
                      </Text>

                      <TouchableOpacity
                        style={styles.objectRowIconButton}
                        onPress={() => handleDuplicateSticker(sticker.id)}
                      >
                        <Text style={styles.objectRowIconText}>⧉</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.objectRowIconButton}
                        onPress={() => handleDeleteSticker(sticker.id)}
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
          /* ===================================================
             CUT LINE TAB
          ==================================================== */

          <ScrollView
            style={styles.tabScroll}
            contentContainerStyle={styles.tabPanel}
          >
            {!activeSticker ? (
              <View style={styles.cutLinePlaceholder}>
                <Text style={styles.cutLinePlaceholderText}>
                  Select a sticker to edit its cut-line preview.
                </Text>
              </View>
            ) : (
              <>
                <View>
                  <Text style={styles.sectionLabel}>CUT SHAPE</Text>

                  <View
                    style={[
                      styles.cutShapeRow,

                      {
                        marginTop: 8,
                      },
                    ]}
                  >
                    {CUT_SHAPE_OPTIONS.map((option) => {
                      const selectedShape =
                        activeSticker.cutLine.shape ?? DEFAULT_CUT_LINE_SHAPE;

                      const selected = selectedShape === option.id;

                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.cutShapeOption,

                            selected && styles.cutShapeOptionSelected,
                          ]}
                          onPress={() => handleSetCutLineShape(option.id)}
                        >
                          <Text
                            style={[
                              styles.cutShapeLabel,

                              selected && styles.cutShapeLabelSelected,
                            ]}
                          >
                            {option.label}
                          </Text>

                          <Text style={styles.cutShapeHint}>{option.hint}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {(activeSticker.cutLine.shape ?? DEFAULT_CUT_LINE_SHAPE) ===
                    "tight" && (
                    <Text
                      style={[
                        styles.cutLineNote,

                        {
                          marginTop: 7,
                        },
                      ]}
                    >
                      Tight contour tracing is not implemented yet. This is
                      currently only a preview mode.
                    </Text>
                  )}
                </View>

                <View>
                  <Text style={styles.sectionLabel}>LINE COLOR</Text>

                  <View
                    style={[
                      styles.colorSwatchRow,

                      {
                        marginTop: 8,
                      },
                    ]}
                  >
                    {CUT_LINE_COLOR_SWATCHES.map((swatch) => {
                      const selectedColor =
                        activeSticker.cutLine.color ?? DEFAULT_CUT_LINE_COLOR;

                      const selected = selectedColor === swatch.value;

                      return (
                        <TouchableOpacity
                          key={swatch.id}
                          onPress={() => handleSetCutLineColor(swatch.value)}
                          style={[
                            styles.colorSwatch,

                            {
                              backgroundColor: swatch.value,
                            },

                            selected && styles.colorSwatchSelected,
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
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// CHECKERBOARD
// ============================================================

function Checkerboard() {
  const columns = 12;

  const rows = 16;

  const cells = Array.from({
    length: columns * rows,
  });

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

                  backgroundColor: dark
                    ? Colors.checkerDark
                    : Colors.checkerLight,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

/**
 * Small checkerboard sample used inside the Transparent button.
 */
function MiniCheckerboard() {
  return (
    <View
      style={{
        width: 30,

        height: 16,

        flexDirection: "row",

        flexWrap: "wrap",

        marginBottom: 5,

        overflow: "hidden",

        borderWidth: 1,

        borderColor: Colors.border,
      }}
    >
      {Array.from({
        length: 8,
      }).map((_, index) => (
        <View
          key={index}
          style={{
            width: "25%",

            height: "50%",

            backgroundColor:
              (Math.floor(index / 4) + (index % 4)) % 2 === 0
                ? Colors.checkerLight
                : Colors.checkerDark,
          }}
        />
      ))}
    </View>
  );
}
