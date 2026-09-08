import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/colors';

// The page's own border stroke (see printCanvas below) sits OUTSIDE the
// actual mm=0 content origin: children positioned at left:0/top:0 render
// inset by this many px from printCanvas's outer edge, because Yoga lays
// out absolutely-positioned children relative to the parent's padding
// box, not its border box. CanvasRuler.tsx imports this same constant to
// offset every tick position by it, so the ruler's zero tick lines up
// with where mm=0 actually renders, not with printCanvas's outer edge
// (CRITICAL FIX 7) — one shared coordinate origin instead of two
// independently-guessed offsets.
export const PAGE_ORIGIN_OFFSET_PX = 1;

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.textSecondary,
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },

  // ---- Header --------------------------------------------------------
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  headerButton: {
    paddingVertical: 6,
    paddingRight: 10,
  },

  headerButtonText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  projectInfo: {
    flex: 1,
    marginHorizontal: 10,
  },

  projectName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  projectMeta: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },

  saveButton: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: 'rgba(11,132,224,0.10)',
  },

  saveText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },

  // ---- Workspace / rulers / page -------------------------------------
  workspace: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 2x2 grid: [cornerSpacer, topRuler] / [leftRuler, page]. The ruler
  // and page rows/columns share the exact same widths/heights, so the
  // ruler CONTAINER'S outer edge lines up with the page's outer edge —
  // but the page's real mm=0 origin sits PAGE_ORIGIN_OFFSET_PX inside
  // that (see the constant above), which is why CanvasRuler.tsx also
  // shifts every tick position by that same constant (CRITICAL FIX 7).
  rulerGridRow: {
    flexDirection: 'row',
  },

  cornerSpacer: {
    width: 20,
    height: 20,
    backgroundColor: Colors.ruler,
  },

  pageRow: {
    flexDirection: 'row',
  },

  printCanvas: {
    position: 'relative',
    borderWidth: PAGE_ORIGIN_OFFSET_PX,
    borderColor: Colors.borderBright,
    overflow: 'hidden',
  },

  whiteCanvas: {
    backgroundColor: Colors.white,
  },

  transparentCanvas: {
    backgroundColor: Colors.checkerLight,
  },

  checkerboard: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Live drag preview for a guide not yet released (CRITICAL FIX 8) —
  // dashed so it reads as "not committed yet" at a glance, distinct
  // from a real GuideLine's solid line.
  draftGuideHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.accentBright,
  },
  draftGuideVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.accentBright,
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
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },

  emptyCanvasText: {
    color: Colors.textMuted,
    fontSize: 9,
    marginTop: 5,
    fontFamily: 'monospace',
  },

  // ---- Canvas info bar -------------------------------------------------
  canvasInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.ruler,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  canvasInfoText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },

  canvasInfoBadge: {
    color: Colors.accent,
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 1,
    fontWeight: '700',
  },

  // ---- Contextual Canvas / Cut Line tabs ------------------------------
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  tabButtonSelected: {
    borderBottomColor: Colors.accent,
  },

  tabButtonText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },

  tabButtonTextSelected: {
    color: Colors.accent,
  },

  // Bounded so a long OBJECTS list (or many cut-line controls) scrolls
  // internally instead of pushing the selection-actions row off the
  // bottom of the screen.
  tabScroll: {
    maxHeight: 260,
    backgroundColor: Colors.surface,
  },

  tabPanel: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },

  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: 'rgba(11,132,224,0.08)',
  },

  addImageIcon: {
    color: Colors.accent,
    fontSize: 18,
  },

  addImageText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },

  addImageSubtext: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: 'monospace',
  },

  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    fontFamily: 'monospace',
  },

  backgroundToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },

  backgroundToggleOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },

  backgroundToggleOptionSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(11,132,224,0.08)',
  },

  backgroundToggleText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  backgroundToggleTextSelected: {
    color: Colors.accent,
  },

  colorSwatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: Colors.accentBright,
  },

  cutLinePlaceholder: {
    paddingVertical: 18,
    alignItems: 'center',
  },

  cutLinePlaceholderText: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'monospace',
  },

  // ---- Contextual selection actions -----------------------------------
  selectionActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  selectionActionButton: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  selectionActionButtonDanger: {
    borderColor: Colors.danger,
  },

  selectionActionText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  selectionActionTextDanger: {
    color: Colors.danger,
  },

  selectionActionButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(11,132,224,0.08)',
  },

  selectionActionTextActive: {
    color: Colors.accent,
  },

  // ---- Objects list (Canvas tab) ---------------------------------------
  objectsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  changeCanvasSizeButton: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  changeCanvasSizeText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  objectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceBright,
  },

  objectRowSelected: {
    borderColor: Colors.accent,
  },

  objectThumb: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },

  objectRowLabel: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
  },

  objectRowIconButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  objectRowIconText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },

  objectRowDeleteText: {
    color: Colors.danger,
    fontSize: 16,
  },

  // ---- Cut Line tab ------------------------------------------------------
  cutShapeRow: {
    flexDirection: 'row',
    gap: 8,
  },

  cutShapeOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },

  cutShapeOptionSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(11,132,224,0.08)',
  },

  cutShapeLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  cutShapeLabelSelected: {
    color: Colors.accent,
  },

  cutShapeHint: {
    color: Colors.textMuted,
    fontSize: 8,
    marginTop: 2,
    fontFamily: 'monospace',
  },

  cutLineNote: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: 'monospace',
  },

  // ---- Header "Done" (export) button --------------------------------
  doneButton: {
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: Colors.accent,
    marginLeft: 8,
  },

  doneButtonText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
