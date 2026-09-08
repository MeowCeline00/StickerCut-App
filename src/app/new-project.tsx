import { router } from 'expo-router';

import { useState } from 'react';

import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  CANVAS_PRESETS,
  getCanvasPreset,
} from '@/constants/canvas-presets';

import { Colors } from '@/constants/colors';
import { DEFAULT_THEME_ID, THEME_OPTIONS } from '@/constants/themes';

import { styles } from '@/styles/new-project.styles';

import type {
  CanvasBackground,
  CanvasOrientation,
} from '@/types/canvas';
import type { ThemeId } from '@/types/project';

const CUSTOM_PRESET_ID = 'custom';

const MIN_CUSTOM_MM = 20;
const MAX_CUSTOM_MM = 1000;
const DEFAULT_CUSTOM_MM = 200;

function clampCustomMm(
  value: number
): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_CUSTOM_MM;
  }

  return Math.min(
    MAX_CUSTOM_MM,
    Math.max(MIN_CUSTOM_MM, value)
  );
}

export default function NewProjectScreen() {
  const [
    presetId,
    setPresetId,
  ] = useState('a4');

  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);

  const [
    orientation,
    setOrientation,
  ] =
    useState<CanvasOrientation>(
      'portrait'
    );

  const [
    background,
    setBackground,
  ] =
    useState<CanvasBackground>(
      'white'
    );

  // Kept as text while the user is typing
  // (so the field can be cleared), and
  // clamped to a sane mm range on blur.
  const [
    customWidthText,
    setCustomWidthText,
  ] = useState(
    String(DEFAULT_CUSTOM_MM)
  );

  const [
    customHeightText,
    setCustomHeightText,
  ] = useState(
    String(DEFAULT_CUSTOM_MM)
  );

  const isCustom =
    presetId === CUSTOM_PRESET_ID;

  function handleCustomWidthBlur() {
    const clamped = clampCustomMm(
      Number(customWidthText)
    );

    setCustomWidthText(
      String(clamped)
    );
  }

  function handleCustomHeightBlur() {
    const clamped = clampCustomMm(
      Number(customHeightText)
    );

    setCustomHeightText(
      String(clamped)
    );
  }

  function createProject() {
    if (isCustom) {
      const widthMm = clampCustomMm(
        Number(customWidthText)
      );

      const heightMm = clampCustomMm(
        Number(customHeightText)
      );

      router.push({
        pathname: '/editor',

        params: {
          presetId:
            CUSTOM_PRESET_ID,

          widthMm: String(widthMm),

          heightMm:
            String(heightMm),

          // Custom dimensions are typed
          // exactly as wanted, so there's
          // no separate orientation swap.
          orientation: 'portrait',

          background,

          themeId,
        },
      });

      return;
    }

    const preset =
      getCanvasPreset(presetId);

    if (!preset) {
      return;
    }

    const widthMm =
      orientation === 'portrait'
        ? preset.widthMm
        : preset.heightMm;

    const heightMm =
      orientation === 'portrait'
        ? preset.heightMm
        : preset.widthMm;

    router.push({
      pathname: '/editor',

      params: {
        presetId,

        widthMm:
          String(widthMm),

        heightMm:
          String(heightMm),

        orientation,

        background,

        themeId,
      },
    });
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={styles.backText}
            >
              ‹
            </Text>
          </TouchableOpacity>

          <View>
            <Text
              style={styles.headerCode}
            >
              PROJECT SETUP
            </Text>

            <Text style={styles.title}>
              Choose your canvas
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.scrollContent
          }
        >
          <Text style={styles.sectionLabel}>INTERFACE THEME</Text>

          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((theme) => {
              const selected = theme.id === themeId;

              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    selected && styles.themeCardSelected,
                    !theme.available && styles.themeCardUnavailable,
                  ]}
                  disabled={!theme.available}
                  onPress={() => setThemeId(theme.id)}
                >
                  <View
                    style={[
                      styles.themeSwatch,
                      { backgroundColor: theme.previewBackground, borderColor: theme.previewAccent },
                    ]}
                  />
                  <Text style={styles.themeLabel}>{theme.label.toUpperCase()}</Text>
                  <Text style={styles.themeSublabel}>{theme.sublabel}</Text>
                  {!theme.available && <Text style={styles.themeComingSoon}>COMING SOON</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text
            style={styles.sectionLabel}
          >
            PRINT FORMAT
          </Text>

          <View
            style={styles.presetGrid}
          >
            {CANVAS_PRESETS.map(
              preset => {
                const selected =
                  preset.id === presetId;

                const isLandscape =
                  preset.widthMm >
                  preset.heightMm;

                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetCard,

                      selected &&
                        styles.presetCardSelected,
                    ]}
                    onPress={() =>
                      setPresetId(
                        preset.id
                      )
                    }
                  >
                    <View
                      style={[
                        styles.paperPreview,

                        isLandscape
                          ? styles.paperLandscape
                          : styles.paperPortrait,

                        selected &&
                          styles.paperSelected,
                      ]}
                    />

                    <Text
                      style={[
                        styles.presetName,

                        selected &&
                          styles.presetNameSelected,
                      ]}
                    >
                      {preset.name}
                    </Text>

                    <Text
                      style={
                        styles.presetSize
                      }
                    >
                      {preset.widthMm} ×{' '}
                      {preset.heightMm} mm
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}

            <TouchableOpacity
              style={[
                styles.presetCard,

                isCustom &&
                  styles.presetCardSelected,
              ]}
              onPress={() =>
                setPresetId(
                  CUSTOM_PRESET_ID
                )
              }
            >
              <View
                style={[
                  styles.paperPreview,

                  styles.paperPortrait,

                  styles.customPaperPreview,

                  isCustom &&
                    styles.paperSelected,
                ]}
              >
                <Text
                  style={
                    styles.customPlusIcon
                  }
                >
                  +
                </Text>
              </View>

              <Text
                style={[
                  styles.presetName,

                  isCustom &&
                    styles.presetNameSelected,
                ]}
              >
                Custom
              </Text>

              <Text
                style={
                  styles.presetSize
                }
              >
                set your own size
              </Text>
            </TouchableOpacity>
          </View>

          {isCustom && (
            <>
              <Text
                style={
                  styles.sectionLabel
                }
              >
                CUSTOM SIZE (MM)
              </Text>

              <View
                style={
                  styles.customInputRow
                }
              >
                <View
                  style={
                    styles.customInputGroup
                  }
                >
                  <Text
                    style={
                      styles.customInputLabel
                    }
                  >
                    WIDTH
                  </Text>

                  <TextInput
                    value={
                      customWidthText
                    }
                    onChangeText={
                      setCustomWidthText
                    }
                    onBlur={
                      handleCustomWidthBlur
                    }
                    keyboardType="decimal-pad"
                    style={
                      styles.customInput
                    }
                    placeholder={String(
                      DEFAULT_CUSTOM_MM
                    )}
                    placeholderTextColor={
                      Colors.textMuted
                    }
                  />
                </View>

                <Text
                  style={
                    styles.customInputTimes
                  }
                >
                  ×
                </Text>

                <View
                  style={
                    styles.customInputGroup
                  }
                >
                  <Text
                    style={
                      styles.customInputLabel
                    }
                  >
                    HEIGHT
                  </Text>

                  <TextInput
                    value={
                      customHeightText
                    }
                    onChangeText={
                      setCustomHeightText
                    }
                    onBlur={
                      handleCustomHeightBlur
                    }
                    keyboardType="decimal-pad"
                    style={
                      styles.customInput
                    }
                    placeholder={String(
                      DEFAULT_CUSTOM_MM
                    )}
                    placeholderTextColor={
                      Colors.textMuted
                    }
                  />
                </View>
              </View>

              <Text
                style={
                  styles.customSizeHint
                }
              >
                {MIN_CUSTOM_MM}–
                {MAX_CUSTOM_MM} mm per side
              </Text>
            </>
          )}

          {!isCustom && (
            <>
              <Text
                style={
                  styles.sectionLabel
                }
              >
                ORIENTATION
              </Text>

              <View style={styles.row}>
                <OptionButton
                  label="PORTRAIT"
                  selected={
                    orientation ===
                    'portrait'
                  }
                  onPress={() =>
                    setOrientation(
                      'portrait'
                    )
                  }
                />

                <OptionButton
                  label="LANDSCAPE"
                  selected={
                    orientation ===
                    'landscape'
                  }
                  onPress={() =>
                    setOrientation(
                      'landscape'
                    )
                  }
                />
              </View>
            </>
          )}

          <Text
            style={styles.sectionLabel}
          >
            CANVAS BACKGROUND
          </Text>

          <View style={styles.row}>
            <OptionButton
              label="WHITE"
              selected={
                background ===
                'white'
              }
              onPress={() =>
                setBackground(
                  'white'
                )
              }
            />

            <OptionButton
              label="TRANSPARENT"
              selected={
                background ===
                'transparent'
              }
              onPress={() =>
                setBackground(
                  'transparent'
                )
              }
            />
          </View>
        </ScrollView>

        <TouchableOpacity
          style={
            styles.createButton
          }
          onPress={createProject}
          activeOpacity={0.85}
        >
          <Text
            style={styles.createText}
          >
            CREATE PROJECT
          </Text>

          <Text
            style={styles.createArrow}
          >
            →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function OptionButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.optionButton,

        selected &&
          styles.optionButtonSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionText,

          selected &&
            styles.optionTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
