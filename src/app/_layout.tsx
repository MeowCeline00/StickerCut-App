import { Stack } from 'expo-router';

import { StatusBar } from 'expo-status-bar';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    // Required once, at the very root, for any react-native-gesture-handler
    // gesture to work anywhere in the app — the editor's drag-to-move and
    // drag-to-resize stickers depend on this being here.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />

        <Stack
          screenOptions={{
            headerShown: false,

            animation:
              'slide_from_right',

            contentStyle: {
              backgroundColor:
                '#E8F0F8',
            },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}