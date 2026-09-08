import { Modal, Text, TouchableOpacity, View } from 'react-native';

import type { StickerProject } from '@/types/project';

import { styles } from './ExportSheet.styles';

interface ExportSheetProps {
  visible: boolean;
  project: StickerProject;
  onClose: () => void;
}

/**
 * "Export Project" bottom sheet, matching the Figma reference's Done →
 * flow. Real PNG capture needs a native view-capture library (e.g.
 * react-native-view-shot) that isn't in this project's dependencies
 * yet — adding one requires a native rebuild this session can't run
 * (no shell access on your machine). "Save to device" is a real,
 * wired-up button that's honest about not being implemented rather
 * than faking a capture. "Print cut sheet" is shown locked, matching
 * the reference (it's a future, paid-tier-looking feature there too).
 */
export function ExportSheet({ visible, project, onClose }: ExportSheetProps) {
  const objectCount = project.stickers.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <Text style={styles.title}>Export Project</Text>
          <Text style={styles.subtitle}>
            {objectCount} sticker{objectCount !== 1 ? 's' : ''} · {project.canvas.presetId.toUpperCase()}
          </Text>

          <View style={styles.thumbnailBox}>
            <Text style={styles.thumbnailPlaceholderText}>
              {objectCount === 0 ? 'Nothing to preview yet' : `${objectCount} object${objectCount !== 1 ? 's' : ''} on canvas`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              // Honest placeholder — see the component doc comment.
              undefined
            }
            disabled
          >
            <Text style={styles.primaryButtonText}>↓ Save to device (PNG)</Text>
            <Text style={styles.notImplementedTag}>Not yet implemented</Text>
          </TouchableOpacity>

          <View style={styles.lockedButton}>
            <Text style={styles.lockedButtonText}>🔒 Print cut sheet</Text>
          </View>

          <TouchableOpacity style={styles.continueLink} onPress={onClose}>
            <Text style={styles.continueLinkText}>Continue editing</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
