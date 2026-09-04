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
              PRODUCTION
            </Text>

            <Text style={styles.title}>
              Print Preview
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>
            PRODUCTION OUTPUT
          </Text>

          <Text
            style={styles.description}
          >
            This screen will show only
            printable artwork and cut
            information.
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
              PRINT PREVIEW
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
