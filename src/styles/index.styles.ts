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

    header: {
      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems: 'center',

      paddingHorizontal: 20,

      paddingTop: 16,

      paddingBottom: 20,
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

    newButton: {
      borderWidth: 1,

      borderColor: Colors.accent,

      borderRadius: 10,

      paddingHorizontal: 16,

      paddingVertical: 11,

      backgroundColor:
        'rgba(0,168,255,0.08)',
    },

    newButtonText: {
      color: Colors.accentBright,

      fontSize: 12,

      fontWeight: '800',

      letterSpacing: 1,
    },

    centerFill: {
      flex: 1,

      justifyContent: 'center',

      alignItems: 'center',

      paddingHorizontal: 30,

      paddingBottom: 60,
    },

    loadingText: {
      color: Colors.textSecondary,

      fontSize: 11,

      letterSpacing: 2,
    },

    emptyIcon: {
      color: Colors.textMuted,

      fontSize: 40,

      marginBottom: 12,
    },

    emptyTitle: {
      color: Colors.textMuted,

      fontSize: 11,

      fontWeight: '700',

      letterSpacing: 1.6,
    },

    emptyText: {
      color: Colors.textMuted,

      fontSize: 11,

      textAlign: 'center',

      marginTop: 8,

      lineHeight: 16,
    },

    listContent: {
      paddingHorizontal: 20,

      paddingBottom: 30,

      gap: 10,
    },

    card: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 14,

      padding: 12,

      borderRadius: 14,

      borderWidth: 1,

      borderColor: Colors.border,

      backgroundColor:
        Colors.surface,
    },

    cardThumb: {
      width: 52,
      height: 52,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        Colors.borderBright,

      backgroundColor:
        Colors.ruler,

      justifyContent: 'center',

      alignItems: 'center',
    },

    cardThumbIcon: {
      color: Colors.textMuted,

      fontSize: 20,
    },

    cardInfo: {
      flex: 1,
    },

    cardName: {
      color: Colors.text,

      fontSize: 14,

      fontWeight: '700',
    },

    cardMeta: {
      color: Colors.textSecondary,

      fontSize: 10,

      marginTop: 3,
    },

    cardDate: {
      color: Colors.textMuted,

      fontSize: 9,

      marginTop: 3,
    },

    deleteButton: {
      width: 30,
      height: 30,

      borderRadius: 8,

      borderWidth: 1,

      borderColor:
        'rgba(255,61,113,0.35)',

      backgroundColor:
        'rgba(255,61,113,0.08)',

      justifyContent: 'center',

      alignItems: 'center',
    },

    deleteButtonText: {
      color: Colors.danger,

      fontSize: 16,

      marginTop: -2,
    },
  });
