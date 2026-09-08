import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";

import { useEffect, useState } from "react";

import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { DEFAULT_CANVAS_COLOR } from "@/constants/canvas-colors";
import { Colors } from "@/constants/colors";

import { getProject } from "@/storage/projectStorage";

import { styles } from "@/styles/preview.styles";

import type { StickerProject } from "@/types/project";

import { calculateEditorScale, mmToDisplay } from "@/utils/units";

/**
 * Production preview: loads the saved project BY ID (never the
 * editor's in-memory state — see editor.tsx's handlePreview, which
 * saves before navigating here) and renders exactly what would print
 * — background, and every sticker's real xMm/yMm/widthMm/heightMm/
 * rotation/zIndex. No grid, no rulers, no guides, no selection boxes,
 * no editor controls: this screen reads project.canvas and
 * project.stickers only, and never project.guides, so reference
 * guides can never leak into a preview or a future export.
 */
export default function PreviewScreen() {
  const params = useLocalSearchParams<{ projectId?: string }>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [project, setProject] = useState<StickerProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!params.projectId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const loaded = await getProject(params.projectId);

      if (cancelled) {
        return;
      }

      if (!loaded) {
        setNotFound(true);
      } else {
        setProject(loaded);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [params.projectId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.headerCode}>PRODUCTION PREVIEW</Text>
            <Text style={styles.title}>{project ? project.name : "Preview"}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {loading && <Text style={styles.label}>LOADING…</Text>}

          {!loading && notFound && (
            <>
              <Text style={styles.label}>PROJECT NOT FOUND</Text>
              <Text style={styles.description}>
                This project hasn't been saved yet, or couldn't be loaded. Go back to the editor
                and try again.
              </Text>
            </>
          )}

          {!loading && project && <ProjectPreviewPage project={project} maxWidth={windowWidth - 40} maxHeight={windowHeight - 220} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

function ProjectPreviewPage({
  project,
  maxWidth,
  maxHeight,
}: {
  project: StickerProject;
  maxWidth: number;
  maxHeight: number;
}) {
  const previewScale = calculateEditorScale(
    project.canvas.widthMm,
    project.canvas.heightMm,
    Math.max(120, maxWidth),
    Math.max(120, maxHeight),
  );

  const pageWidth = mmToDisplay(project.canvas.widthMm, previewScale);
  const pageHeight = mmToDisplay(project.canvas.heightMm, previewScale);
  const transparent = project.canvas.background === "transparent";
  const canvasColor = project.canvas.canvasColor ?? DEFAULT_CANVAS_COLOR;

  const sortedStickers = [...project.stickers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <View
      style={[
        styles.previewSheet,
        { width: pageWidth, height: pageHeight },
        transparent ? styles.previewSheetTransparent : { backgroundColor: canvasColor },
      ]}
    >
      {transparent && <PreviewCheckerboard />}

      {sortedStickers.map((sticker) => {
        const left = mmToDisplay(sticker.xMm, previewScale);
        const top = mmToDisplay(sticker.yMm, previewScale);
        const width = mmToDisplay(sticker.widthMm, previewScale);
        const height = mmToDisplay(sticker.heightMm, previewScale);
        const imageUri = sticker.processedUri ?? sticker.sourceUri;

        return (
          <Image
            key={sticker.id}
            source={{ uri: imageUri }}
            contentFit="contain"
            style={[
              styles.previewSticker,
              {
                left,
                top,
                width,
                height,
                zIndex: sticker.zIndex,
                transform: [{ rotate: `${sticker.rotation}deg` }],
              },
            ]}
          />
        );
      })}

      {project.stickers.length === 0 && (
        <View style={styles.previewEmptyOverlay}>
          <Text style={styles.previewText}>NO STICKERS YET</Text>
        </View>
      )}
    </View>
  );
}

function PreviewCheckerboard() {
  const columns = 12;
  const rows = 16;
  const cells = Array.from({ length: columns * rows });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.previewCheckerboard}>
        {cells.map((_, index) => {
          const row = Math.floor(index / columns);
          const column = index % columns;
          const dark = (row + column) % 2 === 0;

          return (
            <View
              key={index}
              style={[
                styles.previewCheckerCell,
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
