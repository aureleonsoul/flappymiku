/**
 * Main menu. Layout is a strict 2-row column: the content area is wrapped in
 * `flex: 1` so it never extends into the bottom banner zone (which was the
 * source of the CHARACTERS-button-covered-by-banner bug). The banner is its
 * own bottom-pinned row with the device's bottom safe-area inset.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import Constants from "expo-constants";
import { BannerAdView } from "../src/ads/BannerAdView";
import { Vocaloid } from "../src/game/sprites/Vocaloid";
import {
  bumpSessionCount,
  loadProfile,
  markRatePromptHandled,
  type PlayerProfile,
} from "../src/storage/profile";

const PLAY_STORE_URL =
  (Constants.expoConfig?.extra as { playStoreUrl?: string } | undefined)?.playStoreUrl ??
  "https://play.google.com/store/apps/details?id=com.aureleonsoul.flappymiku";
const PRIVACY_URL =
  (Constants.expoConfig?.extra as { privacyPolicyUrl?: string } | undefined)?.privacyPolicyUrl ??
  "https://aureleonsoul.github.io/privacy-policy/";

export default function MainMenu() {
  const router = useRouter();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [showRatePrompt, setShowRatePrompt] = useState(false);
  const sessionBumpedRef = React.useRef(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const p = await loadProfile();
        if (!cancelled) setProfile(p);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    if (sessionBumpedRef.current) return;
    sessionBumpedRef.current = true;
    (async () => {
      const count = await bumpSessionCount();
      const p = await loadProfile();
      setProfile(p);
      if (count >= 5 && !p.ratePromptHandled) {
        setTimeout(() => setShowRatePrompt(true), 600);
      }
    })();
  }, []);

  const onRateNow = async () => {
    setShowRatePrompt(false);
    await markRatePromptHandled();
    setProfile((prev) => (prev ? { ...prev, ratePromptHandled: true } : prev));
    try {
      await Linking.openURL(PLAY_STORE_URL);
    } catch {
      Alert.alert("Couldn't open the Play Store");
    }
  };

  const onRateLater = async () => {
    setShowRatePrompt(false);
    await markRatePromptHandled();
    setProfile((prev) => (prev ? { ...prev, ratePromptHandled: true } : prev));
  };

  const selected = profile?.selected ?? "miku";

  return (
    <View style={styles.root} testID="main-menu">
      <LinearGradient
        colors={["#ffd1e4", "#c7b5ff", "#a8e8ff"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Content row — takes all remaining space above the banner */}
      <SafeAreaView edges={["top"]} style={styles.contentSafe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.titleWrap}>
            <Text style={styles.titleShadow}>FLAPPY MIKU</Text>
            <Text style={styles.title}>FLAPPY MIKU</Text>
            <Text style={styles.subtitle}>Tap to flap. Dodge the leeks.</Text>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroSprite}>
              <Vocaloid id={selected} size={130} />
            </View>
            <Text style={styles.bestLabel}>BEST SCORE</Text>
            <Text style={styles.bestValue} testID="best-score">{profile?.best ?? 0}</Text>
            <Text style={styles.charLabel}>{profile ? characterName(selected) : ""}</Text>
            <View style={styles.coinRow} testID="coin-chip">
              <View style={styles.coinDot} />
              <Text style={styles.coinTxt}>{profile?.coins ?? 0} coins</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              testID="play-button"
              style={({ pressed }) => [styles.playBtn, pressed && styles.btnPressed]}
              onPress={() => router.push("/game")}
            >
              <Text style={styles.playTxt}>PLAY</Text>
            </Pressable>
            <Pressable
              testID="characters-button"
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
              onPress={() => router.push("/characters")}
            >
              <Text style={styles.secondaryTxt}>CHARACTERS</Text>
            </Pressable>
          </View>

          <Pressable
            testID="privacy-policy-link"
            onPress={() => Linking.openURL(PRIVACY_URL)}
            hitSlop={10}
            style={styles.privacyPressable}
          >
            <Text style={styles.privacyLink}>Privacy Policy</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      {/* Banner row — sits at the bottom in normal flex flow (not absolute),
          guaranteeing the privacy link above always has a clear gap. */}
      <SafeAreaView edges={["bottom"]} style={styles.bannerHolder}>
        <BannerAdView testID="banner-menu" />
      </SafeAreaView>

      <Modal visible={showRatePrompt} transparent animationType="fade" onRequestClose={onRateLater}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="rate-prompt">
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Vocaloid id="miku" size={88} />
            </View>
            <Text style={styles.modalTitle}>Enjoying the game?</Text>
            <Text style={styles.modalBody}>
              {Platform.OS === "ios"
                ? "Tap to rate Flappy Miku on the App Store!"
                : "Tap to rate Flappy Miku on the Play Store!"}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                testID="rate-later"
                style={({ pressed }) => [styles.modalBtnGhost, pressed && styles.btnPressed]}
                onPress={onRateLater}
              >
                <Text style={styles.modalGhostTxt}>No thanks</Text>
              </Pressable>
              <Pressable
                testID="rate-now"
                style={({ pressed }) => [styles.modalBtnPrimary, pressed && styles.btnPressed]}
                onPress={onRateNow}
              >
                <Text style={styles.modalPrimaryTxt}>Rate us!</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function characterName(id: string): string {
  return (
    {
      miku: "Hatsune Miku",
      rin: "Kagamine Rin",
      len: "Kagamine Len",
      luka: "Megurine Luka",
      kaito: "KAITO",
      meiko: "MEIKO",
    }[id] ?? id
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "column", backgroundColor: "#0a0a14" },
  contentSafe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleWrap: { alignItems: "center", marginTop: 4 },
  titleShadow: {
    position: "absolute",
    color: "rgba(0,0,0,0.35)",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 3,
    transform: [{ translateY: 3 }],
  },
  title: { color: "#1f7e78", fontSize: 36, fontWeight: "900", letterSpacing: 3 },
  subtitle: { marginTop: 6, color: "#ffffff", fontWeight: "700", letterSpacing: 1 },
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#39C5BB",
    minWidth: 220,
    marginVertical: 8,
  },
  heroSprite: { marginBottom: 4 },
  bestLabel: { color: "#444", fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  bestValue: { color: "#1f7e78", fontSize: 38, fontWeight: "900", marginVertical: 0 },
  charLabel: { color: "#666", fontSize: 12, fontWeight: "700" },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(255,210,63,0.25)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(199,154,0,0.5)",
  },
  coinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFD23F",
    borderWidth: 1.5,
    borderColor: "#c79a00",
  },
  coinTxt: { color: "#7a5a00", fontWeight: "900", fontSize: 13, letterSpacing: 1 },
  actions: { width: "85%", alignItems: "stretch", marginTop: 8 },
  playBtn: {
    backgroundColor: "#39C5BB",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0e4f4a",
    marginBottom: 10,
  },
  playTxt: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 3 },
  secondaryBtn: {
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1f7e78",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  secondaryTxt: { color: "#1f7e78", fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  btnPressed: { transform: [{ scale: 0.97 }], opacity: 0.85 },
  // 16+px clearance to the banner zone below, plus an enlarged hit area.
  privacyPressable: {
    marginTop: 14,
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  privacyLink: {
    color: "rgba(20,15,40,0.75)",
    fontSize: 12,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  bannerHolder: {
    backgroundColor: "#000",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10,8,28,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 3,
    borderColor: "#39C5BB",
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1f7e78", textAlign: "center" },
  modalBody: { marginTop: 8, color: "#444", fontSize: 14, textAlign: "center", fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 22 },
  modalBtnGhost: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2,
    borderColor: "#888", alignItems: "center", backgroundColor: "#fff",
  },
  modalGhostTxt: { color: "#666", fontWeight: "800", letterSpacing: 1 },
  modalBtnPrimary: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center",
    backgroundColor: "#39C5BB", borderWidth: 2, borderColor: "#0e4f4a",
  },
  modalPrimaryTxt: { color: "#fff", fontWeight: "900", letterSpacing: 1 },
});
