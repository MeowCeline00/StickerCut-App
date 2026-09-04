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
    },

    loading: {
      flex: 1,

      justifyContent: 'center',

      alignItems: 'center',
    },

    loadingText: {
      color:
        Colors.textSecondary,

      fontSize: 11,

      letterSpacing: 2,
    },

    header: {
      height: 64,

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 14,

      borderBottomWidth: 1,

      borderBottomColor:
        Colors.border,

      backgroundColor:
        Colors.surface,
    },

    headerButton: {
      width: 40,
      height: 40,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        Colors.border,

      justifyContent: 'center',

      alignItems: 'center',
    },

    headerButtonText: {
      color:
        Colors.textSecondary,

      fontSize: 31,

      marginTop: -4,
    },

    projectInfo: {
      flex: 1,

      marginLeft: 12,

      marginRight: 8,
    },

    projectLabel: {
      color: Colors.textMuted,

      fontSize: 8,

      letterSpacing: 1.6,
    },

    projectName: {
      color: Colors.text,

      fontSize: 13,

      fontWeight: '700',

      letterSpacing: 1.2,

      marginTop: 2,
    },

    saveButton: {
      borderWidth: 1,

      borderColor:
        Colors.accent,

      borderRadius: 8,

      paddingHorizontal: 13,

      paddingVertical: 9,

      backgroundColor:
        'rgba(0,168,255,0.08)',
    },

    saveText: {
      color:
        Colors.accentBright,

      fontSize: 10,

      fontWeight: '800',

      letterSpacing: 1,
    },

    workspace: {
      flex: 1,

      position: 'relative',

      overflow: 'hidden',

      backgroundColor:
        Colors.background,
    },

    topRuler: {
      height: 28,

      flexDirection: 'row',

      justifyContent:
        'space-around',

      alignItems: 'center',

      backgroundColor:
        Colors.ruler,

      borderBottomWidth: 1,

      borderBottomColor:
        Colors.border,
    },

    rulerText: {
      color: Colors.textMuted,

      fontSize: 8,
    },

    rulerUnit: {
      color: Colors.accent,

      fontSize: 7,
    },

    workspaceCenter: {
      flex: 1,

      justifyContent: 'center',

      alignItems: 'center',

      paddingVertical: 12,
    },

    printCanvas: {
      position: 'relative',

      borderWidth: 1,

      borderColor:
        Colors.borderBright,

      overflow: 'hidden',
    },

    whiteCanvas: {
      backgroundColor:
        Colors.white,
    },

    transparentCanvas: {
      backgroundColor:
        Colors.checkerLight,
    },

    checkerboard: {
      flex: 1,

      flexDirection: 'row',

      flexWrap: 'wrap',
    },

    checkerCell: {
      flexGrow: 0,
      flexShrink: 0,
    },

    emptyCanvas: {
      ...StyleSheet.absoluteFill,

      justifyContent: 'center',

      alignItems: 'center',
    },

    emptyCanvasTitle: {
      color: '#687A87',

      fontSize: 10,

      fontWeight: '700',

      letterSpacing: 1.5,
    },

    emptyCanvasText: {
      color: '#8E9AA2',

      fontSize: 9,

      marginTop: 5,
    },

    canvasReadout: {
      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems: 'center',

      paddingHorizontal: 16,

      paddingVertical: 9,

      backgroundColor:
        Colors.ruler,

      borderTopWidth: 1,

      borderTopColor:
        Colors.border,
    },

    readoutLabel: {
      color: Colors.textMuted,

      fontSize: 8,

      letterSpacing: 1.5,
    },

    readoutValue: {
      color:
        Colors.textSecondary,

      fontSize: 10,

      marginTop: 2,
    },

    scaleBox: {
      borderWidth: 1,

      borderColor:
        Colors.border,

      borderRadius: 5,

      paddingVertical: 4,

      paddingHorizontal: 8,
    },

    scaleText: {
      color:
        Colors.textSecondary,

      fontSize: 9,
    },

    quickActions: {
      height: 66,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 8,

      paddingHorizontal: 10,

      backgroundColor:
        Colors.surface,

      borderTopWidth: 1,

      borderTopColor:
        Colors.border,
    },

    addButton: {
      flex: 1.3,

      height: 45,

      flexDirection: 'row',

      justifyContent: 'center',

      alignItems: 'center',

      gap: 5,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        Colors.accent,

      backgroundColor:
        'rgba(0,168,255,0.08)',
    },

    addIcon: {
      color:
        Colors.accentBright,

      fontSize: 19,
    },

    addText: {
      color:
        Colors.accentBright,

      fontSize: 10,

      fontWeight: '800',

      letterSpacing: 1,
    },

    quickButton: {
      flex: 1,

      height: 45,

      justifyContent: 'center',

      alignItems: 'center',

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        Colors.border,
    },

    quickIcon: {
      color:
        Colors.textSecondary,

      fontSize: 16,
    },

    quickText: {
      color: Colors.textMuted,

      fontSize: 8,

      marginTop: 2,

      letterSpacing: 0.8,
    },

    toolbar: {
      height: 72,

      flexDirection: 'row',

      backgroundColor:
        Colors.ruler,

      borderTopWidth: 1,

      borderTopColor:
        Colors.border,
    },

    toolbarButton: {
      flex: 1,

      justifyContent: 'center',

      alignItems: 'center',
    },

    toolbarIcon: {
      color: Colors.textMuted,

      fontSize: 17,
    },

    toolbarIconSelected: {
      color:
        Colors.accentBright,
    },

    toolbarText: {
      color: Colors.textMuted,

      fontSize: 7,

      marginTop: 4,

      letterSpacing: 0.6,
    },

    toolbarTextSelected: {
      color: Colors.accent,
    },
  });
