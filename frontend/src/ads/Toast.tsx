import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

/**
 * Minimal toast — fades in, holds for ~2.4s, fades out.
 * No global toast library required.
 */
export const Toast: React.FC<{ message: string; visible: boolean; onHide: () => void }> = ({
  message,
  visible,
  onHide,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => onHide());
  }, [visible, opacity, onHide]);

  if (!visible) return null;
  return (
    <View pointerEvents="none" style={styles.wrap} testID="toast">
      <Animated.View style={[styles.toast, { opacity }]}>
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 120,
    alignItems: "center",
    zIndex: 100,
  },
  toast: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "rgba(20,18,40,0.92)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#39C5BB",
    maxWidth: "85%",
  },
  text: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
