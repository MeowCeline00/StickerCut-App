import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/colors';

export const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        Colors.background,
    },

    container: {
      flex: 1,

      paddingHorizontal: 20,
    },

    header: {
      flexDirection: 'row',

      alignItems: 'center',

      paddingTop: 12,

      marginBottom: 25,
    },

    backButton: {
      width: 42,
      height: 42,

      borderRadius: 10,

      justifyContent: 'center',

      alignItems: 'center',

      borderWidth: 1,

      borderColor:
        Colors.border,

      marginRight: 14,
    },

    backText: {
      color:
        Colors.textSecondary,

      fontSize: 34,

      marginTop: -4,
    },

    headerCode: {
      color: Colors.accent,

      fontSize: 10,

      fontWeight: '700',

      letterSpacing: 2,
    },

    title: {
      color: Colors.text,

      fontSize: 24,

      fontWeight: '700',

      marginTop: 3,
    },

    scrollContent: {
      paddingBottom: 30,
    },

    sectionLabel: {
      color: Colors.textMuted,

      fontSize: 10,

      fontWeight: '700',

      letterSpacing: 1.8,

      marginBottom: 12,

      marginTop: 10,
    },

    presetGrid: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      justifyContent:
        'space-between',

      marginBottom: 20,
    },

    presetCard: {
      width: '48%',

      minHeight: 145,

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        Colors.border,

      backgroundColor:
        Colors.surface,

      justifyContent: 'center',

      alignItems: 'center',

      padding: 14,

      marginBottom: 12,
    },

    presetCardSelected: {
      borderColor:
        Colors.accent,

      backgroundColor:
        'rgba(0,168,255,0.08)',
    },

    paperPreview: {
      backgroundColor:
        Colors.white,

      borderWidth: 1,

      borderColor:
        Colors.textMuted,

      marginBottom: 14,
    },

    paperPortrait: {
      width: 37,
      height: 52,
    },

    paperLandscape: {
      width: 52,
      height: 37,
    },

    paperSelected: {
      borderColor:
        Colors.accentBright,
    },

    customPaperPreview: {
      backgroundColor:
        Colors.surface,

      justifyContent: 'center',

      alignItems: 'center',
    },

    customPlusIcon: {
      color: Colors.textMuted,

      fontSize: 20,

      fontWeight: '700',
    },

    presetName: {
      color:
        Colors.textSecondary,

      fontSize: 15,

      fontWeight: '700',
    },

    presetNameSelected: {
      color: Colors.text,
    },

    presetSize: {
      color: Colors.textMuted,

      fontSize: 10,

      marginTop: 4,
    },

    customInputRow: {
      flexDirection: 'row',

      alignItems: 'flex-end',

      gap: 12,

      marginBottom: 8,
    },

    customInputGroup: {
      flex: 1,
    },

    customInputLabel: {
      color: Colors.textMuted,

      fontSize: 9,

      fontWeight: '700',

      letterSpacing: 1.2,

      marginBottom: 6,
    },

    customInput: {
      borderWidth: 1,

      borderColor:
        Colors.border,

      borderRadius: 10,

      backgroundColor:
        Colors.surface,

      color: Colors.text,

      fontSize: 15,

      fontWeight: '700',

      paddingHorizontal: 14,

      paddingVertical: 12,
    },

    customInputTimes: {
      color: Colors.textMuted,

      fontSize: 15,

      marginBottom: 14,
    },

    customSizeHint: {
      color: Colors.textMuted,

      fontSize: 10,

      marginBottom: 20,
    },

    row: {
      flexDirection: 'row',

      gap: 10,

      marginBottom: 24,
    },

    optionButton: {
      flex: 1,

      paddingVertical: 14,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        Colors.border,

      backgroundColor:
        Colors.surface,

      alignItems: 'center',
    },

    optionButtonSelected: {
      borderColor:
        Colors.accent,

      backgroundColor:
        'rgba(0,168,255,0.08)',
    },

    optionText: {
      color: Colors.textMuted,

      fontSize: 11,

      fontWeight: '700',

      letterSpacing: 1.2,
    },

    optionTextSelected: {
      color:
        Colors.accentBright,
    },

    createButton: {
      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems: 'center',

      paddingHorizontal: 20,

      paddingVertical: 17,

      marginBottom: 14,

      borderRadius: 12,

      backgroundColor:
        Colors.accent,
    },

    createText: {
      color: '#00111C',

      fontSize: 13,

      fontWeight: '900',

      letterSpacing: 1.4,
    },

    createArrow: {
      color: '#00111C',

      fontSize: 22,
    },
  });
