import React from "react";
import { StyleSheet, View, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { gameHtml } from "../src/game/mikuFlapHtml";

export default function Index() {
  if (Platform.OS === "web") {
    const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
    React.useEffect(() => {
      // Set srcdoc imperatively because the lowercase HTML attribute is what
      // browsers actually read; React's camelCase srcDoc doesn't always make it
      // through when the host element is rendered via react-native-web.
      if (iframeRef.current) {
        iframeRef.current.srcdoc = gameHtml;
      }
    }, []);
    const Iframe = "iframe" as unknown as React.ComponentType<Record<string, unknown>>;
    return (
      <View style={styles.container} testID="miku-flap-web-container">
        <StatusBar style="light" />
        <Iframe
          ref={iframeRef}
          style={{
            border: "none",
            width: "100%",
            height: "100%",
            display: "block",
            background: "#0a0a14",
          }}
          title="Miku Flap"
          allow="autoplay"
          data-testid="miku-flap-iframe"
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <WebView
        testID="miku-flap-webview"
        originWhitelist={["*"]}
        source={{ html: gameHtml }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a14",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0a0a14",
  },
});
