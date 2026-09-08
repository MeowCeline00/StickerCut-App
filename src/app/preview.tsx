import { router } from 'expo-router';

import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import { styles } from '@/styles/preview.styles';

export default function PreviewScreen() {
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
              PRODUCTION PREVIEW
            </Text>

            <Text style={styles.title}>
              Artwork only
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>
            PRODUCTION PREVIEW
          </Text>

          <Text
            style={styles.description}
          >
            Editor guides and controls
            are excluded. This screen is
            not wired up to a project
            yet — actually rendering
            your stickers here is a
            separate, later pass.
          </Text>

          <View
            style={
              styles.previewSheet
            }
          >
            <Text
              style={
                styles.previewText
              }
            >
              NOT YET IMPLEMENTED
            </Text>
          </View>

          <Text
            style={styles.warning}
          >
            Blueprint grid, rulers,
            selection boxes and editing
            controls will never be
            included in final output.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
