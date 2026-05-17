import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { BannerAdView } from "../src/ads/BannerAdView";
import { Vocaloid } from "../src/game/sprites/Vocaloid";
import {
  CHARACTERS,
  loadProfile,
  saveSelected,
  type CharacterId,
  type PlayerProfile,
} from "../src/storage/profile";

export default function CharactersScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

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

  const choose = async (id: CharacterId) => {
    if (!profile) return;
    if (!profile.unlocked.includes(id)) return;
    await saveSelected(id);
    setProfile({ ...profile, selected: id });
  };

  return (
    <View style={styles.root} testID="characters-screen">
      <LinearGradient
        colors={["#ffd1e4", "#c7b5ff", "#a8e8ff"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={["top"]} style={styles.headerWrap}>
        <Pressable
          testID="back-button"
          onPress={() => router.replace("/")}
          style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
        >
          <Text style={styles.backTxt}>‹ BACK</Text>
        </Pressable>
        <Text style={styles.title}>CHARACTERS</Text>
        <Text style={styles.best}>Best: {profile?.best ?? 0}</Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.grid}>
        {CHARACTERS.map((c) => {
          const unlocked = profile?.unlocked.includes(c.id) ?? false;
          const selected = profile?.selected === c.id;
          return (
            <Pressable
              key={c.id}
              testID={`char-${c.id}`}
              onPress={() => choose(c.id)}
              disabled={!unlocked}
              style={({ pressed }) => [
                styles.card,
                selected && styles.cardSelected,
                !unlocked && styles.cardLocked,
                pressed && unlocked && styles.btnPressed,
              ]}
            >
              <View style={styles.spriteBox}>
                <Vocaloid id={c.id} size={96} silhouette={!unlocked} />
              </View>
              <Text style={[styles.cardName, !unlocked && styles.lockedTxt]}>
                {unlocked ? c.name : "???"}
              </Text>
              {unlocked ? (
                <Text style={styles.cardStatus}>
                  {selected ? "SELECTED" : "TAP TO SELECT"}
                </Text>
              ) : (
                <Text style={styles.lockedReq}>Reach score {c.unlockScore}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.bannerHolder}>
        <BannerAdView testID="banner-characters" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a14" },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 8, alignItems: "center" },
  backBtn: { position: "absolute", left: 14, top: 12 },
  backTxt: { color: "#1f7e78", fontWeight: "900", fontSize: 16, letterSpacing: 2 },
  title: { color: "#1f7e78", fontWeight: "900", fontSize: 26, letterSpacing: 3, marginTop: 6 },
  best: { color: "#ffffff", fontWeight: "700", letterSpacing: 1, marginTop: 4 },
  grid: { padding: 12, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
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
  cardLocked: { opacity: 0.85 },
  spriteBox: { width: 110, height: 110, alignItems: "center", justifyContent: "center" },
  cardName: { color: "#1f7e78", fontWeight: "900", fontSize: 14, marginTop: 4 },
  cardStatus: { color: "#666", fontSize: 11, fontWeight: "800", marginTop: 4, letterSpacing: 1 },
  lockedTxt: { color: "#444" },
  lockedReq: { color: "#888", fontSize: 11, fontWeight: "700", marginTop: 4, letterSpacing: 1 },
  btnPressed: { transform: [{ scale: 0.97 }], opacity: 0.88 },
  bannerHolder: { backgroundColor: "#000" },
});
