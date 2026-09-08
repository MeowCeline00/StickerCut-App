import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/colors';

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 42, 74, 0.35)',
  },

  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },

  sheet: {
    backgroundColor: Colors.surfaceBright,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 12,
  },

  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 6,
  },

  title: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
  },

  subtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: -6,
  },

  thumbnailBox: {
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  thumbnailPlaceholderText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
  },

  primaryButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },

  primaryButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },

  notImplementedTag: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    marginTop: 2,
  },

  lockedButton: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockedButtonText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  continueLink: {
    alignItems: 'center',
    paddingTop: 4,
  },

  continueLinkText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
});
