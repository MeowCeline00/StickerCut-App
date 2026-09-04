import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  BlueprintGrid,
} from '@/components/BlueprintGrid';

import { Colors } from '@/constants/colors';

import {
  getProject,
  saveProject,
} from '@/storage/projectStorage';

import { styles } from '@/styles/editor.styles';

import type {
  StickerProject,
} from '@/types/project';

import { createId } from '@/utils/ids';

import {
  calculateEditorScale,
  mmToDisplay,
} from '@/utils/units';

export default function EditorScreen() {
  const params =
    useLocalSearchParams<{
      projectId?: string;

      presetId?: string;

      widthMm?: string;
      heightMm?: string;

      background?: string;

      orientation?: string;
    }>();

  const [
    project,
    setProject,
  ] =
    useState<StickerProject | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    initialiseProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initialiseProject() {
    if (params.projectId) {
      const existing =
        await getProject(
          params.projectId
        );

      if (existing) {
        setProject(existing);

        setLoading(false);

        return;
      }
    }

    const widthMm =
      Number(params.widthMm) || 210;

    const heightMm =
      Number(params.heightMm) ||
      297;

    const now = Date.now();

    const created: StickerProject = {
      id: createId('project'),

      name: 'Untitled Project',

      createdAt: now,
      updatedAt: now,

      canvas: {
        presetId:
          params.presetId ?? 'a4',

        widthMm,
        heightMm,

        orientation:
          params.orientation ===
          'landscape'
            ? 'landscape'
            : 'portrait',

        background:
          params.background ===
          'transparent'
            ? 'transparent'
            : 'white',
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

      Alert.alert(
        'Project saved',
        'Your StickerCut project was saved on this device.'
      );
    } catch {
      Alert.alert(
        'Save failed',
        'StickerCut could not save this project.'
      );
    }
  }

  if (loading || !project) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View style={styles.loading}>
          <Text
            style={styles.loadingText}
          >
            LOADING PROJECT...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const maxCanvasWidth = 285;

  const maxCanvasHeight = 410;

  const editorScale =
    calculateEditorScale(
      project.canvas.widthMm,

      project.canvas.heightMm,

      maxCanvasWidth,

      maxCanvasHeight
    );

  const canvasDisplayWidth =
    mmToDisplay(
      project.canvas.widthMm,
      editorScale
    );

  const canvasDisplayHeight =
    mmToDisplay(
      project.canvas.heightMm,
      editorScale
    );

  const transparent =
    project.canvas.background ===
    'transparent';

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.headerButtonText
              }
            >
              ‹
            </Text>
          </TouchableOpacity>

          <View
            style={styles.projectInfo}
          >
            <Text
              style={
                styles.projectLabel
              }
            >
              PROJECT
            </Text>

            <Text
              style={
                styles.projectName
              }
              numberOfLines={1}
            >
              {project.name.toUpperCase()}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text
              style={styles.saveText}
            >
              SAVE
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.workspace}>
          <BlueprintGrid />

          <View style={styles.topRuler}>
            <Text
              style={styles.rulerText}
            >
              0
            </Text>

            <Text
              style={styles.rulerText}
            >
              50
            </Text>

            <Text
              style={styles.rulerText}
            >
              100
            </Text>

            <Text
              style={styles.rulerText}
            >
              150
            </Text>

            <Text
              style={styles.rulerText}
            >
              200
            </Text>

            <Text
              style={styles.rulerUnit}
            >
              mm
            </Text>
          </View>

          <View
            style={
              styles.workspaceCenter
            }
          >
            <View
              style={[
                styles.printCanvas,

                {
                  width:
                    canvasDisplayWidth,

                  height:
                    canvasDisplayHeight,
                },

                transparent
                  ? styles.transparentCanvas
                  : styles.whiteCanvas,
              ]}
            >
              {transparent && (
                <Checkerboard />
              )}

              {project.stickers
                .length === 0 && (
                <View
                  style={
                    styles.emptyCanvas
                  }
                >
                  <Text
                    style={
                      styles.emptyCanvasTitle
                    }
                  >
                    EMPTY CANVAS
                  </Text>

                  <Text
                    style={
                      styles.emptyCanvasText
                    }
                  >
                    Tap + ADD to place
                    artwork
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View
            style={
              styles.canvasReadout
            }
          >
            <View>
              <Text
                style={
                  styles.readoutLabel
                }
              >
                CANVAS
              </Text>

              <Text
                style={
                  styles.readoutValue
                }
              >
                {
                  project.canvas
                    .widthMm
                }
                {' × '}
                {
                  project.canvas
                    .heightMm
                }{' '}
                mm
              </Text>
            </View>

            <View
              style={styles.scaleBox}
            >
              <Text
                style={styles.scaleText}
              >
                FIT
              </Text>
            </View>
          </View>
        </View>

        <View
          style={styles.quickActions}
        >
          <TouchableOpacity
            style={styles.addButton}
          >
            <Text
              style={styles.addIcon}
            >
              ＋
            </Text>

            <Text
              style={styles.addText}
            >
              ADD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickButton}
          >
            <Text
              style={styles.quickIcon}
            >
              ⌗
            </Text>

            <Text
              style={styles.quickText}
            >
              ARRANGE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickButton}
            onPress={() =>
              router.push('/preview')
            }
          >
            <Text
              style={styles.quickIcon}
            >
              ◉
            </Text>

            <Text
              style={styles.quickText}
            >
              PREVIEW
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <ToolbarButton
            icon="▱"
            label="CANVAS"
            selected
          />

          <ToolbarButton
            icon="✂"
            label="CUT"
          />

          <ToolbarButton
            icon="↔"
            label="SIZE"
          />

          <ToolbarButton
            icon="▣"
            label="OBJECTS"
          />

          <ToolbarButton
            icon="⇧"
            label="PRINT"
          />
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
    <TouchableOpacity
      style={styles.toolbarButton}
    >
      <Text
        style={[
          styles.toolbarIcon,

          selected &&
            styles.toolbarIconSelected,
        ]}
      >
        {icon}
      </Text>

      <Text
        style={[
          styles.toolbarText,

          selected &&
            styles.toolbarTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Checkerboard() {
  const columns = 12;
  const rows = 16;

  const cells = Array.from({
    length: columns * rows,
  });

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <View
        style={styles.checkerboard}
      >
        {cells.map((_, index) => {
          const row =
            Math.floor(
              index / columns
            );

          const column =
            index % columns;

          const dark =
            (row + column) % 2 === 0;

          return (
            <View
              key={index}
              style={[
                styles.checkerCell,

                {
                  width:
                    `${100 / columns}%`,

                  height:
                    `${100 / rows}%`,

                  backgroundColor:
                    dark
                      ? Colors
                          .checkerDark
                      : Colors
                          .checkerLight,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}
