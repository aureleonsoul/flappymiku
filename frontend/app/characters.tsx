/**
 * Character roster + coin shop.
 * Tap an unlocked character to select; tap a locked one to spend coins.
 */
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { BannerAdView } from "../src/ads/BannerAdView";
import { Toast } from "../src/ads/Toast";
import { Vocaloid } from "../src/game/sprites/Vocaloid";
import {
  attemptUnlock,
  CHARACTERS,
  loadProfile,
  saveSelected,
  type CharacterId,
  type PlayerProfile,
} from "../src/storage/profile";

export default function CharactersScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

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

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
  };

  const onCardPress = async (id: CharacterId) => {
    if (!profile) return;
    if (profile.unlocked.includes(id)) {
      await saveSelected(id);
      setProfile({ ...profile, selected: id });
      return;
    }
    // Try to unlock.
    const def = CHARACTERS.find((c) => c.id === id)!;
    if (profile.coins < def.cost) {
      showToast(`Need ${def.cost - profile.coins} more coin${def.cost - profile.coins === 1 ? "" : "s"}`);
      return;
    }
    const updated = await attemptUnlock(id);
    if (updated) {
      setProfile(updated);
      showToast(`${def.name} unlocked!`);
    }
  };

  return (
    <View style={styles.root} testID="characters-screen">
      <LinearGradient
        colors={["#ffd1e4", "#c7b5ff", "#a8e8ff"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={["top"]}>
        <View style={styles.backRow}>
          <Pressable
            testID="back-button"
            onPress={() => router.replace("/")}
            style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
            hitSlop={10}
          >
            <Text style={styles.backTxt}>‹ BACK</Text>
          </Pressable>
          <View style={styles.coinChip} testID="coin-chip">
            <View style={styles.coinDot} />
            <Text style={styles.coinChipTxt}>{profile?.coins ?? 0}</Text>
          </View>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>CHARACTERS</Text>
          <Text style={styles.subtitle}>Earn 1 coin every 15 score</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {CHARACTERS.map((c) => {
          const unlocked = profile?.unlocked.includes(c.id) ?? false;
          const selected = profile?.selected === c.id;
          const canAfford = (profile?.coins ?? 0) >= c.cost;
          return (
            <Pressable
              key={c.id}
              testID={`char-${c.id}`}
              onPress={() => onCardPress(c.id)}
              style={({ pressed }) => [
                styles.card,
                selected && styles.cardSelected,
                !unlocked && styles.cardLocked,
                pressed && styles.btnPressed,
              ]}
            >
              <View style={styles.spriteBox}>
                <Vocaloid id={c.id} size={96} silhouette={!unlocked} />
              </View>
              <Text style={[styles.cardName, !unlocked && styles.lockedTxt]}>
                {unlocked ? c.name : "???"}
              </Text>
              {unlocked ? (
                <Text style={[styles.cardStatus, selected && styles.statusSelected]}>
                  {selected ? "SELECTED" : "TAP TO SELECT"}
                </Text>
              ) : (
                <View style={[styles.unlockPill, !canAfford && styles.unlockPillDim]}>
                  <View style={styles.coinDotSm} />
                  <Text style={styles.unlockTxt}>{c.cost}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Toast message={toastMsg} visible={toastVisible} onHide={() => setToastVisible(false)} />

      <SafeAreaView edges={["bottom"]} style={styles.bannerHolder}>
        <BannerAdView testID="banner-characters" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a14" },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backTxt: { color: "#1f7e78", fontWeight: "900", fontSize: 16, letterSpacing: 2 },
  coinChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: "#c79a00",
    gap: 6,
  },
  coinChipTxt: { color: "#7a5a00", fontWeight: "900", fontSize: 16, letterSpacing: 1 },
  coinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFD23F",
    borderWidth: 1.5,
    borderColor: "#c79a00",
  },
  coinDotSm: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFD23F",
    borderWidth: 1,
    borderColor: "#c79a00",
  },
  titleRow: { alignItems: "center", marginTop: 4 },
  title: { color: "#1f7e78", fontWeight: "900", fontSize: 24, letterSpacing: 3 },
  subtitle: { color: "rgba(20,15,40,0.65)", fontWeight: "700", marginTop: 2, fontSize: 12 },
  grid: {
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(31,126,120,0.25)",
  },
  cardSelected: { borderColor: "#ff6f9c", borderWidth: 3, backgroundColor: "#ffffff" },
  cardLocked: { opacity: 0.92 },
  spriteBox: { width: 110, height: 110, alignItems: "center", justifyContent: "center" },
  cardName: { color: "#1f7e78", fontWeight: "900", fontSize: 14, marginTop: 4 },
  cardStatus: { color: "#666", fontSize: 11, fontWeight: "800", marginTop: 4, letterSpacing: 1 },
  statusSelected: { color: "#ff6f9c" },
  lockedTxt: { color: "#444" },
  unlockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#39C5BB",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#0e4f4a",
  },
  unlockPillDim: { backgroundColor: "#999", borderColor: "#666" },
  unlockTxt: { color: "#fff", fontWeight: "900", fontSize: 13, letterSpacing: 1 },
  btnPressed: { transform: [{ scale: 0.97 }], opacity: 0.88 },
  bannerHolder: { backgroundColor: "#000" },
});
