/**
 * Game screen.
 * Sets up the react-native-game-engine loop with our systems, handles
 * keyboard/tap input, persists best score, runs the rewarded-ad revive flow,
 * triggers an interstitial every 3rd game over, and shows the banner ad on
 * every state (menu/play/game-over) of this screen.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { GameEngine } from "react-native-game-engine";
import { BannerAdView } from "../src/ads/BannerAdView";
import { InterstitialManager } from "../src/ads/InterstitialManager";
import { RewardedManager } from "../src/ads/RewardedManager";
import { Toast } from "../src/ads/Toast";
import { GAME } from "../src/game/constants";
import {
  collisionSystem,
  createInitialEntities,
  inputSystem,
  physicsSystem,
  resetWorld,
  reviveWorld,
  scoreSystem,
  spawnSystem,
  type Entities,
} from "../src/game/engine";
import { WorldRenderer } from "../src/game/WorldRenderer";
import { audioManager } from "../src/audio/AudioManager";
import { stageForScore } from "../src/game/constants";
import { lightTap, mediumTap, heavyTap } from "../src/game/haptics";
import {
  awardCoinsFromScore,
  coinsFromScore,
  loadProfile,
  saveBest,
  type CharacterId,
} from "../src/storage/profile";

let gameOverCounter = 0; // module-level so it survives unmount

export default function GameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const win = Dimensions.get("window");
  const fieldHeight = Math.max(360, win.height - 50 - insets.top - insets.bottom);
  const fieldWidth = win.width;

  const [characterId, setCharacterId] = useState<CharacterId>("miku");
  const [best, setBest] = useState(0);
  const [score, setScore] = useState(0);
  const [overScore, setOverScore] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [isOver, setIsOver] = useState(false);
  const [reviveUsed, setReviveUsed] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [muted, setMuted] = useState(audioManager.isMuted());
  const lastStageRef = useRef(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engineRef = useRef<any>(null);
  const entitiesRef = useRef<Entities>(createInitialEntities(fieldWidth, fieldHeight));
  // remount key forces the engine to re-create entities on a fresh run
  const [runKey, setRunKey] = useState(0);

  // Pull selected character + best from storage on mount.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const p = await loadProfile();
      if (!mounted) return;
      setCharacterId(p.selected);
      setBest(p.best);
    })();
    void audioManager.init().then(() => {
      audioManager.startMusic(1);
    });
    setMuted(audioManager.isMuted());
    lastStageRef.current = 1;
    return () => {
      mounted = false;
      audioManager.stopMusic();
    };
  }, []);

  // Keyboard support (web preview + bluetooth keyboards).
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.key === " ") {
        e.preventDefault();
        engineRef.current?.dispatch({ type: "flap" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Reset entities when the focused screen mounts and start fresh.
  useFocusEffect(
    React.useCallback(() => {
      entitiesRef.current = createInitialEntities(fieldWidth, fieldHeight);
      setScore(0);
      setIsOver(false);
      setReviveUsed(false);
      setRunKey((k) => k + 1);
    }, [fieldWidth, fieldHeight])
  );

  const systems = useMemo(
    () => [inputSystem, physicsSystem, spawnSystem, scoreSystem, collisionSystem],
    []
  );

  const onEvent = async (e: { type: string; payload?: unknown }) => {
    if (e.type === "flap-sound") {
      playFlap();
      lightTap();
      const stage = stageForScore(entitiesRef.current.world.state.score).stage;
      audioManager.playFlap(stage);
    } else if (e.type === "score") {
      const newScore = e.payload as number;
      setScore(newScore);
      playScore();
      mediumTap();
      audioManager.playScore();
      // Detect stage crossing here too in case the world tick didn't fire.
      const newStage = stageForScore(newScore).stage;
      if (newStage !== lastStageRef.current) {
        lastStageRef.current = newStage;
        audioManager.playStageTransition();
        audioManager.startMusic(newStage);
      }
    } else if (e.type === "stage-change") {
      const newStage = e.payload as number;
      if (newStage !== lastStageRef.current) {
        lastStageRef.current = newStage;
        audioManager.playStageTransition();
        audioManager.startMusic(newStage);
      }
    } else if (e.type === "game-over") {
      const finalScore = e.payload as number;
      setOverScore(finalScore);
      setCoinsEarned(coinsFromScore(finalScore));
      setIsOver(true);
      heavyTap();
      audioManager.playHit();
      audioManager.stopMusic();
      // Persist best + award coins.
      try {
        const p = await loadProfile();
        if (finalScore > p.best) {
          await saveBest(finalScore);
          setBest(finalScore);
        } else {
          setBest(p.best);
        }
        await awardCoinsFromScore(finalScore);
      } catch (err) {
        console.warn("[game] save run failed:", err);
      }
      // Interstitial every 3rd game over.
      gameOverCounter += 1;
      if (gameOverCounter % 3 === 0) {
        InterstitialManager.showIfReady();
      }
    }
  };

  const tryAgain = () => {
    entitiesRef.current = createInitialEntities(fieldWidth, fieldHeight);
    setScore(0);
    setIsOver(false);
    setReviveUsed(false);
    setRunKey((k) => k + 1);
    lastStageRef.current = 1;
    audioManager.startMusic(1);
  };

  const toggleMute = () => {
    const m = audioManager.toggleMuted();
    setMuted(m);
  };

  const goMenu = () => {
    router.replace("/");
  };

  const onRevive = () => {
    RewardedManager.showForRevive(
      () => {
        // Reward earned: bring the player back without leaving the run.
        const state = entitiesRef.current.world.state;
        reviveWorld(entitiesRef.current);
        // Reposition player to a safe Y so we don't immediately collide.
        state.y = state.playableHeight * 0.4;
        state.vy = 0;
        setReviveUsed(true);
        setIsOver(false);
        audioManager.playReviveSuccess();
        audioManager.startMusic(lastStageRef.current);
        // Force the engine to pick up the revived state without remounting.
        engineRef.current?.swap(entitiesRef.current);
      },
      () => {
        setToastMsg("Ad not available, try again later");
        setToastVisible(true);
      }
    );
  };

  const newBest = overScore > 0 && overScore === best;

  return (
    <View style={styles.root} testID="game-screen">
      <SafeAreaView edges={["top"]} style={styles.topInset} />
      <View style={[styles.field, { width: fieldWidth, height: fieldHeight }]}>
        <Pressable
          onPress={() => engineRef.current?.dispatch({ type: "flap" })}
          style={StyleSheet.absoluteFill}
          testID="flap-zone"
        >
          <GameEngine
            key={runKey}
            ref={(r: unknown) => {
              engineRef.current = r;
            }}
            systems={systems}
            entities={entitiesRef.current}
            renderer={(entities: Entities | null) => {
              if (!entities || !entities.world) return null;
              return <WorldRenderer state={entities.world.state} characterId={characterId} />;
            }}
            running={!isOver}
            onEvent={onEvent}
            style={{ width: fieldWidth, height: fieldHeight, backgroundColor: "transparent" }}
          />
        </Pressable>

        {isOver ? (
          <View pointerEvents="box-none" style={[styles.overlay, { width: fieldWidth, height: fieldHeight }]}>
            <View style={styles.overCard} testID="game-over-card">
              <Text style={styles.overTitle}>GAME OVER</Text>
              <View style={styles.scoresRow}>
                <View style={styles.scoreCol}>
                  <Text style={styles.scoreColLbl}>SCORE</Text>
                  <Text style={styles.scoreColVal}>{overScore}</Text>
                </View>
                <View style={styles.scoreCol}>
                  <Text style={styles.scoreColLbl}>BEST</Text>
                  <Text style={[styles.scoreColVal, { color: "#c79a00" }]}>{best}</Text>
                </View>
              </View>
              {newBest ? <Text style={styles.newBest}>NEW BEST!</Text> : null}
              {coinsEarned > 0 ? (
                <Text style={styles.coinsLine} testID="coins-earned">
                  +{coinsEarned} coin{coinsEarned === 1 ? "" : "s"} earned!
                </Text>
              ) : (
                <Text style={styles.coinsHint}>Score 15+ to earn coins</Text>
              )}

              <View style={styles.overActions}>
                {!reviveUsed ? (
                  <Pressable
                    testID="revive-button"
                    onPress={onRevive}
                    style={({ pressed }) => [styles.reviveBtn, pressed && styles.btnPressed]}
                  >
                    <Text style={styles.reviveTxt}>▶  REVIVE!</Text>
                    <Text style={styles.reviveSub}>Watch a short ad</Text>
                  </Pressable>
                ) : null}
                <View style={styles.row}>
                  <Pressable
                    testID="menu-button"
                    onPress={goMenu}
                    style={({ pressed }) => [styles.ghostBtn, pressed && styles.btnPressed]}
                  >
                    <Text style={styles.ghostTxt}>MENU</Text>
                  </Pressable>
                  <Pressable
                    testID="try-again-button"
                    onPress={tryAgain}
                    style={({ pressed }) => [styles.tryAgainBtn, pressed && styles.btnPressed]}
                  >
                    <Text style={styles.tryAgainTxt}>TRY AGAIN</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ) : null}
        <Toast message={toastMsg} visible={toastVisible} onHide={() => setToastVisible(false)} />

        {/* Mute / unmute button — top right of the play area */}
        <View pointerEvents="box-none" style={styles.muteWrap}>
          <Pressable
            testID="mute-button"
            onPress={toggleMute}
            hitSlop={8}
            style={({ pressed }) => [styles.muteBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.muteTxt}>{muted ? "🔇" : "🔊"}</Text>
          </Pressable>
        </View>
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.bannerHolder}>
        <BannerAdView testID="banner-game" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a14" },
  topInset: { backgroundColor: "#ffd1e4" },
  field: { overflow: "hidden", backgroundColor: "#a8e8ff" },
  overlay: {
    position: "absolute",
    left: 0,
    top: 0,
    backgroundColor: "rgba(10,8,28,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  overCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 22,
    borderWidth: 3,
    borderColor: "#39C5BB",
    alignItems: "center",
  },
  overTitle: { color: "#ff6f9c", fontSize: 26, fontWeight: "900", letterSpacing: 2 },
  scoresRow: { flexDirection: "row", marginTop: 14, width: "100%", justifyContent: "space-around" },
  scoreCol: { alignItems: "center" },
  scoreColLbl: { color: "#666", fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  scoreColVal: { color: "#1f7e78", fontSize: 36, fontWeight: "900" },
  newBest: { color: "#ff6f9c", fontWeight: "900", marginTop: 6, letterSpacing: 1 },
  coinsLine: { color: "#c79a00", fontWeight: "900", marginTop: 4, letterSpacing: 1, fontSize: 14 },
  coinsHint: { color: "#888", fontWeight: "700", marginTop: 4, letterSpacing: 1, fontSize: 11 },
  overActions: { width: "100%", marginTop: 16 },
  reviveBtn: {
    backgroundColor: "#ff8a3d",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#a8460e",
    marginBottom: 12,
  },
  reviveTxt: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  reviveSub: { color: "#fff", fontSize: 11, fontWeight: "700", marginTop: 2, opacity: 0.85 },
  row: { flexDirection: "row", gap: 10 },
  ghostBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1f7e78",
    backgroundColor: "#fff",
  },
  ghostTxt: { color: "#1f7e78", fontWeight: "800", letterSpacing: 2 },
  tryAgainBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#39C5BB",
    borderWidth: 2,
    borderColor: "#0e4f4a",
  },
  tryAgainTxt: { color: "#fff", fontWeight: "900", letterSpacing: 2 },
  btnPressed: { transform: [{ scale: 0.97 }], opacity: 0.88 },
  bannerHolder: { backgroundColor: "#000" },
  muteWrap: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  muteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(10,8,28,0.55)",
    borderWidth: 2,
    borderColor: "#39C5BB",
    alignItems: "center",
    justifyContent: "center",
  },
  muteTxt: { fontSize: 18 },
});
