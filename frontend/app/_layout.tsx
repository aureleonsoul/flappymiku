import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { AppState, type AppStateStatus, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AdMobProvider } from "../src/ads/AdMobProvider";
import { audioManager } from "../src/audio/AudioManager";

export default function RootLayout() {
  // Bring the audio engine up on first mount and handle interruptions
  // (calls / notifications / app backgrounding) by *suspending* music while
  // the app is not foregrounded. We deliberately do NOT touch the persisted
  // mute preference here — that's controlled by the in-game mute button.
  useEffect(() => {
    void audioManager.init();

    const onAppState = (next: AppStateStatus) => {
      if (next === "active") {
        audioManager.setSuspended(false);
      } else {
        audioManager.setSuspended(true);
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AdMobProvider>
          <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="game" options={{ gestureEnabled: false }} />
            <Stack.Screen name="characters" />
          </Stack>
        </AdMobProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: "#0a0a14" } });
